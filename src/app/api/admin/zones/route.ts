import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import DeliveryZone from "@/models/DeliveryZone";

export async function GET() {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const zones = await DeliveryZone.find().sort({ ordreAffichage: 1, nom: 1 }).lean();

  return NextResponse.json(
    zones.map((zone) => ({
      id: String(zone._id),
      nom: zone.nom,
      prix: zone.prix,
      actif: zone.actif,
      ordreAffichage: zone.ordreAffichage,
    }))
  );
}

const createSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis."),
  prix: z.number().min(0, "Le prix ne peut pas être négatif."),
  ordreAffichage: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  const zone = await DeliveryZone.create(parsed.data);

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "creation_zone",
    cibleType: "DeliveryZone",
    cibleId: String(zone._id),
    nouvelleValeur: parsed.data,
  });

  return NextResponse.json({ id: String(zone._id) }, { status: 201 });
}
