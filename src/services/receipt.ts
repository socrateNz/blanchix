import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatFCFA } from "@/lib/utils";
import { DELAI_LABELS, type Delai } from "@/lib/pricing-constants";
import { MOYEN_PAIEMENT_LABELS } from "@/lib/paiement";

// formatFCFA() utilise le séparateur de milliers "espace fine insécable" (U+202F) de la
// locale fr-FR, que la police WinAnsi standard de pdf-lib ne sait pas encoder — on la
// remplace par une espace normale pour tout texte destiné au PDF.
function formatFCFAPdf(montant: number): string {
  return formatFCFA(montant).replace(/ /g, " ");
}

export interface ReceiptOrder {
  numero: string;
  createdAt: Date;
  articles: { nom: string; prixUnitaire: number; quantite: number }[];
  articlesPersonnalises: { nom: string; quantiteEstimee: number; prixPropose?: number | null }[];
  delai: Delai;
  sousTotal: number;
  fraisLivraison: number;
  majorationDelai: number;
  reduction: number;
  total: number;
  paiement?: { methode?: string | null } | null;
}

export interface ReceiptClient {
  nom: string;
  email: string;
  telephone: string;
}

const MARINE = rgb(0 / 255, 40 / 255, 120 / 255);
const ARDOISE = rgb(90 / 255, 107 / 255, 133 / 255);
const ENCRE = rgb(0 / 255, 30 / 255, 100 / 255);
const MARGE = 50;
const LARGEUR_PAGE = 595.28;

/**
 * Reçu PDF généré à la demande (jamais stocké sur disque — régénérable à tout moment depuis
 * la commande enregistrée en base, section 2.4 étape 5). Simple mise en page texte via
 * pdf-lib plutôt qu'un moteur de rendu HTML (Puppeteer), pour rester léger sur un petit VPS
 * (section 15.1).
 */
export async function genererRecuPdf(order: ReceiptOrder, client: ReceiptClient): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([LARGEUR_PAGE, 841.89]);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 841.89 - 50;

  try {
    const logoBytes = await fs.readFile(path.join(process.cwd(), "logo.jpeg"));
    const logoImage = await pdfDoc.embedJpg(logoBytes);
    const dims = logoImage.scale(46 / logoImage.width);
    page.drawImage(logoImage, { x: MARGE, y: y - dims.height + 20, width: dims.width, height: dims.height });
  } catch {
    // Logo optionnel — le reçu reste valide sans lui.
  }

  page.drawText("REÇU DE COMMANDE", { x: MARGE + 60, y, size: 16, font: fontBold, color: MARINE });
  y -= 20;
  page.drawText(order.numero, { x: MARGE + 60, y, size: 11, font: fontRegular, color: ARDOISE });
  y -= 50;

  const infosClient = [
    `Client : ${client.nom}`,
    `Téléphone : ${client.telephone}`,
    `Email : ${client.email}`,
    `Date : ${order.createdAt.toLocaleDateString("fr-FR")}`,
  ];
  for (const ligne of infosClient) {
    page.drawText(ligne, { x: MARGE, y, size: 10.5, font: fontRegular, color: ENCRE });
    y -= 16;
  }
  y -= 16;

  y = dessinerEnTeteTableau(page, fontBold, y);
  y -= 16;

  for (const a of order.articles) {
    y = dessinerLigneArticle(page, fontRegular, y, a.nom, a.quantite, formatFCFAPdf(a.prixUnitaire * a.quantite));
  }
  for (const a of order.articlesPersonnalises) {
    y = dessinerLigneArticle(
      page,
      fontRegular,
      y,
      `${a.nom} (hors catalogue)`,
      a.quantiteEstimee,
      a.prixPropose != null ? formatFCFAPdf(a.prixPropose) : "à confirmer"
    );
  }

  y -= 6;
  page.drawLine({ start: { x: MARGE, y }, end: { x: LARGEUR_PAGE - MARGE, y }, thickness: 1, color: ARDOISE });
  y -= 20;

  const lignesTotal: [string, string][] = [
    ["Sous-total", formatFCFAPdf(order.sousTotal)],
    ["Livraison", formatFCFAPdf(order.fraisLivraison)],
    ["Majoration délai", formatFCFAPdf(order.majorationDelai)],
  ];
  if (order.reduction) lignesTotal.push(["Réduction", `-${formatFCFAPdf(order.reduction)}`]);
  for (const [label, valeur] of lignesTotal) {
    page.drawText(label, { x: 360, y, size: 10, font: fontRegular, color: ARDOISE });
    page.drawText(valeur, { x: 460, y, size: 10, font: fontRegular, color: ENCRE });
    y -= 16;
  }
  page.drawText("Total", { x: 360, y, size: 12, font: fontBold, color: MARINE });
  page.drawText(formatFCFAPdf(order.total), { x: 460, y, size: 12, font: fontBold, color: MARINE });
  y -= 36;

  const methodeLabel = order.paiement?.methode
    ? (MOYEN_PAIEMENT_LABELS[order.paiement.methode] ?? order.paiement.methode)
    : "—";
  page.drawText(`Moyen de paiement : ${methodeLabel}`, { x: MARGE, y, size: 10, font: fontRegular, color: ARDOISE });
  y -= 16;
  page.drawText(`Formule : ${DELAI_LABELS[order.delai]?.label ?? order.delai}`, {
    x: MARGE,
    y,
    size: 10,
    font: fontRegular,
    color: ARDOISE,
  });

  page.drawText("Généré automatiquement par Blanchix — blanchisserie à domicile, Douala.", {
    x: MARGE,
    y: 40,
    size: 8,
    font: fontRegular,
    color: ARDOISE,
  });

  return pdfDoc.save();
}

function dessinerEnTeteTableau(page: PDFPage, font: PDFFont, y: number): number {
  page.drawText("Article", { x: MARGE, y, size: 10, font, color: MARINE });
  page.drawText("Qté", { x: 360, y, size: 10, font, color: MARINE });
  page.drawText("Montant", { x: 460, y, size: 10, font, color: MARINE });
  page.drawLine({ start: { x: MARGE, y: y - 6 }, end: { x: LARGEUR_PAGE - MARGE, y: y - 6 }, thickness: 1, color: ARDOISE });
  return y;
}

function dessinerLigneArticle(
  page: PDFPage,
  font: PDFFont,
  y: number,
  nom: string,
  quantite: number,
  montant: string
): number {
  page.drawText(nom, { x: MARGE, y, size: 10, font, color: ENCRE });
  page.drawText(String(quantite), { x: 360, y, size: 10, font, color: ENCRE });
  page.drawText(montant, { x: 460, y, size: 10, font, color: ENCRE });
  return y - 16;
}
