import mongoose from "mongoose";
import Order, { type OrderDocument } from "@/models/Order";
import { type PaymentDocument } from "@/models/Payment";
import { checkMoneyFusionPaymentStatus } from "@/lib/moneyfusion";
import { notifierCommandeConfirmee } from "@/services/notifications";

type PaymentHydrated = mongoose.HydratedDocument<PaymentDocument>;
type OrderHydrated = mongoose.HydratedDocument<OrderDocument>;

const STATUTS_PAIEMENT_TERMINAUX = ["reussi", "echoue", "expire", "rembourse"];

/**
 * Revérifie un paiement en cours directement auprès de MoneyFusion (jamais sur la base d'un
 * contenu de webhook non authentifié — cahier des charges section 6.1) et applique la transition
 * de statut de commande correspondante. Idempotent : un paiement déjà dans un statut terminal
 * n'est jamais retraité (section 6.3).
 */
export async function verifierEtAppliquerPaiement(payment: PaymentHydrated): Promise<PaymentHydrated> {
  if (STATUTS_PAIEMENT_TERMINAUX.includes(payment.statut ?? "")) {
    return payment;
  }
  if (!payment.referenceExterne) {
    return payment;
  }

  const verification = await checkMoneyFusionPaymentStatus(payment.referenceExterne);
  payment.logsBruts.push({ source: "verification", reponse: verification, date: new Date() });

  const order = (await Order.findById(payment.order)) as OrderHydrated | null;
  const statutFournisseur = verification.data?.statut;
  const maintenant = new Date();

  if (statutFournisseur === "paid") {
    payment.statut = "reussi";

    if (order && (order.statut === "EN_ATTENTE_PAIEMENT" || order.statut === "PAIEMENT_ECHOUE")) {
      // Le créneau a déjà été réservé à la création de la commande (section 9.4) : la
      // planification de collecte peut donc s'enchaîner automatiquement après paiement,
      // conformément à la transition PAYEE → COLLECTE_PLANIFIEE de la section 3.3.
      order.statut = "COLLECTE_PLANIFIEE";
      order.statusHistory.push(
        { statut: "PAYEE", date: maintenant },
        { statut: "COLLECTE_PLANIFIEE", date: maintenant }
      );
      order.paiement = {
        methode: payment.methode,
        statut: "reussi",
        referenceExterne: payment.referenceExterne,
        montant: payment.montant,
        dateMaj: maintenant,
      };
      await order.save();

      try {
        await notifierCommandeConfirmee(order);
      } catch (err) {
        console.error("Échec de l'envoi de la confirmation de commande :", err);
      }
    }
  } else if (statutFournisseur === "failed" || statutFournisseur === "no paid") {
    payment.statut = "echoue";

    if (order && order.statut === "EN_ATTENTE_PAIEMENT") {
      order.statut = "PAIEMENT_ECHOUE";
      order.statusHistory.push({ statut: "PAIEMENT_ECHOUE", date: maintenant });
      if (order.paiement) {
        order.paiement.statut = "echoue";
        order.paiement.dateMaj = maintenant;
      }
      await order.save();
    }
  }
  // "pending" — rien à appliquer, la commande reste en attente.

  await payment.save();
  return payment;
}

/**
 * Marque un paiement resté sans confirmation trop longtemps comme expiré (section 6.4).
 * Vérification effectuée à la demande (polling du statut) faute d'infrastructure de tâches
 * planifiées en MVP — un vrai job récurrent serait préférable à terme.
 */
export async function expirerPaiementSiDepasse(
  payment: PaymentHydrated,
  delaiMs: number
): Promise<PaymentHydrated> {
  if (STATUTS_PAIEMENT_TERMINAUX.includes(payment.statut ?? "")) {
    return payment;
  }
  const cree = payment.get("createdAt") as Date | undefined;
  if (!cree || Date.now() - cree.getTime() < delaiMs) {
    return payment;
  }

  payment.statut = "expire";
  await payment.save();

  const order = (await Order.findById(payment.order)) as OrderHydrated | null;
  if (order && order.statut === "EN_ATTENTE_PAIEMENT") {
    order.statut = "PAIEMENT_ECHOUE";
    order.statusHistory.push({
      statut: "PAIEMENT_ECHOUE",
      date: new Date(),
      commentaire: "Paiement expiré (délai dépassé sans confirmation).",
    });
    if (order.paiement) {
      order.paiement.statut = "expire";
      order.paiement.dateMaj = new Date();
    }
    await order.save();
  }

  return payment;
}
