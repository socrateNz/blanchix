import type { NextRequest } from "next/server";
import AuditLog from "@/models/AuditLog";

/**
 * Journalisation des actions administratives sensibles (section 13 du cahier des charges).
 */
export async function logAudit(params: {
  request: NextRequest;
  utilisateurId: string;
  action: string;
  cibleType: string;
  cibleId?: string;
  ancienneValeur?: unknown;
  nouvelleValeur?: unknown;
}) {
  await AuditLog.create({
    utilisateur: params.utilisateurId,
    action: params.action,
    cible: { type: params.cibleType, id: params.cibleId },
    ancienneValeur: params.ancienneValeur,
    nouvelleValeur: params.nouvelleValeur,
    adresseIP: params.request.headers.get("x-forwarded-for") ?? params.request.headers.get("x-real-ip") ?? null,
  });
}
