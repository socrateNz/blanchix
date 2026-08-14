import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import Order from "@/models/Order";
import User from "@/models/User";

function echapperRegex(texte: string) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const statut = searchParams.get("statut");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  const filtre: Record<string, unknown> = {};
  if (statut) filtre.statut = statut;

  if (q) {
    const regex = new RegExp(echapperRegex(q), "i");
    const clients = await User.find({ $or: [{ nom: regex }, { telephone: regex }] }).select("_id");
    filtre.$or = [{ numero: regex }, { client: { $in: clients.map((c) => c._id) } }];
  }

  const [total, commandes] = await Promise.all([
    Order.countDocuments(filtre),
    Order.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("client", "nom telephone email")
      .lean(),
  ]);

  return NextResponse.json({
    total,
    page,
    limit,
    commandes: commandes.map((o) => ({
      id: String(o._id),
      numero: o.numero,
      statut: o.statut,
      client: o.client,
      total: o.total,
      delai: o.delai,
      createdAt: o.createdAt,
    })),
  });
}
