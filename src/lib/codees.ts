/**
 * Client pour l'API de paiement Codees (Orange Money / MTN MoMo), agrégateur choisi en
 * remplacement de MoneyFusion — voir pay.codees-cm.com/merchant/api-reference/, un vrai schéma
 * OpenAPI documenté (contrairement à MoneyFusion, entièrement reconstitué depuis des SDK tiers).
 *
 * Utilise le Hosted Checkout (POST /checkout/create/ puis redirection vers checkout_url) —
 * l'intégration recommandée par leur propre documentation ("the fastest way to integrate"),
 * et celle qui correspond le mieux à l'architecture déjà en place (redirection + polling de
 * statut, comme pour MoneyFusion). Les endpoints bas niveau /payment/process/ et
 * /payment/status/ existent dans leur schéma mais n'ont aucune forme de requête/réponse
 * documentée ("Easy-Transact integration", sans détail) — délibérément ignorés ici.
 *
 * Aucun format de webhook n'est documenté par Codees (juste une mention qu'ils existent) : le
 * webhook reçu ne sert donc, comme pour MoneyFusion, que de déclencheur pour revérifier le
 * statut réel via GET /checkout/{id}/status/ — jamais de confiance dans le contenu brut reçu.
 */

export interface CodeesCheckoutCreateRequest {
  amount: string;
  currency?: string;
  reference?: string;
  customer_name?: string;
  customer_email?: string;
  success_url: string;
  cancel_url: string;
}

export interface CodeesCheckoutCreateResponse {
  checkout_id: string;
  checkout_url: string;
  expires_at: string;
}

export type CodeesCheckoutStatut = "open" | "processing" | "completed" | "failed" | "cancelled" | "expired";

export interface CodeesCheckoutStatusResponse {
  status: CodeesCheckoutStatut;
  amount: string;
  currency: string;
  success_url: string;
  cancel_url: string;
}

const BASE_URL = "https://pay.codees-cm.com/api/v1";

// Erreurs Codees observées sous la forme {"detail": "..."} (ex. "Invalid API credentials" sur
// un 403) — remonté dans le message d'erreur plutôt que juste le code HTTP, pour ne pas avoir
// à redevenir un appel curl manuel à chaque diagnostic.
function messageErreur(status: number, data: unknown): string {
  const detail = data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : null;
  return detail ? `Codees a refusé la requête (HTTP ${status}) : ${detail}` : `Codees a refusé la requête (HTTP ${status}).`;
}

function getHeaders(): HeadersInit {
  const apiKey = process.env.CODEES_API_KEY;
  const secretKey = process.env.CODEES_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error(
      "CODEES_API_KEY / CODEES_SECRET_KEY manquants. Renseigne-les dans .env (identifiants fournis par Codees)."
    );
  }
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-Secret-Key": secretKey,
  };
}

export async function creerCodeesCheckout(
  payload: CodeesCheckoutCreateRequest
): Promise<CodeesCheckoutCreateResponse> {
  const response = await fetch(`${BASE_URL}/checkout/create/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(messageErreur(response.status, data));
  }
  return data as CodeesCheckoutCreateResponse;
}

export async function verifierCodeesCheckout(checkoutId: string): Promise<CodeesCheckoutStatusResponse> {
  const response = await fetch(`${BASE_URL}/checkout/${checkoutId}/status/`, {
    headers: getHeaders(),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(messageErreur(response.status, data));
  }
  return data as CodeesCheckoutStatusResponse;
}
