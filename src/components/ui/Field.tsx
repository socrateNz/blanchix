export const inputClasses =
  "w-full rounded-xl border border-ardoise/15 bg-brume/50 px-4 py-2.5 font-body text-sm text-encre placeholder:text-ardoise/50 transition-colors focus:border-bleu focus:bg-white focus:outline-none focus:ring-2 focus:ring-bleu/20";

export default function Field({
  label,
  error,
  children,
  optional = false,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-body text-sm font-semibold text-marine">
        {label}
        {optional && <span className="ml-1 font-normal text-ardoise/60">(facultatif)</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 font-body text-xs text-alerte">{error}</p>}
    </label>
  );
}
