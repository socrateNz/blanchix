import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatFCFA(montant: number): string {
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

// Requis par les composants shadcn/ui (src/components/shadcn) pour fusionner proprement
// des classes Tailwind conditionnelles.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
