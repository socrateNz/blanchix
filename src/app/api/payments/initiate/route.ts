import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { creerCodeesCheckout } from "@/lib/codees";
import { notifierCommandeConfirmee } from "@/services/notifications";

const bodySchema = z.object({
  orderId: z.string().min(1),
  moyen: z.enum(["mobile_money", "espece"]),
});

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

  // Toujours créer une NOUVELLE session Codees plutôt que de réutiliser l'URL d'une tentative
  // en cours (comme on le faisait pour MoneyFusion, section 6.4) : revisiter une URL de
  // checkout déjà chargée une première fois (ex. clic "Payer" → retour arrière → reclic) a
  // provoqué en pratique un "CSRF token missing" côté Codees — probablement un jeton CSRF lié
  // à ce premier chargement, invalidé après la première tentative et resservi tel quel par le
  // cache du navigateur sur la même URL. Créer un nouveau checkout à chaque fois élimine ce
  // risque ; ça ne casse aucune idempotence réelle côté nous, puisque rien n'est jamais débité
  // tant que le client n'a pas activement validé un paiement sur une session Codees précise.
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

  // request.nextUrl.origin reflète l'adresse d'écoute interne du serveur (0.0.0.0:3000 en
  // conteneur Docker derrière un reverse proxy), pas l'adresse publique réelle — même avec
  // Nginx qui transmet correctement le header Host. NEXTAUTH_URL est la source fiable, déjà
  // configurée avec la vraie adresse publique pour cet environnement.
  const retourUrl = `${process.env.NEXTAUTH_URL}/commander/paiement`;
  let reponse;
  try {
    reponse = await creerCodeesCheckout({
      amount: String(order.total),
      currency: "XAF",
      reference: order.numero,
      customer_name: client.nom,
      customer_email: client.email,
      success_url: retourUrl,
      cancel_url: retourUrl,
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

  payment.statut = "en_attente";
  payment.referenceExterne = reponse.checkout_id;
  payment.logsBruts.push({ source: "initiation", url: reponse.checkout_url, reponse, date: new Date() });
  await payment.save();

  order.paiement = {
    methode: moyen,
    statut: "en_attente",
    referenceExterne: reponse.checkout_id,
    montant: order.total,
    dateMaj: new Date(),
  };
  await order.save();

  return NextResponse.json({ url: reponse.checkout_url, token: reponse.checkout_id });
}
