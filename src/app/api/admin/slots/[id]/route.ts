import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import DeliverySlot from "@/models/DeliverySlot";

const updateSchema = z.object({
  capaciteMax: z.number().int().min(1).optional(),
  statut: z.enum(["ouvert", "complet", "bloque"]).optional(),
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
  const slot = await DeliverySlot.findById(id);
  if (!slot) {
    return NextResponse.json({ error: "Créneau introuvable." }, { status: 404 });
  }

  const ancienneValeur = { capaciteMax: slot.capaciteMax, statut: slot.statut };
  Object.assign(slot, parsed.data);
  await slot.save();

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "modification_creneau",
    cibleType: "DeliverySlot",
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
  const slot = await DeliverySlot.findById(id);
  if (!slot) {
    return NextResponse.json({ error: "Créneau introuvable." }, { status: 404 });
  }
  if (slot.reserves > 0) {
    return NextResponse.json(
      { error: "Ce créneau a des commandes associées, il ne peut pas être supprimé (bloquez-le à la place)." },
      { status: 409 }
    );
  }

  await slot.deleteOne();

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "suppression_creneau",
    cibleType: "DeliverySlot",
    cibleId: id,
    ancienneValeur: { date: slot.date, plageHoraire: slot.plageHoraire, type: slot.type },
  });

  return NextResponse.json({ ok: true });
}
