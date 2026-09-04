import mongoose from "mongoose";
import type { OrderDocument } from "@/models/Order";
import {
  PROCHAINE_ETAPE,
  STATUTS_ANNULABLES,
  STATUTS_REMBOURSABLES,
  type OrderStatus,
} from "@/lib/orderStatuses";

export class TransitionInvalideError extends Error {}

export type ActionCommande = "etape_suivante" | "annuler" | "rembourser" | "marquer_paye" | "confirmer_paiement_manuel";

type OrderHydrated = mongoose.HydratedDocument<OrderDocument>;

/**
 * Applique une transition pilotée par l'administrateur (section 3.3), avec historique et —
 * pour un remboursement ou un paiement cash perçu — mise à jour du sous-document paiement.
 *
 * Depuis la séparation statut commande / statut paiement : "rembourser" et "marquer_paye" ne
 * touchent plus order.statut (la logistique n'a pas changé), uniquement order.paiement. Le
 * statut "OrderStatus" renvoyé pour ces deux actions sert uniquement à déclencher la bonne
 * notification email côté appelant (cf. notifierChangementStatut) — il n'est pas forcément
 * persisté tel quel dans order.statut.
 *
 * Un remboursement ici n'enregistre que le changement côté Blanchix : il ne déclenche aucun
 * virement réel via Codees (non implémenté — à faire manuellement depuis leur tableau de
 * bord tant que ce n'est pas automatisé).
 */
export async function appliquerTransitionCommande(
  order: OrderHydrated,
  action: ActionCommande,
  userId: string,
  commentaire?: string
): Promise<OrderStatus> {
  const statutActuel = order.statut as OrderStatus;

  if (action === "etape_suivante") {
    const suivant = PROCHAINE_ETAPE[statutActuel];
    if (!suivant) {
      throw new TransitionInvalideError(`Aucune étape suivante disponible depuis le statut ${statutActuel}.`);
    }
    order.statut = suivant;
    order.statusHistory.push({
      statut: suivant,
      date: new Date(),
      user: new mongoose.Types.ObjectId(userId),
      commentaire,
    });
    await order.save();
    return suivant;
  }

  if (action === "annuler") {
    if (!STATUTS_ANNULABLES.includes(statutActuel)) {
      throw new TransitionInvalideError(`Impossible d'annuler une commande au statut ${statutActuel}.`);
    }
    order.statut = "ANNULEE";
    order.statusHistory.push({
      statut: "ANNULEE",
      date: new Date(),
      user: new mongoose.Types.ObjectId(userId),
      commentaire,
    });
    await order.save();
    return "ANNULEE";
  }

  if (action === "rembourser") {
    if (!STATUTS_REMBOURSABLES.includes(statutActuel)) {
      throw new TransitionInvalideError(`Impossible de rembourser une commande au statut ${statutActuel}.`);
    }
    if (order.paiement) {
      order.paiement.statut = "rembourse";
      order.paiement.dateMaj = new Date();
    }
    await order.save();
    return "REMBOURSEE";
  }

  if (action === "marquer_paye") {
    // Cash "à percevoir" uniquement : le paiement en ligne suit son propre flux automatique
    // (src/services/payment.ts), inutile de pouvoir le forcer manuellement ici — voir
    // "confirmer_paiement_manuel" ci-dessous pour l'équivalent côté paiement en ligne.
    if (order.paiement?.methode !== "espece" || order.paiement.statut !== "a_percevoir") {
      throw new TransitionInvalideError("Cette commande n'a pas de paiement en espèces en attente de perception.");
    }
    order.paiement.statut = "reussi";
    order.paiement.dateMaj = new Date();
    await order.save();
    return statutActuel;
  }

  // confirmer_paiement_manuel — bascule administrative directe pour une commande EN_ATTENTE_
  // PAIEMENT (paiement en ligne Codees), sans revérifier auprès du prestataire : utile si
  // l'admin a une confirmation par un autre canal, ou pour débloquer une commande dont le
  // webhook/la vérification automatique n'a pas abouti. Pour une vérification réelle auprès de
  // Codees plutôt qu'une simple bascule, voir l'action "verifier_paiement" (route API dédiée,
  // hors de cette fonction puisqu'elle appelle un service externe).
  if (statutActuel !== "EN_ATTENTE_PAIEMENT") {
    throw new TransitionInvalideError("Cette commande n'est pas en attente de paiement.");
  }
  const maintenant = new Date();
  order.statut = "COLLECTE_PLANIFIEE";
  order.statusHistory.push(
    { statut: "PAYEE", date: maintenant, user: new mongoose.Types.ObjectId(userId), commentaire },
    { statut: "COLLECTE_PLANIFIEE", date: maintenant }
  );
  if (order.paiement) {
    order.paiement.statut = "reussi";
    order.paiement.dateMaj = maintenant;
  }
  await order.save();
  return "COLLECTE_PLANIFIEE";
}
