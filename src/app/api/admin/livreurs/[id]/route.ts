import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import User from "@/models/User";
import Order from "@/models/Order";

const updateSchema = z.object({
  prenom: z.string().trim().min(1).optional(),
  nom: z.string().trim().min(1).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  whatsapp: z.string().trim().min(8).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const { id } = await params;
  const livreur = await User.findOne({ _id: id, role: "livreur" });
  if (!livreur) {
    return NextResponse.json({ error: "Livreur introuvable." }, { status: 404 });
  }

  const ancienneValeur = { nom: livreur.nom, prenom: livreur.prenom, email: livreur.email, whatsapp: livreur.whatsapp };

  Object.assign(livreur, parsed.data);
  if (parsed.data.whatsapp) {
    livreur.telephone = parsed.data.whatsapp;
  }
  await livreur.save();

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "modification_livreur",
    cibleType: "User",
    cibleId: id,
    ancienneValeur,
    nouvelleValeur: parsed.data,
  });

  return NextResponse.json({ ok: true });
}

// Statuts après lesquels une commande n'a plus besoin de coursier actif (section 3 du cahier
// des charges) — la suppression d'un livreur encore affecté à une commande en cours serait
// silencieusement orpheline sinon, cf. le garde-fou équivalent sur DeliverySlot (reserves > 0).
const STATUTS_TERMINAUX = ["LIVREE", "ANNULEE", "REMBOURSEE", "COLLECTE_ECHOUEE"];

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const { id } = await params;

  const commandeActive = await Order.findOne({
    $or: [{ livreurCollecte: id }, { livreurLivraison: id }],
    statut: { $nin: STATUTS_TERMINAUX },
  });
  if (commandeActive) {
    return NextResponse.json(
      { error: "Ce livreur est affecté à une commande en cours — réassignez-la avant de le supprimer." },
      { status: 409 }
    );
  }

  const livreur = await User.findOneAndDelete({ _id: id, role: "livreur" });
  if (!livreur) {
    return NextResponse.json({ error: "Livreur introuvable." }, { status: 404 });
  }

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "suppression_livreur",
    cibleType: "User",
    cibleId: id,
    ancienneValeur: { nom: livreur.nom, prenom: livreur.prenom, email: livreur.email },
  });

  return NextResponse.json({ ok: true });
}
