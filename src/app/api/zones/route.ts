import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import DeliveryZone from "@/models/DeliveryZone";

export async function GET() {
  await dbConnect();

  const zones = await DeliveryZone.find({ actif: true })
    .sort({ ordreAffichage: 1, nom: 1 })
    .select("nom prix")
    .lean();

  return NextResponse.json(
    zones.map((zone) => ({
      id: String(zone._id),
      nom: zone.nom,
      prix: zone.prix,
    }))
  );
}
