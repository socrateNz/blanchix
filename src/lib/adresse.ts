/**
 * Formatte une adresse pour l'affichage — gère à la fois le nouveau format (zone + lieu-dit)
 * et l'ancien (quartier + rue, conservé en legacy sur les commandes/résidences créées avant
 * l'introduction des zones de livraison) sans jamais planter sur des documents anciens.
 */
export function formatZoneAdresse(a: {
  zoneNom?: string | null;
  lieuDit?: string | null;
  quartier?: string | null;
  rue?: string | null;
}): string {
  const zone = a.zoneNom ?? a.quartier ?? "—";
  const lieu = a.lieuDit ?? a.rue ?? "";
  return lieu ? `${zone}, ${lieu}` : zone;
}
