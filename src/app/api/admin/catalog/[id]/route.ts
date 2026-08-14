import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import CatalogItem from "@/models/CatalogItem";

const updateSchema = z.object({
  nom: z.string().trim().min(1).optional(),
  prixUnitaire: z.number().min(0).optional(),
  categorie: z.string().trim().optional(),
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
  const item = await CatalogItem.findById(id);
  if (!item) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  const ancienneValeur = {
    nom: item.nom,
    prixUnitaire: item.prixUnitaire,
    categorie: item.categorie,
    actif: item.actif,
    ordreAffichage: item.ordreAffichage,
  };

  Object.assign(item, parsed.data, { modifiePar: user!.id });
  await item.save();

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "modification_article",
    cibleType: "CatalogItem",
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
  const item = await CatalogItem.findByIdAndDelete(id);
  if (!item) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "suppression_article",
    cibleType: "CatalogItem",
    cibleId: id,
    ancienneValeur: { nom: item.nom, prixUnitaire: item.prixUnitaire },
  });

  return NextResponse.json({ ok: true });
}
