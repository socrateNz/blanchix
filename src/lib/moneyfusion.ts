/**
 * Client pour l'API de paiement MoneyFusion (Orange Money / MTN MoMo).
 *
 * docs.moneyfusion.net n'est pas joignable depuis l'environnement de développement actuel :
 * les formes de requête/réponse ci-dessous sont reconstituées à partir de leurs SDK officiels
 * et communautaires (TypeScript, .NET, Laravel) plutôt que lues directement dans leur doc.
 * À revalider avec le vrai tableau de bord dès que le compte MoneyFusion est actif, en
 * particulier : le format exact de MONEYFUSION_API_URL et la présence ou non d'un en-tête
 * de signature sur le webhook (nos sources ne documentent aucune signature vérifiable — voir
 * la vérification serveur-à-serveur dans src/services/payment.ts, qui ne fait donc jamais
 * confiance au contenu brut d'un webhook).
 */

export interface MoneyFusionPaymentRequest {
  totalPrice: number;
  article: Record<string, number>[];
  personal_Info?: Record<string, unknown>[];
  numeroSend: string;
  nomclient: string;
  return_url: string;
  webhook_url: string;
}

export interface MoneyFusionPaymentResponse {
  statut: boolean;
  token: string;
  message: string;
  url: string;
}

export interface MoneyFusionVerificationData {
  _id: string;
  tokenPay: string;
  numeroSend: string;
  nomclient: string;
  personal_Info: Record<string, unknown>[];
  numeroTransaction: string;
  Montant: number;
  frais: number;
  statut: "pending" | "paid" | "failed" | "no paid";
  moyen: string;
  return_url: string;
  createdAt: string;
}

export interface MoneyFusionVerificationResponse {
  statut: boolean;
  data: MoneyFusionVerificationData;
  message: string;
}

const STATUS_CHECK_BASE = "https://www.pay.moneyfusion.net/paiementNotif";

function getApiUrl(): string {
  const url = process.env.MONEYFUSION_API_URL;
  if (!url) {
    throw new Error(
      "MONEYFUSION_API_URL est manquant. Renseigne l'URL de paiement fournie par le tableau de bord MoneyFusion dans .env.local."
    );
  }
  return url;
}

export async function initiateMoneyFusionPayment(
  payload: MoneyFusionPaymentRequest
): Promise<MoneyFusionPaymentResponse> {
  const response = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(`MoneyFusion a refusé l'initiation du paiement (HTTP ${response.status}).`);
  }
  return data as MoneyFusionPaymentResponse;
}

export async function checkMoneyFusionPaymentStatus(
  token: string
): Promise<MoneyFusionVerificationResponse> {
  const response = await fetch(`${STATUS_CHECK_BASE}/${token}`);

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error(`Impossible de vérifier le statut du paiement MoneyFusion (HTTP ${response.status}).`);
  }
  return data as MoneyFusionVerificationResponse;
}
