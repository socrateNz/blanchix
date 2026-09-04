import { MAJORATION_DELAI_TAUX, type Delai } from "@/lib/pricing-constants";

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

export interface LivraisonGratuiteConfig {
  active: boolean;
  seuil: number;
}

/**
 * Source unique de vérité pour le calcul des montants d'une commande.
 * Appelée côté serveur avant toute création de commande — jamais confiance
 * aux montants transmis par le client (cahier des charges section 6.6).
 *
 * Reste une fonction pure/synchrone (pas d'accès DB ici) : l'appelant résout d'abord le prix
 * de la zone de livraison choisie (src/models/DeliveryZone.ts) et la config livraison gratuite
 * (src/services/settings.ts) et les passe déjà résolus, comme il résout déjà les prix du
 * catalogue avant d'appeler cette fonction.
 */
export function computeOrderTotals(
  articles: LigneArticle[],
  delai: Delai,
  fraisLivraisonBase: number,
  livraisonGratuite: LivraisonGratuiteConfig
): OrderTotals {
  const sousTotal = articles.reduce((sum, a) => sum + a.prixUnitaire * a.quantite, 0);
  const livraisonOfferte = livraisonGratuite.active && sousTotal >= livraisonGratuite.seuil;
  const fraisLivraison = livraisonOfferte ? 0 : fraisLivraisonBase;
  const majorationDelai = Math.round(sousTotal * MAJORATION_DELAI_TAUX[delai]);
  const reduction = 0; // Pas de programme de fidélité en phase 1.
  const total = sousTotal + fraisLivraison + majorationDelai - reduction;

  return { sousTotal, fraisLivraison, majorationDelai, reduction, total };
}
