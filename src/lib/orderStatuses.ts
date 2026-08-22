// Cycle de vie d'une commande — cahier des charges section 3.
export const ORDER_STATUSES = [
  // Parcours nominal
  "BROUILLON",
  "EN_ATTENTE_PAIEMENT",
  "PAYEE",
  "COLLECTE_PLANIFIEE",
  "COLLECTEE",
  "EN_LAVAGE",
  "EN_REPASSAGE",
  "PRETE",
  "EN_LIVRAISON",
  "LIVREE",
  // Statuts exceptionnels
  "PAIEMENT_ECHOUE",
  "ANNULEE",
  "COLLECTE_ECHOUEE",
  "INCIDENT",
  "REMBOURSEE",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUT_LABELS: Record<OrderStatus, { label: string; tone: "neutre" | "attente" | "progression" | "succes" | "alerte" }> = {
  BROUILLON: { label: "Brouillon", tone: "neutre" },
  EN_ATTENTE_PAIEMENT: { label: "En attente de paiement", tone: "attente" },
  PAYEE: { label: "Payée", tone: "progression" },
  COLLECTE_PLANIFIEE: { label: "Collecte planifiée", tone: "progression" },
  COLLECTEE: { label: "Collectée", tone: "progression" },
  EN_LAVAGE: { label: "En lavage", tone: "progression" },
  EN_REPASSAGE: { label: "En repassage", tone: "progression" },
  PRETE: { label: "Prête", tone: "progression" },
  EN_LIVRAISON: { label: "En livraison", tone: "progression" },
  LIVREE: { label: "Livrée", tone: "succes" },
  PAIEMENT_ECHOUE: { label: "Paiement échoué", tone: "alerte" },
  ANNULEE: { label: "Annulée", tone: "alerte" },
  COLLECTE_ECHOUEE: { label: "Collecte échouée", tone: "alerte" },
  INCIDENT: { label: "Incident", tone: "alerte" },
  REMBOURSEE: { label: "Remboursée", tone: "alerte" },
};

/**
 * Transitions "étape suivante" pilotables par l'administrateur depuis le tableau de bord
 * (section 3.3). Les transitions automatiques (paiement, callback) et celles qui dépendent
 * du module Incidents (COLLECTE_ECHOUEE, INCIDENT — Phase 6) n'y figurent pas.
 *
 * Simplifié pour ne plus passer par EN_LAVAGE/EN_REPASSAGE/EN_LIVRAISON comme étapes
 * distinctes cliquables (statut commande simplifié — voir deriveStatutCommandeAffiche
 * ci-dessous) : ces valeurs restent dans ORDER_STATUSES/le schéma pour ne pas invalider les
 * commandes historiques qui les ont déjà traversées, mais aucune nouvelle commande ne s'y
 * arrêtera plus — "Marquer prêt"/"Marquer livré" sautent directement à l'étape suivante
 * réellement affichée.
 */
export const PROCHAINE_ETAPE: Partial<Record<OrderStatus, OrderStatus>> = {
  COLLECTE_PLANIFIEE: "COLLECTEE",
  COLLECTEE: "PRETE",
  PRETE: "LIVREE",
};

// Statut commande simplifié affiché à l'admin/au client — sépare la logistique (ce module) du
// paiement (voir deriveStatutPaiementAffiche dans src/lib/paiement.ts). Les statuts liés au
// paiement lui-même (BROUILLON/EN_ATTENTE_PAIEMENT/PAIEMENT_ECHOUE) et les étapes internes
// masquées (EN_LAVAGE/EN_REPASSAGE/EN_LIVRAISON) sont regroupés dans le seau le plus proche.
export const STATUTS_COMMANDE_AFFICHE = [
  "EN_ATTENTE_COLLECTE",
  "COLLECTE",
  "PRETE",
  "LIVREE",
  "ANNULEE",
  "INCIDENT",
  "COLLECTE_ECHOUEE",
] as const;

export type StatutCommandeAffiche = (typeof STATUTS_COMMANDE_AFFICHE)[number];

export const STATUT_COMMANDE_AFFICHE_LABELS: Record<
  StatutCommandeAffiche,
  { label: string; tone: "neutre" | "attente" | "progression" | "succes" | "alerte" }
> = {
  EN_ATTENTE_COLLECTE: { label: "En attente de collecte", tone: "attente" },
  COLLECTE: { label: "Collecté", tone: "progression" },
  PRETE: { label: "Prêt", tone: "progression" },
  LIVREE: { label: "Livré", tone: "succes" },
  ANNULEE: { label: "Annulée", tone: "alerte" },
  INCIDENT: { label: "Incident", tone: "alerte" },
  COLLECTE_ECHOUEE: { label: "Collecte échouée", tone: "alerte" },
};

export function deriveStatutCommandeAffiche(statut: OrderStatus): StatutCommandeAffiche {
  switch (statut) {
    case "BROUILLON":
    case "EN_ATTENTE_PAIEMENT":
    case "PAYEE":
    case "PAIEMENT_ECHOUE":
    case "COLLECTE_PLANIFIEE":
      return "EN_ATTENTE_COLLECTE";
    case "COLLECTEE":
    case "EN_LAVAGE":
    case "EN_REPASSAGE":
      return "COLLECTE";
    case "PRETE":
    case "EN_LIVRAISON":
      return "PRETE";
    case "LIVREE":
      return "LIVREE";
    case "ANNULEE":
      return "ANNULEE";
    case "INCIDENT":
      return "INCIDENT";
    case "COLLECTE_ECHOUEE":
      return "COLLECTE_ECHOUEE";
    case "REMBOURSEE":
      // Legacy uniquement : depuis la séparation commande/paiement, un remboursement ne touche
      // plus statut (voir orderTransitions.ts) — ce cas ne devrait plus se produire pour de
      // nouvelles commandes. Repli raisonnable pour d'éventuelles commandes déjà remboursées
      // avant ce changement, où l'étape logistique au moment du remboursement n'a pas été
      // conservée séparément.
      return "LIVREE";
  }
}

// Mapping inverse — utilisé par le filtre "Statut" du tableau des commandes (admin) pour
// traduire un statut simplifié choisi dans un $in de statuts bruts côté requête Mongo. Dérivé
// automatiquement de deriveStatutCommandeAffiche plutôt que dupliqué à la main, pour ne jamais
// diverger si un nouveau statut brut est ajouté un jour. REMBOURSEE en est exclu (cas legacy
// uniquement, pas un statut sur lequel filtrer).
export const STATUTS_BRUTS_PAR_AFFICHAGE_COMMANDE: Record<StatutCommandeAffiche, OrderStatus[]> = (() => {
  const table = Object.fromEntries(STATUTS_COMMANDE_AFFICHE.map((s) => [s, [] as OrderStatus[]])) as Record<
    StatutCommandeAffiche,
    OrderStatus[]
  >;
  for (const statut of ORDER_STATUSES) {
    if (statut === "REMBOURSEE") continue;
    table[deriveStatutCommandeAffiche(statut)].push(statut);
  }
  return table;
})();

// Section 3.2 : statuts depuis lesquels une annulation/un remboursement est possible.
export const STATUTS_ANNULABLES: OrderStatus[] = [
  "BROUILLON",
  "EN_ATTENTE_PAIEMENT",
  "PAYEE",
  "COLLECTE_PLANIFIEE",
];

export const STATUTS_REMBOURSABLES: OrderStatus[] = [
  "PAYEE",
  "COLLECTE_PLANIFIEE",
  "COLLECTEE",
  "EN_LAVAGE",
  "EN_REPASSAGE",
  "PRETE",
  "EN_LIVRAISON",
  "LIVREE",
];
