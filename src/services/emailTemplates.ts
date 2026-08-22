import { formatFCFA } from "@/lib/utils";
import type { OrderStatus } from "@/lib/orderStatuses";
import type { ReceiptOrder } from "@/services/receipt";

const MARINE = "#002878";
const ARDOISE = "#5A6B85";
const BRUME = "#EAF4FE";

interface EmailBuild {
  subject: string;
  html: string;
}

function wrapperEmail(contenuHtml: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:${BRUME};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRUME};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:${MARINE};padding:20px 28px;">
                <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:.02em;">BLANCHIX</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">${contenuHtml}</td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:${BRUME};font-size:11px;color:${ARDOISE};">
                Blanchix — blanchisserie à domicile, Douala. Cet email est envoyé automatiquement, merci de ne pas y répondre.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildEmailBienvenue(client: { nom: string }): EmailBuild {
  const contenu = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${MARINE};">Bienvenue chez Blanchix, ${client.nom} !</h1>
    <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">
      Votre compte a été créé automatiquement suite à votre première commande. Vous recevrez ici la
      confirmation de vos commandes ainsi que chaque mise à jour importante de leur statut.
    </p>`;
  return { subject: "Bienvenue chez Blanchix", html: wrapperEmail(contenu) };
}

export function buildEmailConfirmationCommande(order: ReceiptOrder, client: { nom: string }): EmailBuild {
  const lignesArticles = order.articles
    .map(
      (a) =>
        `<tr><td style="padding:4px 0;font-size:13px;color:#333333;">${a.nom} × ${a.quantite}</td><td style="padding:4px 0;font-size:13px;color:#333333;text-align:right;">${formatFCFA(a.prixUnitaire * a.quantite)}</td></tr>`
    )
    .join("");

  const contenu = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${MARINE};">Commande confirmée</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.6;">
      Bonjour ${client.nom}, votre commande <strong>${order.numero}</strong> est confirmée. Le reçu est joint à cet email.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lignesArticles}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #dddddd;padding-top:8px;">
      <tr>
        <td style="font-size:14px;font-weight:700;color:${MARINE};">Total</td>
        <td style="font-size:14px;font-weight:700;color:${MARINE};text-align:right;">${formatFCFA(order.total)}</td>
      </tr>
    </table>`;
  return { subject: `Commande ${order.numero} confirmée`, html: wrapperEmail(contenu) };
}

const MESSAGES_STATUT: Partial<Record<OrderStatus, { sujet: string; corps: string }>> = {
  COLLECTEE: {
    sujet: "Votre linge a été collecté",
    corps: "Votre linge a bien été récupéré par notre coursier. Direction l'atelier !",
  },
  EN_LAVAGE: {
    sujet: "Votre linge est en lavage",
    corps: "Votre linge est actuellement en cours de lavage professionnel en atelier.",
  },
  EN_REPASSAGE: {
    sujet: "Votre linge est en repassage",
    corps: "Le lavage est terminé, votre linge est maintenant repassé avec soin.",
  },
  PRETE: {
    sujet: "Votre commande est prête",
    corps: "Votre linge est propre et prêt à être livré.",
  },
  EN_LIVRAISON: {
    sujet: "Votre commande est en livraison",
    corps: "Un coursier est en route pour vous livrer votre linge.",
  },
  LIVREE: {
    sujet: "Votre commande a été livrée",
    corps: "Votre linge propre vous a été livré. Merci de votre confiance !",
  },
  ANNULEE: {
    sujet: "Votre commande a été annulée",
    corps: "Votre commande a été annulée.",
  },
  REMBOURSEE: {
    sujet: "Votre commande a été remboursée",
    corps: "Le remboursement de votre commande a été enregistré.",
  },
};

export function buildEmailAssignationLivreur(
  order: {
    numero: string;
    adresseCollecte: { quartier: string; rue: string };
    adresseLivraison: { quartier: string; rue: string };
  },
  livreur: { prenom?: string | null; nom: string },
  type: "collecte" | "livraison"
): EmailBuild {
  const adresse = type === "collecte" ? order.adresseCollecte : order.adresseLivraison;
  const verbe = type === "collecte" ? "collecter" : "livrer";
  const contenu = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${MARINE};">Nouvelle commande à ${verbe}</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#333333;">Bonjour ${livreur.prenom ?? ""} ${livreur.nom},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.6;">
      La commande <strong>${order.numero}</strong> vous est assignée pour la ${type === "collecte" ? "collecte" : "livraison"}.
    </p>
    <p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">
      Adresse : ${adresse.quartier}, ${adresse.rue}
    </p>`;
  return { subject: `Commande ${order.numero} à ${verbe}`, html: wrapperEmail(contenu) };
}

export function buildEmailStatutCommande(
  order: { numero: string },
  client: { nom: string },
  statut: OrderStatus
): EmailBuild | null {
  const message = MESSAGES_STATUT[statut];
  if (!message) return null;

  const contenu = `
    <h1 style="margin:0 0 12px;font-size:20px;color:${MARINE};">${message.sujet}</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#333333;">Bonjour ${client.nom},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.6;">${message.corps}</p>
    <p style="margin:0;font-size:12px;color:${ARDOISE};font-family:monospace;">${order.numero}</p>`;
  return { subject: message.sujet, html: wrapperEmail(contenu) };
}
