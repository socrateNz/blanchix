"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { CircleUserRound } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

/**
 * Icône compte du header mobile — Client Component exprès : lit la session côté client
 * (useSession, nécessite le SessionProvider dans Providers.tsx) plutôt que dans Header lui-même,
 * pour que le reste des pages publiques (Header inclus) reste statiquement prérendu au build
 * plutôt que de forcer tout le site en rendu dynamique à cause d'un seul coin d'écran
 * personnalisé (section 16.3 — budget de performance de la page d'accueil).
 */
export default function CompteIcon() {
  const { data: session } = useSession();

  return (
    <Link href={session ? "/compte" : "/connexion"} aria-label="Mon compte">
      {session?.user ? (
        <Avatar nom={session.user.name ?? "?"} size="md" />
      ) : (
        <CircleUserRound className="h-10 w-10 text-marine" strokeWidth={1.6} />
      )}
    </Link>
  );
}
