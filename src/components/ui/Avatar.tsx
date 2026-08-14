function getInitiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

const TAILLES: Record<"sm" | "md", string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
};

export default function Avatar({ nom, size = "md" }: { nom: string; size?: "sm" | "md" }) {
  return (
    <span
      className={`bg-brand-gradient inline-flex ${TAILLES[size]} shrink-0 items-center justify-center rounded-full font-display font-bold text-white`}
    >
      {getInitiales(nom)}
    </span>
  );
}
