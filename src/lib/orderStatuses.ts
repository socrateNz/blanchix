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
 */
export const PROCHAINE_ETAPE: Partial<Record<OrderStatus, OrderStatus>> = {
  COLLECTE_PLANIFIEE: "COLLECTEE",
  COLLECTEE: "EN_LAVAGE",
  EN_LAVAGE: "EN_REPASSAGE",
  EN_REPASSAGE: "PRETE",
  PRETE: "EN_LIVRAISON",
  EN_LIVRAISON: "LIVREE",
};

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
