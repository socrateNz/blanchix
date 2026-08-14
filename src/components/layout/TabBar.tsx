"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PackageSearch, ShoppingBag } from "lucide-react";
import { vibrer } from "@/lib/haptics";

type Slot = "accueil" | "commander" | "suivi";

const ONGLETS: { slot: Slot; href: string; label: string; icon: typeof Home; cx: number }[] = [
  { slot: "accueil", href: "/", label: "Accueil", icon: Home, cx: 17 },
  { slot: "commander", href: "/commander", label: "Commander", icon: ShoppingBag, cx: 50 },
  { slot: "suivi", href: "/suivi", label: "Suivi", icon: PackageSearch, cx: 83 },
];

const REST_Y = 12;
const CORNER = 2;

// Même profondeur que Commander pour Accueil/Suivi — seule la largeur diffère, contrainte par
// la place disponible entre le centre de l'onglet (cx=17/83) et le bord arrondi de la barre
// (CORNER) : impossible d'aller aussi large qu'au centre sans repositionner les onglets, ce qui
// décalerait la bulle par rapport à sa position à plat et casserait la continuité de l'anim.
// `null` (aucun onglet actif) aplati au même niveau que le reste du bord — mêmes commandes de
// tracé dans tous les cas pour que la transition CSS `d` interpole en douceur, sans "sauter".
function profil(slot: Slot | null) {
  if (slot === "commander") return { half: 22, depth: 50 };
  if (slot === null) return { half: 0, depth: REST_Y };
  return { half: 15, depth: 50 };
}

function construirePath(slot: Slot | null) {
  const cx = slot ? ONGLETS.find((o) => o.slot === slot)!.cx : 50;
  const { half, depth } = profil(slot);
  const gauche = cx - half;
  const droite = cx + half;
  const c1 = gauche + half * 0.36;
  const c2 = cx - half * 0.73;
  const c3 = cx + half * 0.73;
  const c4 = droite - half * 0.36;
  return `M0,28 Q0,${REST_Y} ${CORNER},${REST_Y} L${gauche},${REST_Y} C${c1},${REST_Y} ${c2},${depth} ${cx},${depth} C${c3},${depth} ${c4},${REST_Y} ${droite},${REST_Y} L${100 - CORNER},${REST_Y} Q100,${REST_Y} 100,28 L100,72 L0,72 Z`;
}

function estActifPour(slot: Slot, pathname: string | null): boolean {
  if (slot === "accueil") return pathname === "/";
  if (slot === "commander") return !!pathname?.startsWith("/commander");
  return !!pathname?.startsWith("/suivi");
}

function OngletPlat({ href, label, Icon }: { href: string; label: string; Icon: typeof Home }) {
  return (
    <Link
      href={href}
      onClick={() => vibrer(8)}
      className="flex flex-1 flex-col items-center gap-0.5 font-body text-[11px] font-medium text-white/60 transition-colors"
    >
      <Icon className="h-5 w-5" strokeWidth={1.8} />
      {label}
    </Link>
  );
}

/**
 * Navigation basse : le creux + la bulle surélevée suivent l'onglet actuellement actif
 * (Accueil / Commander / Suivi), avec transition animée (SVG `d` + position) au changement de
 * page. En dehors de ces 3 sections (/connexion, /compte…) la barre redevient plate, aucun
 * onglet mis en avant — comportement demandé par l'utilisateur, à valider une fois vu en vrai.
 */
export default function TabBar() {
  const pathname = usePathname();
  const actif = ONGLETS.find((o) => estActifPour(o.slot, pathname))?.slot ?? null;
  const cible = ONGLETS.find((o) => o.slot === actif) ?? ONGLETS[1];
  const CibleIcon = cible.icon;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative h-[72px]">
        <svg
          viewBox="0 0 100 72"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full drop-shadow-[0_-2px_12px_rgba(0,40,120,0.12)]"
        >
          <path d={construirePath(actif)} className="fill-bleu transition-[d] duration-300 ease-out" />
        </svg>

        <nav className="absolute inset-x-0 top-[16px] flex h-[56px] items-start">
          {ONGLETS.map((o) =>
            o.slot === actif ? (
              <div key={o.slot} className="flex-1" />
            ) : (
              <OngletPlat key={o.slot} href={o.href} label={o.label} Icon={o.icon} />
            )
          )}
        </nav>

        <Link
          href={cible.href}
          onClick={() => vibrer(actif === "commander" || !actif ? [8, 20, 8] : 8)}
          aria-label={cible.label}
          style={{ left: `${cible.cx}%` }}
          className={`absolute top-[8px] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_8px_20px_rgba(0,80,195,0.4)] transition-all duration-300 ease-out ${
            actif && actif !== "commander"
              ? "h-[48px] w-[48px] bg-white text-bleu ring-4 ring-white/60"
              : "bg-brand-gradient h-[60px] w-[60px] text-white ring-4 ring-white/90"
          } ${actif ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
        >
          <CibleIcon className={actif && actif !== "commander" ? "h-5 w-5" : "h-6 w-6"} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
