import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { verifierEtAppliquerPaiement } from "@/services/payment";

/**
 * Réception des notifications Codees. Leur documentation (pay.codees-cm.com/merchant/api-
 * reference/) mentionne l'existence de webhooks sans jamais documenter leur format ni une
 * signature vérifiable — comme pour MoneyFusion avant, le contenu de la requête ne sert donc
 * jamais de source de vérité (section 6.1) : il ne fait que déclencher une revérification
 * serveur-à-serveur du statut réel via checkout_id, dans verifierEtAppliquerPaiement. Plusieurs
 * noms de champ possibles sont tentés en l'absence de schéma documenté.
 * On répond toujours 200 pour éviter des retentatives inutiles côté opérateur, même en cas
 * d'échec interne (celui-ci sera de toute façon rattrapé par le polling de statut côté client).
 */
export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  try {
    await dbConnect();

    const checkoutId: string | null =
      payload?.checkout_id ?? payload?.data?.checkout_id ?? payload?.id ?? payload?.session_uuid ?? null;
    if (!checkoutId) {
      return NextResponse.json({ received: true });
    }

    const payment = await Payment.findOne({ referenceExterne: checkoutId });
    if (!payment) {
      return NextResponse.json({ received: true });
    }

    payment.callbackRecuLe.push(new Date());
    await payment.save();

    await verifierEtAppliquerPaiement(payment);
  } catch (err) {
    console.error("Erreur de traitement du webhook Codees :", err);
  }

  return NextResponse.json({ received: true });
}
