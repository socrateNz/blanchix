import { PLAGES_HORAIRES } from "@/lib/slots-constants";
import DeliverySlot from "@/models/DeliverySlot";

export const JOURS_A_VENIR = 5;
export const CAPACITE_MAX_DEFAUT = 5;

/**
 * Maintient une fenêtre glissante de créneaux ouverts sur les `JOURS_A_VENIR` prochains jours
 * (upsert idempotent — sûr à appeler plusieurs fois par jour). Sans exécution régulière, tous
 * les créneaux finissent par passer dans le passé et "Aucun créneau disponible" s'affiche côté
 * client (vécu en prod le 2026-08-20 : dernier seed le 13, plus aucun créneau valide le 20).
 * Appelée à la fois par scripts/seed.ts (une fois, à l'installation) et par la route cron
 * /api/cron/generate-slots (quotidiennement, pour repousser la fenêtre d'un jour).
 */
export async function genererCreneauxAVenir(): Promise<number> {
  let count = 0;
  const aujourdhui = new Date();

  for (let dayOffset = 1; dayOffset <= JOURS_A_VENIR; dayOffset++) {
    const date = new Date(aujourdhui);
    date.setDate(aujourdhui.getDate() + dayOffset);
    date.setHours(0, 0, 0, 0);

    // Plus de créneaux de livraison programmés — seule la collecte reste planifiée par
    // créneau (voir Order.creneauLivraison, désormais optionnel). "livraison" reste une valeur
    // valide du schéma DeliverySlot pour ne pas invalider les créneaux déjà existants.
    for (const plageHoraire of PLAGES_HORAIRES) {
      await DeliverySlot.findOneAndUpdate(
        { date, type: "collecte", plageHoraire },
        { $setOnInsert: { capaciteMax: CAPACITE_MAX_DEFAUT, reserves: 0, statut: "ouvert" } },
        { upsert: true }
      );
      count++;
    }
  }

  return count;
}
