export type CardElevation = "flat" | "raised";

const ELEVATION: Record<CardElevation, string> = {
  flat: "shadow-sm",
  raised: "shadow-lg",
};

export default function Card({
  children,
  className = "",
  elevation = "flat",
}: {
  children: React.ReactNode;
  className?: string;
  elevation?: CardElevation;
}) {
  return (
    <div className={`rounded-2xl border border-marine/12 bg-white ${ELEVATION[elevation]} ${className}`}>
      {children}
    </div>
  );
}
