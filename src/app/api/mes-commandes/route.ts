import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/session";
import Order from "@/models/Order";

/** Commandes du client connecté — jamais celles d'un autre client (section 14.2). */
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  await dbConnect();

  const orders = await Order.find({ client: sessionUser.id })
    .sort({ createdAt: -1 })
    .select("numero statut total createdAt")
    .lean();

  return NextResponse.json(
    orders.map((o) => ({
      id: String(o._id),
      numero: o.numero,
      statut: o.statut,
      total: o.total,
      createdAt: o.createdAt,
    }))
  );
}
