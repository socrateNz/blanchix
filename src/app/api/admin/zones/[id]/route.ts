import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import DeliveryZone from "@/models/DeliveryZone";

const updateSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  prix: z.number().min(0).optional(),
  actif: z.boolean().optional(),
  ordreAffichage: z.number().int().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const { id } = await params;
  const zone = await DeliveryZone.findById(id);
  if (!zone) {
    return NextResponse.json({ error: "Zone introuvable." }, { status: 404 });
  }

  const ancienneValeur = {
    nom: zone.nom,
    prix: zone.prix,
    actif: zone.actif,
    ordreAffichage: zone.ordreAffichage,
  };

  Object.assign(zone, parsed.data);
  await zone.save();

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "modification_zone",
    cibleType: "DeliveryZone",
    cibleId: id,
    ancienneValeur,
    nouvelleValeur: parsed.data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const { id } = await params;
  const zone = await DeliveryZone.findByIdAndDelete(id);
  if (!zone) {
    return NextResponse.json({ error: "Zone introuvable." }, { status: 404 });
  }

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "suppression_zone",
    cibleType: "DeliveryZone",
    cibleId: id,
    ancienneValeur: { nom: zone.nom, prix: zone.prix },
  });

  return NextResponse.json({ ok: true });
}
