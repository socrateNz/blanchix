import Settings from "@/models/Settings";

/**
 * Accès unique à la configuration globale (commande minimale, livraison gratuite) — garantit
 * toujours un document via upsert sur l'_id fixe "global", jamais de lecture d'un document
 * inexistant ni de doublon sous accès concurrents.
 */
export async function getSettings() {
  return Settings.findByIdAndUpdate(
    "global",
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
