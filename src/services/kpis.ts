import Order from "@/models/Order";
import Payment from "@/models/Payment";

const STATUTS_EN_COURS = ["COLLECTE_PLANIFIEE", "COLLECTEE", "EN_LAVAGE", "EN_REPASSAGE", "PRETE"];
const STATUTS_PAYES = [
  "PAYEE",
  "COLLECTE_PLANIFIEE",
  "COLLECTEE",
  "EN_LAVAGE",
  "EN_REPASSAGE",
  "PRETE",
  "EN_LIVRAISON",
  "LIVREE",
];

// Indicateurs clés du tableau de bord (section 12.1).
export async function getKpis() {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date(debutJour);
  finJour.setDate(finJour.getDate() + 1);
  const depuis30Jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    chiffreAffaires,
    commandesDuJour,
    commandesEnAttente,
    commandesEnCours,
    commandesLivrees,
    livraisonsDuJour,
    collectesDuJour,
    paiementsReussis,
    paiementsEchoues,
    clientsActifs,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { statut: { $in: STATUTS_PAYES } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.countDocuments({ createdAt: { $gte: debutJour, $lt: finJour } }),
    Order.countDocuments({ statut: "EN_ATTENTE_PAIEMENT" }),
    Order.countDocuments({ statut: { $in: STATUTS_EN_COURS } }),
    Order.countDocuments({ statut: "LIVREE" }),
    Order.countDocuments({
      statusHistory: { $elemMatch: { statut: "LIVREE", date: { $gte: debutJour, $lt: finJour } } },
    }),
    Order.countDocuments({
      statusHistory: { $elemMatch: { statut: "COLLECTEE", date: { $gte: debutJour, $lt: finJour } } },
    }),
    Payment.countDocuments({ statut: "reussi" }),
    Payment.countDocuments({ statut: { $in: ["echoue", "expire"] } }),
    Order.distinct("client", { createdAt: { $gte: depuis30Jours } }),
  ]);

  return {
    chiffreAffaires: chiffreAffaires[0]?.total ?? 0,
    commandesDuJour,
    commandesEnAttente,
    commandesEnCours,
    commandesLivrees,
    livraisonsDuJour,
    collectesDuJour,
    paiementsReussis,
    paiementsEchoues,
    clientsActifs: clientsActifs.length,
  };
}
