import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import { expirerPaiementSiDepasse, verifierEtAppliquerPaiement } from "@/services/payment";

const PAIEMENT_EXPIRATION_MS = 15 * 60 * 1000;

/**
 * Consultée par le frontend pendant l'attente de confirmation d'un paiement (section 6.1 —
 * le frontend n'est jamais la source de vérité, il interroge le backend). Revérifie le
 * paiement en cours auprès de MoneyFusion si le webhook n'est pas encore arrivé.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId requis." }, { status: 400 });
  }

  await dbConnect();

  const order = await Order.findById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  const payment = await Payment.findOne({ order: order._id }).sort({ createdAt: -1 });

  if (payment && (payment.statut === "initie" || payment.statut === "en_attente")) {
    await expirerPaiementSiDepasse(payment, PAIEMENT_EXPIRATION_MS);
    if (payment.statut === "initie" || payment.statut === "en_attente") {
      await verifierEtAppliquerPaiement(payment);
    }
  }

  const orderActuelle = await Order.findById(orderId);

  return NextResponse.json({
    statutCommande: orderActuelle!.statut,
    statutPaiement: payment?.statut ?? null,
    methodePaiement: orderActuelle!.paiement?.methode ?? null,
    numero: orderActuelle!.numero,
    sousTotal: orderActuelle!.sousTotal,
    fraisLivraison: orderActuelle!.fraisLivraison,
    majorationDelai: orderActuelle!.majorationDelai,
    reduction: orderActuelle!.reduction,
    total: orderActuelle!.total,
  });
}
