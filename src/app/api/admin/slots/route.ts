import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import DeliverySlot from "@/models/DeliverySlot";

export async function GET(request: NextRequest) {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const type = request.nextUrl.searchParams.get("type");
  const filtre: Record<string, unknown> = {};
  if (type === "collecte" || type === "livraison") filtre.type = type;

  const slots = await DeliverySlot.find(filtre)
    .sort({ date: 1, plageHoraire: 1 })
    .lean();

  return NextResponse.json(
    slots.map((s) => ({
      id: String(s._id),
      date: s.date,
      plageHoraire: s.plageHoraire,
      type: s.type,
      capaciteMax: s.capaciteMax,
      reserves: s.reserves,
      statut: s.statut,
    }))
  );
}

// "livraison" retiré ici : plus aucun créneau de livraison n'est planifiable (seule la
// collecte l'est désormais) — le type reste accepté par le schéma DeliverySlot et par le
// filtre GET ci-dessus pour ne pas invalider les créneaux de livraison déjà existants.
const createSchema = z.object({
  date: z.string().min(1),
  plageHoraire: z.string().trim().min(1),
  type: z.enum(["collecte"]),
  capaciteMax: z.number().int().min(1),
});

export async function POST(request: NextRequest) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  let slot;
  try {
    slot = await DeliverySlot.create({
      date: new Date(parsed.data.date),
      plageHoraire: parsed.data.plageHoraire,
      type: parsed.data.type,
      capaciteMax: parsed.data.capaciteMax,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return NextResponse.json({ error: "Ce créneau existe déjà (même date, plage et type)." }, { status: 409 });
    }
    throw err;
  }

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "creation_creneau",
    cibleType: "DeliverySlot",
    cibleId: String(slot._id),
    nouvelleValeur: parsed.data,
  });

  return NextResponse.json({ id: String(slot._id) }, { status: 201 });
}
