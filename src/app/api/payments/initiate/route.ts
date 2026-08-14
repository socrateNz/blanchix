import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { initiateMoneyFusionPayment } from "@/lib/moneyfusion";
import { notifierCommandeConfirmee } from "@/services/notifications";

const bodySchema = z.object({
  orderId: z.string().min(1),
  moyen: z.enum(["orange_money", "mtn_momo", "espece"]),
});

// Fenêtre au-delà de laquelle une tentative "en_attente" n'est plus réutilisée (section 6.4).
const PAIEMENT_EXPIRATION_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { orderId, moyen } = parsed.data;

  await dbConnect();

  const order = await Order.findById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  if (order.statut === "PAIEMENT_ECHOUE") {
    // Nouvelle tentative sur une commande déjà créée — transition réversible (section 3.2).
    order.statut = "EN_ATTENTE_PAIEMENT";
    order.statusHistory.push({ statut: "EN_ATTENTE_PAIEMENT", date: new Date() });
    await order.save();
  } else if (order.statut !== "EN_ATTENTE_PAIEMENT") {
    return NextResponse.json(
      { error: "Cette commande n'est plus en attente de paiement." },
      { status: 409 }
    );
  }

  // Paiement en espèces — encaissé physiquement à la collecte, donc rien à initier auprès
  // d'un prestataire ni à attendre de manière asynchrone : on fait avancer la commande tout
  // de suite (sur demande explicite du client, la commande n'est jamais bloquée par ce choix).
  // Un deuxième appel échoue naturellement sur la garde ci-dessus (la commande n'est plus
  // EN_ATTENTE_PAIEMENT après le premier), donc pas besoin d'idempotence supplémentaire ici.
  if (moyen === "espece") {
    const maintenant = new Date();
    order.statut = "COLLECTE_PLANIFIEE";
    order.statusHistory.push(
      { statut: "PAYEE", date: maintenant },
      { statut: "COLLECTE_PLANIFIEE", date: maintenant }
    );
    order.paiement = {
      methode: "espece",
      statut: "a_percevoir",
      referenceExterne: null,
      montant: order.total,
      dateMaj: maintenant,
    };
    await order.save();

    try {
      await notifierCommandeConfirmee(order);
    } catch (err) {
      console.error("Échec de l'envoi de la confirmation de commande :", err);
    }

    return NextResponse.json({ url: null });
  }

  // Double-clic / double initiation : on réutilise la tentative en cours plutôt que d'en
  // créer une seconde (section 6.4 — "le backend refuse toute seconde initiation").
  const tentativeExistante = await Payment.findOne({ order: order._id, statut: "en_attente" }).sort({
    createdAt: -1,
  });
  if (tentativeExistante) {
    const creeLe = tentativeExistante.get("createdAt") as Date;
    const dernierLog = tentativeExistante.logsBruts.at(-1) as { url?: string } | undefined;
    if (Date.now() - creeLe.getTime() < PAIEMENT_EXPIRATION_MS && dernierLog?.url) {
      return NextResponse.json({ url: dernierLog.url, token: tentativeExistante.referenceExterne });
    }
  }

  const client = await User.findById(order.client);
  if (!client) {
    return NextResponse.json({ error: "Client introuvable pour cette commande." }, { status: 404 });
  }

  const idempotencyKey = randomUUID();
  const payment = await Payment.create({
    order: order._id,
    methode: moyen,
    montant: order.total,
    devise: "XAF",
    statut: "initie",
    idempotencyKey,
    tentatives: 1,
  });

  const origin = request.nextUrl.origin;
  let reponse;
  try {
    reponse = await initiateMoneyFusionPayment({
      // Le montant vient exclusivement de la commande enregistrée en base (déjà calculée
      // côté serveur à la création) — jamais d'un montant transmis par le client (section 6.6).
      totalPrice: order.total,
      article: order.articles.map((a: { nom: string; prixUnitaire: number; quantite: number }) => ({
        [a.nom]: a.prixUnitaire * a.quantite,
      })),
      personal_Info: [{ orderId: String(order._id), paymentId: String(payment._id) }],
      numeroSend: client.telephone,
      nomclient: client.nom,
      return_url: `${origin}/commander/paiement`,
      webhook_url: `${origin}/api/payments/webhook`,
    });
  } catch (err) {
    payment.statut = "echoue";
    payment.logsBruts.push({ source: "initiation_erreur", message: String(err), date: new Date() });
    await payment.save();
    return NextResponse.json(
      { error: "Impossible de contacter le prestataire de paiement. Merci de réessayer." },
      { status: 502 }
    );
  }

  if (!reponse.statut || !reponse.url) {
    payment.statut = "echoue";
    payment.logsBruts.push({ source: "initiation_refusee", reponse, date: new Date() });
    await payment.save();
    return NextResponse.json(
      { error: reponse.message || "Le paiement n'a pas pu être initié." },
      { status: 502 }
    );
  }

  payment.statut = "en_attente";
  payment.referenceExterne = reponse.token;
  payment.logsBruts.push({ source: "initiation", url: reponse.url, reponse, date: new Date() });
  await payment.save();

  order.paiement = {
    methode: moyen,
    statut: "en_attente",
    referenceExterne: reponse.token,
    montant: order.total,
    dateMaj: new Date(),
  };
  await order.save();

  return NextResponse.json({ url: reponse.url, token: reponse.token });
}
