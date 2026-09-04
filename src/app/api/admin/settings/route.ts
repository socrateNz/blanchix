import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import { getSettings } from "@/services/settings";

export async function GET() {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const settings = await getSettings();

  return NextResponse.json({
    commandeMinimale: settings.commandeMinimale,
    livraisonGratuiteActive: settings.livraisonGratuiteActive,
    livraisonGratuiteSeuil: settings.livraisonGratuiteSeuil,
  });
}

const updateSchema = z.object({
  commandeMinimale: z.number().min(0).optional(),
  livraisonGratuiteActive: z.boolean().optional(),
  livraisonGratuiteSeuil: z.number().min(0).optional(),
});

export async function PATCH(request: NextRequest) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const settings = await getSettings();
  const ancienneValeur = {
    commandeMinimale: settings.commandeMinimale,
    livraisonGratuiteActive: settings.livraisonGratuiteActive,
    livraisonGratuiteSeuil: settings.livraisonGratuiteSeuil,
  };

  Object.assign(settings, parsed.data);
  await settings.save();

  // Pas de cibleId : Settings est un singleton (_id "global", pas un ObjectId) — AuditLog.cible.id
  // attend un ObjectId, et il n'y a de toute façon rien à désambiguïser ici.
  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "modification_reglages",
    cibleType: "Settings",
    ancienneValeur,
    nouvelleValeur: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
