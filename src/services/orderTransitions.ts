import mongoose from "mongoose";
import type { OrderDocument } from "@/models/Order";
import {
  PROCHAINE_ETAPE,
  STATUTS_ANNULABLES,
  STATUTS_REMBOURSABLES,
  type OrderStatus,
} from "@/lib/orderStatuses";

export class TransitionInvalideError extends Error {}

export type ActionCommande = "etape_suivante" | "annuler" | "rembourser";

type OrderHydrated = mongoose.HydratedDocument<OrderDocument>;

/**
 * Applique une transition de statut pilotée par l'administrateur (section 3.3), avec
 * historique et — pour un remboursement — mise à jour du sous-document paiement.
 *
 * Un remboursement ici n'enregistre que le changement de statut côté Blanchix : il ne
 * déclenche aucun virement réel via MoneyFusion (non implémenté — à faire manuellement
 * depuis leur tableau de bord tant que ce n'est pas automatisé).
 */
export async function appliquerTransitionCommande(
  order: OrderHydrated,
  action: ActionCommande,
  userId: string,
  commentaire?: string
): Promise<OrderStatus> {
  const statutActuel = order.statut as OrderStatus;
  let nouveauStatut: OrderStatus;

  if (action === "etape_suivante") {
    const suivant = PROCHAINE_ETAPE[statutActuel];
    if (!suivant) {
      throw new TransitionInvalideError(`Aucune étape suivante disponible depuis le statut ${statutActuel}.`);
    }
    nouveauStatut = suivant;
  } else if (action === "annuler") {
    if (!STATUTS_ANNULABLES.includes(statutActuel)) {
      throw new TransitionInvalideError(`Impossible d'annuler une commande au statut ${statutActuel}.`);
    }
    nouveauStatut = "ANNULEE";
  } else {
    if (!STATUTS_REMBOURSABLES.includes(statutActuel)) {
      throw new TransitionInvalideError(`Impossible de rembourser une commande au statut ${statutActuel}.`);
    }
    nouveauStatut = "REMBOURSEE";
  }

  order.statut = nouveauStatut;
  order.statusHistory.push({
    statut: nouveauStatut,
    date: new Date(),
    user: new mongoose.Types.ObjectId(userId),
    commentaire,
  });

  if (nouveauStatut === "REMBOURSEE" && order.paiement) {
    order.paiement.statut = "rembourse";
    order.paiement.dateMaj = new Date();
  }

  await order.save();
  return nouveauStatut;
}
