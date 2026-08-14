import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CatalogItem from "@/models/CatalogItem";
import DeliverySlot from "@/models/DeliverySlot";
import Order from "@/models/Order";
import User from "@/models/User";
import { createOrderSchema } from "@/schemas/order.schema";
import { computeOrderTotals, type LigneArticle } from "@/services/pricing";
import { generateOrderNumber } from "@/services/orderNumber";
import { notifierBienvenue } from "@/services/notifications";

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

  // 2. Les créneaux doivent exister, correspondre au bon type et avoir de la place.
  const [creneauCollecte, creneauLivraison] = await Promise.all([
    DeliverySlot.findOne({ _id: data.creneauCollecteId, type: "collecte" }),
    DeliverySlot.findOne({ _id: data.creneauLivraisonId, type: "livraison" }),
  ]);

  if (!creneauCollecte || !creneauLivraison) {
    return NextResponse.json({ error: "Créneau de collecte ou de livraison introuvable." }, { status: 400 });
  }

  for (const [label, creneau] of [
    ["collecte", creneauCollecte] as const,
    ["livraison", creneauLivraison] as const,
  ]) {
    if (creneau.statut === "bloque" || creneau.reserves >= creneau.capaciteMax) {
      return NextResponse.json(
        { error: `Le créneau de ${label} sélectionné n'est plus disponible. Merci d'en choisir un autre.` },
        { status: 409 }
      );
    }
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
  const totaux = computeOrderTotals(lignesTarifees, data.delai);

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
    adresseCollecte: data.adresseCollecte,
    adresseLivraison: data.adresseLivraison,
    creneauCollecte: creneauCollecte._id,
    creneauLivraison: creneauLivraison._id,
    delai: data.delai,
    notesClient: data.notesClient,
    ...totaux,
  });

  // 5. Réservation atomique des créneaux, seulement si toujours de la place.
  for (const creneau of [creneauCollecte, creneauLivraison]) {
    const maj = await DeliverySlot.findOneAndUpdate(
      { _id: creneau._id, reserves: { $lt: creneau.capaciteMax } },
      { $inc: { reserves: 1 } },
      { new: true }
    );
    if (maj && maj.reserves >= maj.capaciteMax) {
      await DeliverySlot.updateOne({ _id: maj._id }, { $set: { statut: "complet" } });
    }
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
