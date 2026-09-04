import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import { notifierAssignationLivreur } from "@/services/notifications";
import { construireLienWhatsapp } from "@/lib/whatsapp";
import { formatZoneAdresse } from "@/lib/adresse";
import Order from "@/models/Order";
import User from "@/models/User";
// Cf. src/app/api/mes-commandes/[id]/route.ts : nécessaire pour le .populate("creneau...")
// plus bas, même si le modèle n'est pas utilisé directement dans ce fichier.
import "@/models/DeliverySlot";

const bodySchema = z.object({
  type: z.enum(["collecte", "livraison"]),
  livreurId: z.string().min(1),
});

/**
 * Assigne un livreur à la collecte ou à la livraison d'une commande : enregistre l'affectation
 * sur la commande, envoie un email au livreur, et renvoie un lien wa.me prérempli que le client
 * (navigateur admin) ouvre immédiatement après — ouvrir WhatsApp est une action côté client,
 * le serveur ne peut que fournir le lien.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, livreurId } = parsed.data;

  await dbConnect();
  const { id } = await params;

  const order = await Order.findById(id).populate(type === "collecte" ? "creneauCollecte" : "creneauLivraison");
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const livreur = await User.findOne({ _id: livreurId, role: "livreur" });
  if (!livreur) {
    return NextResponse.json({ error: "Livreur introuvable." }, { status: 404 });
  }

  const champ = type === "collecte" ? "livreurCollecte" : "livreurLivraison";
  const ancienLivreurId = order[champ] ? String(order[champ]) : null;
  order[champ] = livreur._id;
  await order.save();

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: `assignation_livreur_${type}`,
    cibleType: "Order",
    cibleId: id,
    ancienneValeur: { [champ]: ancienLivreurId },
    nouvelleValeur: { [champ]: livreurId },
  });

  try {
    await notifierAssignationLivreur(order, livreur, type);
  } catch (err) {
    console.error("Échec de l'envoi de l'email d'assignation au livreur :", err);
  }

  const adresse = type === "collecte" ? order.adresseCollecte : order.adresseLivraison;
  const creneau = type === "collecte" ? order.creneauCollecte : order.creneauLivraison;
  const creneauTexte =
    creneau && "date" in creneau
      ? ` Créneau : ${new Date(creneau.date).toLocaleDateString("fr-FR")} ${creneau.plageHoraire}.`
      : "";
  const message = `Bonjour ${livreur.prenom ?? ""} ${livreur.nom}, la commande ${order.numero} vous est assignée pour la ${type === "collecte" ? "collecte" : "livraison"}. Adresse : ${formatZoneAdresse(adresse)}.${creneauTexte}`;

  return NextResponse.json({
    ok: true,
    livreur: { nom: livreur.nom, prenom: livreur.prenom ?? "", whatsapp: livreur.whatsapp },
    lienWhatsapp: construireLienWhatsapp(livreur.whatsapp ?? livreur.telephone, message),
  });
}
