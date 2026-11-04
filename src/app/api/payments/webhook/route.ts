import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import { verifierEtAppliquerPaiement } from "@/services/payment";

/**
 * Réception des notifications Codees (Developers → Webhooks du tableau de bord marchand).
 * Format documenté par Codees :
 *   { "event": "payment.status_updated",
 *     "data": { "transaction_id", "external_reference", "status", "amount", ... } }
 * signé par l'en-tête X-Codees-Signature = HMAC-SHA256 (hex) du corps BRUT, clé
 * CODEES_WEBHOOK_SECRET. Le bouton "Send test event" envoie "event": "test.ping".
 *
 * Même signé, le contenu ne sert jamais de source de vérité (section 6.1) : il désigne
 * seulement QUEL paiement revérifier, et le statut réel est redemandé à Codees
 * (verifierEtAppliquerPaiement). Codees peut renvoyer plusieurs fois le même statut : le
 * traitement est idempotent (aucune transition ni e-mail en double sur une commande déjà payée).
 * Codees retente sur 5xx/429 : on répond donc 200 même en cas d'échec interne, rattrapé par
 * le polling client ou le bouton admin "Vérifier le paiement".
 */

function signatureValide(corpsBrut: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const attendue = createHmac("sha256", secret).update(corpsBrut).digest("hex");
  const recue = Buffer.from(signature.trim());
  return recue.length === attendue.length && timingSafeEqual(Buffer.from(attendue), recue);
}

export async function POST(request: NextRequest) {
  // Corps BRUT : la signature porte sur les octets exacts reçus, pas sur un JSON re-sérialisé.
  const corpsBrut = await request.text();

  const secret = process.env.CODEES_WEBHOOK_SECRET;
  if (secret) {
    if (!signatureValide(corpsBrut, request.headers.get("x-codees-signature"), secret)) {
      return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
    }
  } else {
    // Sans secret configuré, on accepte quand même : le contenu n'est de toute façon jamais cru
    // (revérification auprès de Codees). À configurer dès que possible dans le .env.
    console.warn("Webhook Codees reçu sans CODEES_WEBHOOK_SECRET configuré : signature non vérifiée.");
  }

  let payload: { event?: string; data?: Record<string, unknown> } | null = null;
  try {
    payload = JSON.parse(corpsBrut);
  } catch {
    return NextResponse.json({ received: true });
  }

  if (payload?.event === "test.ping") {
    return NextResponse.json({ received: true, test: true });
  }

  try {
    await dbConnect();

    const data = payload?.data ?? {};
    const transactionId = typeof data.transaction_id === "string" ? data.transaction_id : null;
    // external_reference = order.numero, transmis comme "reference" à la création du checkout
    // (voir /api/payments/initiate).
    const referenceCommande = typeof data.external_reference === "string" ? data.external_reference : null;

    let payment = transactionId ? await Payment.findOne({ referenceExterne: transactionId }) : null;
    if (!payment && referenceCommande) {
      const order = await Order.findOne({ numero: referenceCommande }).select("_id");
      if (order) {
        // Dernière tentative de paiement en ligne de cette commande (une commande peut en avoir
        // plusieurs : chaque clic "Payer" crée une nouvelle session Codees).
        payment = await Payment.findOne({ order: order._id, referenceExterne: { $ne: null } }).sort({ createdAt: -1 });
      }
    }
    if (!payment) {
      console.warn(`Webhook Codees sans paiement correspondant (transaction ${transactionId}, commande ${referenceCommande}).`);
      return NextResponse.json({ received: true });
    }

    payment.callbackRecuLe.push(new Date());
    await payment.save();

    // forcer : un paiement marqué localement "échoué"/"expiré" (ex. délai dépassé sans
    // consultation) doit être revérifié si Codees le notifie — sinon un client qui a réellement
    // payé resterait affiché en échec. Jamais pour "reussi" (déjà traité) ni "rembourse" (un
    // remboursement ne doit pas être réécrit en "reussi" par le statut Codees du paiement d'origine).
    const forcer = payment.statut === "echoue" || payment.statut === "expire";
    await verifierEtAppliquerPaiement(payment, { forcer });
  } catch (err) {
    console.error("Erreur de traitement du webhook Codees :", err);
  }

  return NextResponse.json({ received: true });
}
