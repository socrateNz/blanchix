import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import DeliverySlot from "@/models/DeliverySlot";

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type !== "collecte" && type !== "livraison") {
    return NextResponse.json(
      { error: "Le paramètre 'type' doit valoir 'collecte' ou 'livraison'." },
      { status: 400 }
    );
  }

  const slots = await DeliverySlot.find({
    type,
    statut: { $ne: "bloque" },
    date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
  })
    .sort({ date: 1, plageHoraire: 1 })
    .lean();

  return NextResponse.json(
    slots.map((slot) => ({
      id: String(slot._id),
      date: slot.date,
      plageHoraire: slot.plageHoraire,
      placesRestantes: Math.max(0, slot.capaciteMax - slot.reserves),
      complet: slot.statut === "complet" || slot.reserves >= slot.capaciteMax,
    }))
  );
}
