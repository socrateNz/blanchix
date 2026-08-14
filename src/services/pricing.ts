import { FRAIS_LIVRAISON_FCFA, MAJORATION_DELAI_TAUX, type Delai } from "@/lib/pricing-constants";

export interface LigneArticle {
  prixUnitaire: number;
  quantite: number;
}

export interface OrderTotals {
  sousTotal: number;
  fraisLivraison: number;
  majorationDelai: number;
  reduction: number;
  total: number;
}

/**
 * Source unique de vérité pour le calcul des montants d'une commande.
 * Appelée côté serveur avant toute création de commande — jamais confiance
 * aux montants transmis par le client (cahier des charges section 6.6).
 */
export function computeOrderTotals(articles: LigneArticle[], delai: Delai): OrderTotals {
  const sousTotal = articles.reduce((sum, a) => sum + a.prixUnitaire * a.quantite, 0);
  const fraisLivraison = FRAIS_LIVRAISON_FCFA;
  const majorationDelai = Math.round(sousTotal * MAJORATION_DELAI_TAUX[delai]);
  const reduction = 0; // Pas de programme de fidélité en phase 1.
  const total = sousTotal + fraisLivraison + majorationDelai - reduction;

  return { sousTotal, fraisLivraison, majorationDelai, reduction, total };
}
