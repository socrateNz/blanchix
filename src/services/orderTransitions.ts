import mongoose from "mongoose";
import type { OrderDocument } from "@/models/Order";
import {
  PROCHAINE_ETAPE,
  STATUTS_ANNULABLES,
  STATUTS_REMBOURSABLES,
  type OrderStatus,
} from "@/lib/orderStatuses";

export class TransitionInvalideError extends Error {}

export type ActionCommande = "etape_suivante" | "annuler" | "rembourser" | "marquer_paye";

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

  // marquer_paye — cash "à percevoir" uniquement : le paiement en ligne suit son propre flux
  // automatique (src/services/payment.ts), inutile de pouvoir le forcer manuellement ici.
  if (order.paiement?.methode !== "espece" || order.paiement.statut !== "a_percevoir") {
    throw new TransitionInvalideError("Cette commande n'a pas de paiement en espèces en attente de perception.");
  }
  order.paiement.statut = "reussi";
  order.paiement.dateMaj = new Date();
  await order.save();
  return statutActuel;
}
