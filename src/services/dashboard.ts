import Order from "@/models/Order";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { STATUTS_PAYES } from "@/services/kpis";

// Le Cameroun est à UTC+1 toute l'année (pas d'heure d'été) : bornes de jour/mois calculées sur
// ce décalage fixe plutôt que sur le fuseau du processus Node, qui peut différer (PC de dev, CI).
const FUSEAU = "Africa/Douala";
const DECALAGE_MS = 60 * 60 * 1000;
const JOUR_MS = 24 * 60 * 60 * 1000;

function partiesDouala(date: Date) {
  const t = new Date(date.getTime() + DECALAGE_MS);
  return { annee: t.getUTCFullYear(), mois: t.getUTCMonth(), jour: t.getUTCDate() };
}

function debutDouala(annee: number, mois: number, jour: number) {
  return new Date(Date.UTC(annee, mois, jour) - DECALAGE_MS);
}

function cleJour(date: Date) {
  const { annee, mois, jour } = partiesDouala(date);
  return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

// Commandes "confirmées" (payées, ou espèces confirmées) : base du chiffre d'affaires, même
// définition que le KPI historique (src/services/kpis.ts).
const confirmee = { statut: { $in: STATUTS_PAYES } };

async function totauxPeriode(debut: Date, fin: Date) {
  const [r] = await Order.aggregate<{ ca: number; commandes: number }>([
    { $match: { ...confirmee, createdAt: { $gte: debut, $lt: fin } } },
    { $group: { _id: null, ca: { $sum: "$total" }, commandes: { $sum: 1 } } },
  ]);
  const ca = r?.ca ?? 0;
  const commandes = r?.commandes ?? 0;
  return { ca, commandes, panierMoyen: commandes ? Math.round(ca / commandes) : 0 };
}

type CommandeCourte = { id: string; numero: string };

async function aTraiter(filtre: Record<string, unknown>) {
  const [nombre, exemples] = await Promise.all([
    Order.countDocuments(filtre),
    Order.find(filtre).sort({ createdAt: 1 }).limit(3).select("numero").lean(),
  ]);
  return {
    nombre,
    // Les plus anciennes d'abord : ce sont celles qui attendent depuis le plus longtemps.
    exemples: exemples.map((o) => ({ id: String(o._id), numero: o.numero })) as CommandeCourte[],
  };
}

/** Données du tableau de bord admin (section 12.1), toutes calculées à la demande. */
export async function getDashboard() {
  const maintenant = new Date();
  const { annee, mois, jour } = partiesDouala(maintenant);
  const debutJour = debutDouala(annee, mois, jour);
  const finJour = new Date(debutJour.getTime() + JOUR_MS);
  const debutMois = debutDouala(annee, mois, 1);
  // Comparaison à durée égale : du 1er du mois précédent jusqu'au même moment du mois.
  const debutMoisPrec = debutDouala(annee, mois - 1, 1);
  const finMoisPrec = new Date(Math.min(debutMois.getTime(), debutMoisPrec.getTime() + (maintenant.getTime() - debutMois.getTime())));
  const debut30j = debutDouala(annee, mois, jour - 29);
  const ilYaUneHeure = new Date(maintenant.getTime() - DECALAGE_MS);

  const recent = { ...confirmee, createdAt: { $gte: debut30j } };

  const [
    moisCourant,
    moisPrecedent,
    nouveauxClients,
    nouveauxClientsPrec,
    clientsActifs,
    commandesDuJour,
    collectesDuJour,
    livraisonsDuJour,
    parJour,
    paiementsEnLigne,
    especes,
    paiementsEnAttente,
    collectesSansLivreur,
    livraisonsSansLivreur,
    prixAProposer,
    incidents,
    topArticles,
    parZone,
    parDelai,
    parMoyen,
    dernieres,
  ] = await Promise.all([
    totauxPeriode(debutMois, finJour),
    totauxPeriode(debutMoisPrec, finMoisPrec),
    User.countDocuments({ role: "client", createdAt: { $gte: debutMois } }),
    User.countDocuments({ role: "client", createdAt: { $gte: debutMoisPrec, $lt: finMoisPrec } }),
    Order.distinct("client", { createdAt: { $gte: debut30j } }),
    Order.countDocuments({ createdAt: { $gte: debutJour, $lt: finJour } }),
    Order.countDocuments({ statusHistory: { $elemMatch: { statut: "COLLECTEE", date: { $gte: debutJour, $lt: finJour } } } }),
    Order.countDocuments({ statusHistory: { $elemMatch: { statut: "LIVREE", date: { $gte: debutJour, $lt: finJour } } } }),
    Order.aggregate<{ _id: string; ca: number; commandes: number }>([
      { $match: recent },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: FUSEAU } },
          ca: { $sum: "$total" },
          commandes: { $sum: 1 },
        },
      },
    ]),
    Payment.aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: debut30j }, statut: { $in: ["reussi", "echoue", "expire"] } } },
      { $group: { _id: "$statut", n: { $sum: 1 } } },
    ]),
    Order.aggregate<{ montant: number; commandes: number }>([
      { $match: { "paiement.methode": "espece", "paiement.statut": "a_percevoir", statut: { $nin: ["ANNULEE", "REMBOURSEE"] } } },
      { $group: { _id: null, montant: { $sum: "$total" }, commandes: { $sum: 1 } } },
    ]),
    aTraiter({ statut: "EN_ATTENTE_PAIEMENT", createdAt: { $lt: ilYaUneHeure } }),
    aTraiter({ statut: "COLLECTE_PLANIFIEE", livreurCollecte: null }),
    aTraiter({ statut: { $in: ["PRETE", "EN_LIVRAISON"] }, livreurLivraison: null }),
    aTraiter({
      "articlesPersonnalises.statut": "en_attente_prix",
      statut: { $nin: ["ANNULEE", "REMBOURSEE", "LIVREE", "PAIEMENT_ECHOUE"] },
    }),
    aTraiter({ statut: { $in: ["INCIDENT", "COLLECTE_ECHOUEE"] } }),
    Order.aggregate<{ _id: string; quantite: number; ca: number }>([
      { $match: recent },
      { $unwind: "$articles" },
      {
        $group: {
          _id: "$articles.nom",
          quantite: { $sum: "$articles.quantite" },
          ca: { $sum: { $multiply: ["$articles.quantite", "$articles.prixUnitaire"] } },
        },
      },
      { $sort: { quantite: -1 } },
      { $limit: 6 },
    ]),
    Order.aggregate<{ _id: string; commandes: number; ca: number }>([
      { $match: recent },
      { $group: { _id: "$adresseCollecte.zoneNom", commandes: { $sum: 1 }, ca: { $sum: "$total" } } },
      { $sort: { commandes: -1 } },
    ]),
    Order.aggregate<{ _id: string; commandes: number }>([
      { $match: recent },
      { $group: { _id: "$delai", commandes: { $sum: 1 } } },
    ]),
    Order.aggregate<{ _id: string | null; commandes: number }>([
      { $match: recent },
      { $group: { _id: "$paiement.methode", commandes: { $sum: 1 } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(8).populate("client", "nom").select("numero statut total createdAt client paiement").lean(),
  ]);

  // Série continue sur 30 jours : les jours sans commande valent 0 (pas de trou dans le graphique).
  const indexJours = new Map(parJour.map((j) => [j._id, j]));
  const serie = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(debut30j.getTime() + i * JOUR_MS);
    const cle = cleJour(date);
    const j = indexJours.get(cle);
    return { date: cle, ca: j?.ca ?? 0, commandes: j?.commandes ?? 0 };
  });

  const enLigne = Object.fromEntries(paiementsEnLigne.map((p) => [p._id, p.n]));
  const tentativesTerminees = (enLigne.reussi ?? 0) + (enLigne.echoue ?? 0) + (enLigne.expire ?? 0);

  return {
    mois: { courant: moisCourant, precedent: moisPrecedent },
    nouveauxClients: { courant: nouveauxClients, precedent: nouveauxClientsPrec },
    clientsActifs30j: clientsActifs.length,
    aujourdhui: { commandes: commandesDuJour, collectes: collectesDuJour, livraisons: livraisonsDuJour },
    serie30j: serie,
    paiementsEnLigne30j: {
      reussis: enLigne.reussi ?? 0,
      tentatives: tentativesTerminees,
      taux: tentativesTerminees ? Math.round(((enLigne.reussi ?? 0) / tentativesTerminees) * 100) : null,
    },
    especesAPercevoir: { montant: especes[0]?.montant ?? 0, commandes: especes[0]?.commandes ?? 0 },
    aTraiter: { paiementsEnAttente, collectesSansLivreur, livraisonsSansLivreur, prixAProposer, incidents },
    topArticles30j: topArticles.map((a) => ({ nom: a._id, quantite: a.quantite, ca: a.ca })),
    parZone30j: parZone.map((z) => ({ nom: z._id ?? "—", commandes: z.commandes, ca: z.ca })),
    parDelai30j: parDelai.map((d) => ({ delai: d._id, commandes: d.commandes })),
    parMoyen30j: parMoyen.map((m) => ({ methode: m._id, commandes: m.commandes })),
    dernieresCommandes: dernieres.map((o) => ({
      id: String(o._id),
      numero: o.numero,
      statut: o.statut,
      total: o.total,
      createdAt: o.createdAt,
      client: (o.client as unknown as { nom?: string } | null)?.nom ?? "—",
      paiement: o.paiement ? { methode: o.paiement.methode ?? null, statut: o.paiement.statut ?? null } : null,
    })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
