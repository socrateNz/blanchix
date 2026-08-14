import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import CatalogItem from "@/models/CatalogItem";

export async function GET() {
  await dbConnect();

  const items = await CatalogItem.find({ actif: true })
    .sort({ ordreAffichage: 1, nom: 1 })
    .select("nom prixUnitaire categorie ordreAffichage")
    .lean();

  return NextResponse.json(
    items.map((item) => ({
      id: String(item._id),
      nom: item.nom,
      prixUnitaire: item.prixUnitaire,
      categorie: item.categorie,
    }))
  );
}
