import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

/**
 * Vérification côté serveur de la session — à utiliser dans chaque page/route protégée en
 * complément de src/proxy.ts (section 14.2 : le contrôle d'accès réel ne doit jamais reposer
 * uniquement sur le proxy).
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
