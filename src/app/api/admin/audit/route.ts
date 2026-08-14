import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import AuditLog from "@/models/AuditLog";

export async function GET(request: NextRequest) {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const limit = 30;

  const [total, entrees] = await Promise.all([
    AuditLog.countDocuments(),
    AuditLog.find()
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("utilisateur", "nom email")
      .lean(),
  ]);

  return NextResponse.json({
    total,
    page,
    limit,
    entrees: entrees.map((e) => ({
      id: String(e._id),
      utilisateur: e.utilisateur,
      action: e.action,
      cible: e.cible,
      ancienneValeur: e.ancienneValeur,
      nouvelleValeur: e.nouvelleValeur,
      adresseIP: e.adresseIP,
      date: e.date,
    })),
  });
}
