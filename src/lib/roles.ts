import type { USER_ROLES } from "@/models/User";

// Rôles ayant accès au tableau de bord administrateur (cahier des charges section 7.2).
// "livreur" et "client" en sont exclus.
export const ADMIN_ROLES = ["admin", "operateur", "super_admin"] as const satisfies readonly (typeof USER_ROLES)[number][];

export function estRoleAdmin(role: string | undefined | null): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
