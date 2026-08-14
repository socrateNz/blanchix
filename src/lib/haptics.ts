/**
 * Vibration API — retour haptique léger sur quelques interactions clés (section 16.1,
 * "composants natifs"). Non supportée par Safari iOS : no-op silencieux dans ce cas plutôt
 * qu'une erreur, la fonctionnalité reste purement un bonus tactile.
 */
export function vibrer(pattern: number | number[] = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}
