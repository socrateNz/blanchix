import { dbConnect } from "../src/lib/mongodb";
import CatalogItem from "../src/models/CatalogItem";
import DeliverySlot from "../src/models/DeliverySlot";
import DeliveryZone from "../src/models/DeliveryZone";
import Order from "../src/models/Order";
import User from "../src/models/User";
import { computeOrderTotals } from "../src/services/pricing";
import { generateOrderNumber } from "../src/services/orderNumber";
import { getSettings } from "../src/services/settings";

async function main() {
  await dbConnect();

  const zoneCollecte = await DeliveryZone.findById("6a9aa6d04e845db16f6c0df6");
  const zoneLivraison = await DeliveryZone.findById("6a9aa6d14e845db16f6c0df8");
  const catalogItem = await CatalogItem.findById("6a7c943838d1e45bb0892b9c");
  const creneauCollecte = await DeliverySlot.findById("6a992e8aeae9607ef7d24efa");
  const client = await User.findOne({ email: "snzogning0@gmail.com" });

  if (!zoneCollecte || !zoneLivraison || !catalogItem || !creneauCollecte || !client) {
    console.error("Prérequis manquants", {
      zoneCollecte: !!zoneCollecte,
      zoneLivraison: !!zoneLivraison,
      catalogItem: !!catalogItem,
      creneauCollecte: !!creneauCollecte,
      client: !!client,
    });
    process.exit(1);
  }

  const articlesCommande = [
    { catalogItemId: catalogItem._id, nom: catalogItem.nom, prixUnitaire: catalogItem.prixUnitaire, quantite: 2 },
  ];
  const lignesTarifees = articlesCommande.map((a) => ({ prixUnitaire: a.prixUnitaire, quantite: a.quantite }));
  const settings = await getSettings();
  const totaux = computeOrderTotals(lignesTarifees, "standard", zoneLivraison.prix, {
    active: settings.livraisonGratuiteActive,
    seuil: settings.livraisonGratuiteSeuil,
  });

  const numero = await generateOrderNumber();
  const maintenant = new Date();

  try {
    const order = await Order.create({
      numero,
      client: client._id,
      statut: "EN_ATTENTE_PAIEMENT",
      statusHistory: [
        { statut: "BROUILLON", date: maintenant },
        { statut: "EN_ATTENTE_PAIEMENT", date: maintenant },
      ],
      articles: articlesCommande,
      articlesPersonnalises: [],
      adresseCollecte: {
        zone: zoneCollecte._id,
        zoneNom: zoneCollecte.nom,
        zonePrix: zoneCollecte.prix,
        lieuDit: "Non loin du carrefour test",
        gps: undefined,
        instructions: undefined,
      },
      adresseLivraison: {
        zone: zoneLivraison._id,
        zoneNom: zoneLivraison.nom,
        zonePrix: zoneLivraison.prix,
        lieuDit: "Immeuble bleu, 2e etage",
        gps: undefined,
        instructions: undefined,
      },
      creneauCollecte: creneauCollecte._id,
      delai: "standard",
      notesClient: undefined,
      ...totaux,
    });
    console.log("OK, commande créée:", order._id.toString(), totaux);
  } catch (err) {
    console.error("ERREUR REPRODUITE:", err);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
