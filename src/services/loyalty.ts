import mongoose from "mongoose";
import type { OrderDocument } from "@/models/Order";
import type { UserDocument } from "@/models/User";
import LoyaltyTransaction from "@/models/LoyaltyTransaction";

type OrderHydrated = mongoose.HydratedDocument<OrderDocument>;
type UserHydrated = mongoose.HydratedDocument<UserDocument>;

// Règle fixée par le client (section 2.6 du cahier des charges, jusqu'ici en stub) :
// 500 FCFA payés = 1 point, arrondi à l'entier inférieur (une commande à 999 FCFA rapporte
// 1 point, pas 1.998).
const FCFA_PAR_POINT = 500;

/**
 * Attribue les points de fidélité au moment où une commande est confirmée (paiement en ligne
 * réussi, espèces perçues, ou confirmation manuelle admin) — appelée depuis
 * notifierCommandeConfirmee, le point d'entrée commun à ces trois cas, jamais directement
 * depuis une route API.
 *
 * Idempotent : ne recrédite jamais une commande qui a déjà des points enregistrés
 * (order.pointsGagnes > 0) — filet de sécurité indépendant des garde-fous déjà présents sur
 * les transitions de statut (qui empêchent déjà en pratique un double appel).
 */
export async function attribuerPointsFidelite(order: OrderHydrated, client: UserHydrated): Promise<void> {
  if (order.pointsGagnes > 0) return;

  const points = Math.floor(order.total / FCFA_PAR_POINT);
  if (points <= 0) return;

  order.pointsGagnes = points;

  client.points = (client.points ?? 0) + points;
  await client.save();

  await LoyaltyTransaction.create({
    user: client._id,
    order: order._id,
    type: "gain",
    points,
    solde: client.points,
    description: `Commande ${order.numero}`,
  });
}
