import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    throw new Error(
      "Configuration VAPID manquante. Renseigne NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT dans .env.local."
    );
  }

  webpush.setVapidDetails(VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Renvoie les endpoints devenus invalides (410 Gone / 404) afin que l'appelant les retire de
 * l'utilisateur — sans ça, les abonnements expirés (désinstallation, changement de navigateur)
 * s'accumuleraient indéfiniment en base.
 */
export async function envoyerPush(
  subscriptions: PushSubscriptionRecord[],
  payload: { title: string; body: string; url: string }
): Promise<{ endpointsInvalides: string[] }> {
  ensureConfigured();

  const endpointsInvalides: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          endpointsInvalides.push(subscription.endpoint);
        } else {
          console.error("Échec d'envoi push :", err);
        }
      }
    })
  );

  return { endpointsInvalides };
}
