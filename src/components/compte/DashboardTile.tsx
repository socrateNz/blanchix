import Link from "next/link";
import type { LucideIcon } from "lucide-react";

function Contenu({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bleu/10 text-bleu">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="font-body text-xs font-semibold text-marine">{label}</span>
    </>
  );
}

const CLASSES =
  "flex flex-col items-center justify-center gap-2 rounded-2xl border border-marine/12 bg-white py-6 shadow-sm transition-shadow hover:shadow-md";

export default function DashboardTile({
  href,
  label,
  icon,
}: {
  href?: string;
  label: string;
  icon: LucideIcon;
}) {
  if (!href) {
    return (
      <div className={CLASSES}>
        <Contenu label={label} icon={icon} />
      </div>
    );
  }

  return (
    <Link href={href} className={CLASSES}>
      <Contenu label={label} icon={icon} />
    </Link>
  );
}
