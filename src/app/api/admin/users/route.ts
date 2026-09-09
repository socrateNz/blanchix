import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import User from "@/models/User";

function echapperRegex(texte: string) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Liste les comptes clients (role "client" uniquement — livreurs/admins ont leurs propres
 * pages de gestion, voir /admin/livreurs). Le nombre de commandes par client est calculé via
 * $lookup plutôt qu'une requête séparée par ligne (évite un N+1) — le volume de cette
 * application (quelques milliers de clients au plus) rend un $lookup complet largement
 * suffisant, pas besoin d'une agrégation plus économe pour l'instant.
 */
export async function GET(request: NextRequest) {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  const filtre: Record<string, unknown> = { role: "client" };
  if (q) {
    const regex = new RegExp(echapperRegex(q), "i");
    filtre.$or = [{ nom: regex }, { telephone: regex }, { email: regex }];
  }

  const [total, utilisateurs] = await Promise.all([
    User.countDocuments(filtre),
    User.aggregate([
      { $match: filtre },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "client",
          as: "commandes",
        },
      },
      {
        $project: {
          nom: 1,
          telephone: 1,
          email: 1,
          points: 1,
          createdAt: 1,
          nombreCommandes: { $size: "$commandes" },
          totalDepense: { $sum: "$commandes.total" },
        },
      },
    ]),
  ]);

  return NextResponse.json({
    total,
    page,
    limit,
    utilisateurs: utilisateurs.map((u) => ({
      id: String(u._id),
      nom: u.nom,
      telephone: u.telephone,
      email: u.email,
      points: u.points,
      nombreCommandes: u.nombreCommandes,
      totalDepense: u.totalDepense,
      createdAt: u.createdAt,
    })),
  });
}
