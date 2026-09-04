export const MOYEN_PAIEMENT_LABELS: Record<string, string> = {
  // orange_money/mtn_momo : anciennes valeurs (MoneyFusion), conservées pour l'historique.
  orange_money: "Orange Money",
  mtn_momo: "MTN Mobile Money",
  mobile_money: "Paiement mobile (Orange Money / MTN MoMo)",
  carte: "Carte bancaire",
  espece: "Espèces",
};

export const STATUT_PAIEMENT_LABELS: Record<string, string> = {
  initie: "Initié",
  en_attente: "En attente",
  reussi: "Réussi",
  echoue: "Échoué",
  expire: "Expiré",
  rembourse: "Remboursé",
  a_percevoir: "À percevoir à la collecte",
};

// Statut paiement simplifié affiché à l'admin — pendant de deriveStatutCommandeAffiche (voir
// src/lib/orderStatuses.ts) côté logistique. Dérivé à la fois de order.statut (pour
// EN_ATTENTE_PAIEMENT/PAIEMENT_ECHOUE, avant même qu'un sous-document paiement existe) et de
// order.paiement.statut (pour le suivi détaillé une fois un paiement initié, notamment
// "rembourse" et le cash "à percevoir").
export const STATUTS_PAIEMENT_AFFICHE = ["EN_ATTENTE", "PAYE", "REMBOURSE", "ECHOUE"] as const;
export type StatutPaiementAffiche = (typeof STATUTS_PAIEMENT_AFFICHE)[number];

export const STATUT_PAIEMENT_AFFICHE_LABELS: Record<
  StatutPaiementAffiche,
  { label: string; tone: "neutre" | "attente" | "progression" | "succes" | "alerte" }
> = {
  EN_ATTENTE: { label: "En attente de paiement", tone: "attente" },
  PAYE: { label: "Payé", tone: "succes" },
  REMBOURSE: { label: "Remboursé", tone: "alerte" },
  ECHOUE: { label: "Échoué", tone: "alerte" },
};

export function deriveStatutPaiementAffiche(order: {
  statut: string;
  paiement?: { statut?: string | null } | null;
}): StatutPaiementAffiche {
  if (order.paiement?.statut === "rembourse") return "REMBOURSE";
  if (order.paiement?.statut === "a_percevoir") return "EN_ATTENTE";
  // Vérifie explicitement "reussi" plutôt que d'y défaut par élimination : une commande
  // ANNULEE/INCIDENT/COLLECTE_ECHOUEE alors qu'elle était encore EN_ATTENTE_PAIEMENT (jamais
  // payée) ne matchait aucun des cas ci-dessous et retombait sur un `return "PAYE"` par défaut
  // — bug réel observé en prod : annuler une commande jamais payée l'affichait comme "Payée".
  if (order.paiement?.statut === "reussi") return "PAYE";
  if (order.statut === "PAIEMENT_ECHOUE" || order.paiement?.statut === "echoue" || order.paiement?.statut === "expire") {
    return "ECHOUE";
  }
  return "EN_ATTENTE";
}
