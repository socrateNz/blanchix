/**
 * Constantes tarifaires — valeurs de démarrage à valider avec Blanchix.
 * Le cahier des charges (section 2.4, étape 4) fixe l'ordre des majorations
 * (Standard = tarif de base < Express = majoration modérée < Premium = majoration
 * la plus élevée) mais ne donne pas de montants exacts pour les frais de livraison
 * ni les majorations de délai. Isolées ici pour être faciles à ajuster.
 */

// Mis à 0 pour le moment (valeur provisoire, à réactiver/ajuster plus tard).
export const FRAIS_LIVRAISON_FCFA = 0;

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
