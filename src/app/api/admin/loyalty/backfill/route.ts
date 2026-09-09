import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import Order from "@/models/Order";
import User from "@/models/User";
import { attribuerPointsFidelite } from "@/services/loyalty";

// Statuts indiquant qu'une commande a bien été confirmée/payée à un moment de son cycle de vie
// (tout sauf brouillon, en attente de paiement, paiement échoué ou annulée) — voir
// src/lib/orderStatuses.ts pour le cycle complet. Un remboursement ne change plus order.statut
// depuis la séparation commande/paiement (orderTransitions.ts), donc une commande remboursée
// reste correctement incluse ici : le client avait bien payé à l'origine.
const STATUTS_EXCLUS = ["BROUILLON", "EN_ATTENTE_PAIEMENT", "PAIEMENT_ECHOUE", "ANNULEE"];

/**
 * Rattrapage ponctuel : attribue les points de fidélité (500 FCFA = 1 point, voir
 * src/services/loyalty.ts) aux commandes déjà confirmées AVANT l'introduction de cette
 * fonctionnalité. Réutilise attribuerPointsFidelite telle quelle (même règle, même
 * enregistrement LoyaltyTransaction, même garde-fou anti double-crédit via
 * order.pointsGagnes) plutôt que de dupliquer la logique en script one-off. Se relance sans
 * risque : les commandes déjà créditées sont ignorées.
 */
export async function POST() {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();

  const commandes = await Order.find({
    statut: { $nin: STATUTS_EXCLUS },
    pointsGagnes: { $in: [0, null] },
    total: { $gt: 0 },
  });

  let commandesTraitees = 0;
  let pointsAttribues = 0;

  for (const order of commandes) {
    const client = await User.findById(order.client);
    if (!client) continue;

    await attribuerPointsFidelite(order, client);

    if (order.pointsGagnes > 0) {
      await order.save();
      commandesTraitees += 1;
      pointsAttribues += order.pointsGagnes;
    }
  }

  return NextResponse.json({ commandesTraitees, pointsAttribues });
}
