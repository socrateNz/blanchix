import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ADMIN_ROLES } from "@/lib/roles";

/**
 * Remplace middleware.ts en Next.js 16 (convention renommée "proxy" — voir
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * Vérification optimiste uniquement (lecture du JWT, pas d'appel base de données) : chaque
 * route/API protégée doit en plus revérifier la session côté serveur (section 14.2 du cahier
 * des charges — le contrôle d'accès ne doit jamais reposer sur ce seul niveau).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // request.url (comme request.nextUrl.origin) reflète l'adresse d'écoute interne du serveur
  // derrière un reverse proxy (ex. 0.0.0.0:3000 en conteneur Docker), pas l'adresse publique
  // réelle — même bug que celui trouvé dans /api/payments/initiate. NEXTAUTH_URL est la source
  // fiable pour construire une redirection absolue correcte.
  const base = process.env.NEXTAUTH_URL;

  if (pathname.startsWith("/admin") && pathname !== "/admin/connexion") {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !(ADMIN_ROLES as readonly string[]).includes(token.role)) {
      return NextResponse.redirect(new URL("/admin/connexion", base));
    }
  }

  if (pathname.startsWith("/compte")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/connexion", base));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/compte/:path*"],
};
