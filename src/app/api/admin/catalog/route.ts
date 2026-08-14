import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import CatalogItem from "@/models/CatalogItem";

export async function GET() {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const items = await CatalogItem.find().sort({ ordreAffichage: 1, nom: 1 }).lean();

  return NextResponse.json(
    items.map((item) => ({
      id: String(item._id),
      nom: item.nom,
      prixUnitaire: item.prixUnitaire,
      categorie: item.categorie,
      actif: item.actif,
      ordreAffichage: item.ordreAffichage,
    }))
  );
}

const createSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis."),
  prixUnitaire: z.number().min(0, "Le prix ne peut pas être négatif."),
  categorie: z.string().trim().optional(),
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
  const item = await CatalogItem.create({
    ...parsed.data,
    creePar: user!.id,
    modifiePar: user!.id,
  });

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "creation_article",
    cibleType: "CatalogItem",
    cibleId: String(item._id),
    nouvelleValeur: parsed.data,
  });

  return NextResponse.json({ id: String(item._id) }, { status: 201 });
}
