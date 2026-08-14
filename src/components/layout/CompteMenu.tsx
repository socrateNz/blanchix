"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShoppingBag, CircleUserRound, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import Avatar from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Coin droit du header desktop — Client Component (useSession, cf. CompteIcon.tsx pour la
 * même raison côté mobile : ne pas rendre tout le site dynamique pour ce seul coin
 * personnalisé). Visiteur non connecté → bouton Se connecter. Connecté → menu déroulant
 * regroupant Commander/Mon compte/Se déconnecter, plutôt que plusieurs boutons séparés.
 */
export default function CompteMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <Link href="/connexion" className={buttonClasses("primary", "!px-5 !py-2.5 text-xs sm:text-sm")}>
        Se connecter
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan">
        <Avatar nom={session.user.name ?? "?"} size="sm" />
        <span className="font-body text-sm text-encre">{session.user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>
          <p className="font-body text-sm font-semibold text-marine">{session.user.name}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/commander">
            <ShoppingBag /> Commander
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/compte">
            <CircleUserRound /> Mon compte
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => signOut({ callbackUrl: "/" })}>
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
