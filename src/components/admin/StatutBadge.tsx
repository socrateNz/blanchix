import { STATUT_LABELS, type OrderStatus } from "@/lib/orderStatuses";

type Tone = "neutre" | "attente" | "progression" | "succes" | "alerte";

const TONE_CLASSES: Record<string, string> = {
  neutre: "bg-ardoise/10 text-ardoise",
  attente: "bg-attente/15 text-marine",
  progression: "bg-bleu/15 text-marine",
  succes: "bg-succes/15 text-succes",
  alerte: "bg-alerte/15 text-alerte",
};

/**
 * `labels` permet de réutiliser ce badge pour un autre référentiel que STATUT_LABELS (ex. les
 * statuts affichés simplifiés commande/paiement dans src/lib/orderStatuses.ts et
 * src/lib/paiement.ts) sans dupliquer le rendu.
 */
export default function StatutBadge({
  statut,
  labels,
}: {
  statut: OrderStatus | string;
  labels?: Record<string, { label: string; tone: Tone }>;
}) {
  const referentiel: Record<string, { label: string; tone: Tone }> = labels ?? STATUT_LABELS;
  const info = referentiel[statut] ?? { label: statut, tone: "neutre" as const };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs font-semibold ${TONE_CLASSES[info.tone]}`}
    >
      {info.label}
    </span>
  );
}
