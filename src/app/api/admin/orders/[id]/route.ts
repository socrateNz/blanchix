import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import { appliquerTransitionCommande, TransitionInvalideError } from "@/services/orderTransitions";
import { notifierChangementStatut } from "@/services/notifications";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
// Cf. src/app/api/mes-commandes/[id]/route.ts : nécessaire pour les .populate("creneau...")
// plus bas, même si le modèle n'est pas utilisé directement dans ce fichier.
import "@/models/DeliverySlot";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const { id } = await params;

  const order = await Order.findById(id)
    .populate("client", "nom telephone email")
    .populate("creneauCollecte")
    .populate("creneauLivraison")
    .populate("livreurCollecte", "nom prenom whatsapp")
    .populate("livreurLivraison", "nom prenom whatsapp")
    .lean();

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const paiements = await Payment.find({ order: id }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    ...order,
    id: String(order._id),
    paiements: paiements.map((p) => ({
      id: String(p._id),
      methode: p.methode,
      montant: p.montant,
      statut: p.statut,
      referenceExterne: p.referenceExterne,
      tentatives: p.tentatives,
      createdAt: p.createdAt,
    })),
  });
}

const bodySchema = z.object({
  action: z.enum(["etape_suivante", "annuler", "rembourser", "marquer_paye"]),
  commentaire: z.string().trim().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const { id } = await params;
  const order = await Order.findById(id);
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const statutAvant = order.statut;
  const paiementStatutAvant = order.paiement?.statut ?? null;
  let nouveauStatut;
  try {
    nouveauStatut = await appliquerTransitionCommande(order, parsed.data.action, user!.id, parsed.data.commentaire);
  } catch (err) {
    if (err instanceof TransitionInvalideError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  // "rembourser"/"marquer_paye" ne touchent que le sous-document paiement (cf.
  // orderTransitions.ts) — l'audit doit refléter ce qui a réellement changé plutôt que de
  // toujours parler de "statut" (order.statut est resté identique dans ces deux cas).
  const toucheSeulementPaiement = parsed.data.action === "rembourser" || parsed.data.action === "marquer_paye";

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: toucheSeulementPaiement ? `paiement_${parsed.data.action}` : "changement_statut",
    cibleType: "Order",
    cibleId: id,
    ancienneValeur: toucheSeulementPaiement ? { paiementStatut: paiementStatutAvant } : { statut: statutAvant },
    nouvelleValeur: toucheSeulementPaiement
      ? { paiementStatut: order.paiement?.statut ?? null }
      : { statut: nouveauStatut },
  });

  try {
    await notifierChangementStatut(order, nouveauStatut);
  } catch (err) {
    console.error("Échec de l'envoi de l'email de changement de statut :", err);
  }

  return NextResponse.json({ statut: nouveauStatut });
}
