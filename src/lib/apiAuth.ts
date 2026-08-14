import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { estRoleAdmin } from "@/lib/roles";

/**
 * Vérification d'autorisation pour les routes /api/admin/** — chaque endpoint doit l'appeler
 * lui-même (section 14.2 : le contrôle d'accès réel ne doit jamais reposer uniquement sur
 * src/proxy.ts, qui ne fait qu'une vérification optimiste du JWT).
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { user: null, reponse: NextResponse.json({ error: "Authentification requise." }, { status: 401 }) };
  }
  if (!estRoleAdmin(session.user.role)) {
    return { user: null, reponse: NextResponse.json({ error: "Accès refusé." }, { status: 403 }) };
  }
  return { user: session.user, reponse: null };
}
