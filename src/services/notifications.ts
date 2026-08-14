import mongoose from "mongoose";
import Notification from "@/models/Notification";
import User, { type UserDocument } from "@/models/User";
import type { OrderDocument } from "@/models/Order";
import type { OrderStatus } from "@/lib/orderStatuses";
import { sendMail } from "@/lib/mailer";
import { envoyerPush } from "@/lib/webpush";
import { genererRecuPdf } from "@/services/receipt";
import { buildEmailBienvenue, buildEmailConfirmationCommande, buildEmailStatutCommande } from "@/services/emailTemplates";

type UserHydrated = mongoose.HydratedDocument<UserDocument>;
type OrderHydrated = mongoose.HydratedDocument<OrderDocument>;

/**
 * Envoi générique traçé (collection notifications, section 11.2) — un échec d'envoi n'est
 * jamais remonté à l'appelant : la progression métier de la commande ne doit jamais dépendre
 * du succès d'une notification (section 11.2 — "l'échec d'envoi n'affecte jamais le statut
 * métier"). Pas de file de tâches planifiées en MVP, donc pas de retry différé ici : l'échec
 * est journalisé (statut "failed") pour audit, sans nouvelle tentative automatique.
 */
async function envoyer(params: {
  destinataireId: string;
  evenement: string;
  email: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const notification = await Notification.create({
    destinataire: params.destinataireId,
    evenement: params.evenement,
    canal: "email",
    statut: "pending",
    tentatives: 1,
    contenuResume: params.subject,
  });

  try {
    await sendMail({
      to: params.email,
      subject: params.subject,
      html: params.html,
      text: params.subject,
      attachments: params.attachments,
    });
    notification.statut = "sent";
    notification.dateEnvoi = new Date();
  } catch (err) {
    notification.statut = "failed";
    console.error(`Échec d'envoi de la notification "${params.evenement}" à ${params.email} :`, err);
  }
  await notification.save();
}

/**
 * Notification push complémentaire à l'email (section 11.1 — Push s'ajoute à l'email à partir
 * de la confirmation de paiement, jamais un remplacement). Silencieuse si le client n'a
 * activé les notifications sur aucun appareil.
 */
async function pousserNotification(
  client: UserHydrated,
  evenement: string,
  payload: { title: string; body: string; url: string }
) {
  const abonnements = (client.pushSubscriptions ?? [])
    .filter((s) => s.keys?.p256dh && s.keys?.auth)
    .map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.keys!.p256dh, auth: s.keys!.auth } }));
  if (abonnements.length === 0) return;

  const notification = await Notification.create({
    destinataire: client._id,
    evenement,
    canal: "push",
    statut: "pending",
    tentatives: 1,
    contenuResume: payload.title,
  });

  try {
    const { endpointsInvalides } = await envoyerPush(abonnements, payload);
    notification.statut = "sent";
    notification.dateEnvoi = new Date();
    if (endpointsInvalides.length > 0) {
      await User.updateOne(
        { _id: client._id },
        { $pull: { pushSubscriptions: { endpoint: { $in: endpointsInvalides } } } }
      );
    }
  } catch (err) {
    notification.statut = "failed";
    console.error(`Échec d'envoi push "${evenement}" à ${client.email} :`, err);
  }
  await notification.save();
}

export async function notifierBienvenue(user: UserHydrated): Promise<void> {
  if (user.compteConfirme?.email) return;

  const { subject, html } = buildEmailBienvenue(user);
  await envoyer({ destinataireId: String(user._id), evenement: "creation_compte", email: user.email, subject, html });

  user.compteConfirme = { email: true, telephone: user.compteConfirme?.telephone ?? false, dateConfirmation: new Date() };
  await user.save();
}

export async function notifierCommandeConfirmee(order: OrderHydrated): Promise<void> {
  const client = await User.findById(order.client);
  if (!client) return;

  const pdfBytes = await genererRecuPdf(order, client);
  order.recuPdfUrl = `/api/orders/${order._id}/recu`;
  await order.save();

  const { subject, html } = buildEmailConfirmationCommande(order, client);
  await envoyer({
    destinataireId: String(client._id),
    evenement: "commande_confirmee",
    email: client.email,
    subject,
    html,
    attachments: [{ filename: `${order.numero}.pdf`, content: Buffer.from(pdfBytes) }],
  });

  await pousserNotification(client, "commande_confirmee", {
    title: subject,
    body: "Touchez pour voir le détail de votre commande.",
    url: `/suivi/${order._id}`,
  });
}

export async function notifierChangementStatut(order: OrderHydrated, statut: OrderStatus): Promise<void> {
  const client = await User.findById(order.client);
  if (!client) return;

  const message = buildEmailStatutCommande(order, client, statut);
  if (!message) return;

  await envoyer({
    destinataireId: String(client._id),
    evenement: `statut_${statut.toLowerCase()}`,
    email: client.email,
    subject: message.subject,
    html: message.html,
  });

  await pousserNotification(client, `statut_${statut.toLowerCase()}`, {
    title: message.subject,
    body: "Touchez pour voir le détail de votre commande.",
    url: `/suivi/${order._id}`,
  });
}
