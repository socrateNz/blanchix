import { STATUT_LABELS, type OrderStatus } from "@/lib/orderStatuses";

const TONE_CLASSES: Record<string, string> = {
  neutre: "bg-ardoise/10 text-ardoise",
  attente: "bg-attente/15 text-marine",
  progression: "bg-bleu/15 text-marine",
  succes: "bg-succes/15 text-succes",
  alerte: "bg-alerte/15 text-alerte",
};

export default function StatutBadge({ statut }: { statut: OrderStatus | string }) {
  const info = STATUT_LABELS[statut as OrderStatus] ?? { label: statut, tone: "neutre" as const };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-xs font-semibold ${TONE_CLASSES[info.tone]}`}
    >
      {info.label}
    </span>
  );
}
