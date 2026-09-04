/**
 * Constantes tarifaires — valeurs de démarrage à valider avec Blanchix.
 * Le cahier des charges (section 2.4, étape 4) fixe l'ordre des majorations
 * (Standard = tarif de base < Express = majoration modérée < Premium = majoration
 * la plus élevée) mais ne donne pas de montants exacts pour les majorations de délai.
 * Isolées ici pour être faciles à ajuster.
 *
 * Les frais de livraison ne sont plus une constante ici — ils dépendent de la zone de
 * livraison choisie (src/models/DeliveryZone.ts) et de la config "livraison gratuite"
 * (src/services/settings.ts), résolus par l'appelant de computeOrderTotals.
 */

export const MAJORATION_DELAI_TAUX: Record<"standard" | "express" | "premium", number> = {
  standard: 0,
  express: 0.2,
  premium: 0.5,
};

export type Delai = keyof typeof MAJORATION_DELAI_TAUX;

export const DELAI_LABELS: Record<Delai, { label: string; duree: string }> = {
  premium: { label: "Premium", duree: "12 h" },
  express: { label: "Express", duree: "24 h" },
  standard: { label: "Standard", duree: "72 h" },
};
