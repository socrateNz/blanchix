"use client";

import { usePathname } from "next/navigation";

const ETAPES = [
  { slug: "informations", label: "Informations" },
  { slug: "adresse", label: "Adresse" },
  { slug: "panier", label: "Panier" },
  { slug: "delai", label: "Délai" },
  { slug: "paiement", label: "Paiement" },
];

export default function WizardStepper() {
  const pathname = usePathname();
  const currentIndex = ETAPES.findIndex((e) => pathname?.includes(e.slug));

  return (
    <ol className="flex items-center justify-between gap-2">
      {ETAPES.map((etape, index) => {
        const statut = index < currentIndex ? "fait" : index === currentIndex ? "en_cours" : "a_venir";
        return (
          <li key={etape.slug} className="flex flex-1 flex-col items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold transition-colors ${
                statut === "en_cours"
                  ? "bg-brand-gradient text-white shadow-sm"
                  : statut === "fait"
                    ? "bg-marine text-white"
                    : "bg-brume text-ardoise/60"
              }`}
            >
              {index + 1}
            </span>
            <span
              className={`hidden text-center font-body text-xs sm:block ${
                statut === "a_venir" ? "text-ardoise/60" : "text-marine font-medium"
              }`}
            >
              {etape.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
