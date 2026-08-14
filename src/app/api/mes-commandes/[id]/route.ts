import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/session";
import Order from "@/models/Order";
// Import nécessaire même si non utilisé directement ici : enregistre le schéma "DeliverySlot"
// auprès de mongoose, requis par les .populate("creneauCollecte"/"creneauLivraison") ci-dessous
// (le ref d'Order ne suffit pas — sans cet import, MissingSchemaError si aucune autre route
// n'a déjà chargé ce modèle dans le même process).
import "@/models/DeliverySlot";

/** Détail d'une commande — vérifie que la commande appartient bien au client connecté. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;

  const order = await Order.findById(id).populate("creneauCollecte").populate("creneauLivraison").lean();
  if (!order || String(order.client) !== sessionUser.id) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ...order, id: String(order._id) });
}
