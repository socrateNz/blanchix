const TONE_DOT: Record<"neutre" | "succes" | "alerte", string> = {
  neutre: "bg-bleu",
  succes: "bg-succes",
  alerte: "bg-alerte",
};

export default function StatTile({
  label,
  value,
  tone = "neutre",
}: {
  label: string;
  value: string;
  tone?: "neutre" | "succes" | "alerte";
}) {
  return (
    <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />
        <span className="font-body text-xs font-medium text-ardoise">{label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-marine">{value}</p>
    </div>
  );
}
