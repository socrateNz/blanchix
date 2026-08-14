import Order from "@/models/Order";

/**
 * Génère un numéro de commande lisible du type BLX-20260807001.
 * Basé sur un comptage du jour — suffisant pour le volume attendu en MVP ;
 * une collection de compteurs atomiques serait nécessaire pour éliminer
 * toute condition de course sous forte concurrence.
 */
export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePart = `${yyyy}${mm}${dd}`;

  const startOfDay = new Date(yyyy, now.getMonth(), now.getDate());
  const endOfDay = new Date(yyyy, now.getMonth(), now.getDate() + 1);

  const countToday = await Order.countDocuments({
    createdAt: { $gte: startOfDay, $lt: endOfDay },
  });

  const sequence = String(countToday + 1).padStart(3, "0");
  return `BLX-${datePart}${sequence}`;
}
