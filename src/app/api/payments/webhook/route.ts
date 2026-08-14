import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { verifierEtAppliquerPaiement } from "@/services/payment";

/**
 * Réception des notifications MoneyFusion. Aucune signature de webhook vérifiable n'est
 * documentée par MoneyFusion à ce jour (voir src/lib/moneyfusion.ts) : le contenu de la requête
 * ne sert donc jamais de source de vérité (section 6.1) — il ne fait que déclencher une
 * revérification serveur-à-serveur du statut réel via le token, dans verifierEtAppliquerPaiement.
 * On répond toujours 200 pour éviter des retentatives inutiles côté opérateur, même en cas
 * d'échec interne (celui-ci sera de toute façon rattrapé par le polling de statut côté client).
 */
export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  try {
    await dbConnect();

    const token: string | null =
      payload?.tokenPay ?? payload?.data?.tokenPay ?? payload?.token ?? null;
    if (!token) {
      return NextResponse.json({ received: true });
    }

    const payment = await Payment.findOne({ referenceExterne: token });
    if (!payment) {
      return NextResponse.json({ received: true });
    }

    payment.callbackRecuLe.push(new Date());
    await payment.save();

    await verifierEtAppliquerPaiement(payment);
  } catch (err) {
    console.error("Erreur de traitement du webhook MoneyFusion :", err);
  }

  return NextResponse.json({ received: true });
}
