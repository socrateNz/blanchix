import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CatalogItem from "@/models/CatalogItem";
import DeliverySlot from "@/models/DeliverySlot";
import DeliveryZone from "@/models/DeliveryZone";
import Order from "@/models/Order";
import User from "@/models/User";
import { createOrderSchema } from "@/schemas/order.schema";
import { computeOrderTotals, type LigneArticle } from "@/services/pricing";
import { generateOrderNumber } from "@/services/orderNumber";
import { notifierBienvenue } from "@/services/notifications";
import { getSettings } from "@/services/settings";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  await dbConnect();

  // 1. Le catalogue et son prix sont TOUJOURS relus en base — jamais confiance au client.
  const catalogIds = data.articles.map((a) => a.catalogItemId);
  const catalogDocs = await CatalogItem.find({ _id: { $in: catalogIds }, actif: true });
  const catalogById = new Map(catalogDocs.map((doc) => [String(doc._id), doc]));

  const articlesInvalides = catalogIds.filter((id) => !catalogById.has(id));
  if (articlesInvalides.length > 0) {
    return NextResponse.json(
      { error: `Article(s) indisponible(s) ou désactivé(s) : ${articlesInvalides.join(", ")}` },
      { status: 400 }
    );
  }

  const articlesCommande = data.articles.map((a) => {
    const doc = catalogById.get(a.catalogItemId)!;
    return {
      catalogItemId: doc._id,
      nom: doc.nom,
      prixUnitaire: doc.prixUnitaire,
      quantite: a.quantite,
    };
  });

  // 2. Le créneau doit exister, correspondre au bon type et avoir de la place. Plus de créneau
  // de livraison à valider ici — seule la collecte reste planifiée par créneau.
  const creneauCollecte = await DeliverySlot.findOne({ _id: data.creneauCollecteId, type: "collecte" });

  if (!creneauCollecte) {
    return NextResponse.json({ error: "Créneau de collecte introuvable." }, { status: 400 });
  }

  if (creneauCollecte.statut === "bloque" || creneauCollecte.reserves >= creneauCollecte.capaciteMax) {
    return NextResponse.json(
      { error: "Le créneau de collecte sélectionné n'est plus disponible. Merci d'en choisir un autre." },
      { status: 409 }
    );
  }

  // 2bis. Les deux zones de livraison (collecte + livraison, potentiellement différentes) —
  // jamais confiance au nom/prix envoyé par le client, résolus depuis la zone active en base
  // (même principe que le catalogue à l'étape 1).
  const [zoneCollecte, zoneLivraison] = await Promise.all([
    DeliveryZone.findOne({ _id: data.adresseCollecte.zoneId, actif: true }),
    DeliveryZone.findOne({ _id: data.adresseLivraison.zoneId, actif: true }),
  ]);
  if (!zoneCollecte || !zoneLivraison) {
    return NextResponse.json(
      { error: "Zone de livraison introuvable ou désactivée. Merci de sélectionner une autre zone." },
      { status: 400 }
    );
  }

  // 3. Compte client — créé automatiquement à la première commande (pas d'auth en phase 1).
  const client = await User.findOneAndUpdate(
    { email: data.client.email.toLowerCase() },
    {
      $setOnInsert: {
        nom: data.client.nom,
        telephone: data.client.telephone,
        email: data.client.email.toLowerCase(),
        whatsapp: data.client.whatsapp,
        role: "client",
      },
    },
    { upsert: true, new: true }
  );

  // Compte flambant neuf si créé et mis à jour dans le même instant (upsert) — l'email de
  // bienvenue lui-même reste protégé par compteConfirme.email en cas de doute (section 7.1).
  // Toujours attendu (pas fire-and-forget) pour ne pas risquer que la requête se termine
  // avant l'envoi, mais jamais bloquant pour la création de commande en cas d'échec.
  const clientVientDetreCree = client.createdAt.getTime() === client.updatedAt.getTime();
  if (clientVientDetreCree) {
    try {
      await notifierBienvenue(client);
    } catch (err) {
      console.error("Échec de l'envoi de l'email de bienvenue :", err);
    }
  }

  // 4. Calcul des montants — source unique de vérité côté serveur.
  const lignesTarifees: LigneArticle[] = articlesCommande.map((a) => ({
    prixUnitaire: a.prixUnitaire,
    quantite: a.quantite,
  }));
  const settings = await getSettings();
  const totaux = computeOrderTotals(lignesTarifees, data.delai, zoneLivraison.prix, {
    active: settings.livraisonGratuiteActive,
    seuil: settings.livraisonGratuiteSeuil,
  });

  if (totaux.sousTotal < settings.commandeMinimale) {
    return NextResponse.json(
      { error: `Montant minimum de commande non atteint (${settings.commandeMinimale} FCFA).` },
      { status: 400 }
    );
  }

  const numero = await generateOrderNumber();
  const maintenant = new Date();

  const order = await Order.create({
    numero,
    client: client._id,
    statut: "EN_ATTENTE_PAIEMENT",
    statusHistory: [
      { statut: "BROUILLON", date: maintenant },
      { statut: "EN_ATTENTE_PAIEMENT", date: maintenant },
    ],
    articles: articlesCommande,
    articlesPersonnalises: data.articlesPersonnalises.map((a) => ({
      nom: a.nom,
      quantiteEstimee: a.quantiteEstimee,
      description: a.description,
    })),
    adresseCollecte: {
      zone: zoneCollecte._id,
      zoneNom: zoneCollecte.nom,
      zonePrix: zoneCollecte.prix,
      lieuDit: data.adresseCollecte.lieuDit,
      gps: data.adresseCollecte.gps,
      instructions: data.adresseCollecte.instructions,
    },
    adresseLivraison: {
      zone: zoneLivraison._id,
      zoneNom: zoneLivraison.nom,
      zonePrix: zoneLivraison.prix,
      lieuDit: data.adresseLivraison.lieuDit,
      gps: data.adresseLivraison.gps,
      instructions: data.adresseLivraison.instructions,
    },
    creneauCollecte: creneauCollecte._id,
    delai: data.delai,
    notesClient: data.notesClient,
    ...totaux,
  });

  // 5. Réservation atomique du créneau, seulement si toujours de la place.
  const creneauMaj = await DeliverySlot.findOneAndUpdate(
    { _id: creneauCollecte._id, reserves: { $lt: creneauCollecte.capaciteMax } },
    { $inc: { reserves: 1 } },
    { new: true }
  );
  if (creneauMaj && creneauMaj.reserves >= creneauMaj.capaciteMax) {
    await DeliverySlot.updateOne({ _id: creneauMaj._id }, { $set: { statut: "complet" } });
  }

  return NextResponse.json(
    {
      numero: order.numero,
      id: String(order._id),
      statut: order.statut,
      ...totaux,
    },
    { status: 201 }
  );
}
