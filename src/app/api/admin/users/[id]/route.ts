import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import User, { type UserDocument } from "@/models/User";
import Order from "@/models/Order";

type AdresseUser = UserDocument["adresses"][number];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const { id } = await params;

  const user = await User.findOne({ _id: id, role: "client" }).lean();
  if (!user) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  const commandes = await Order.find({ client: id })
    .sort({ createdAt: -1 })
    .select("numero statut total createdAt")
    .lean();

  return NextResponse.json({
    id: String(user._id),
    nom: user.nom,
    telephone: user.telephone,
    email: user.email,
    whatsapp: user.whatsapp,
    points: user.points,
    createdAt: user.createdAt,
    adresses: (user.adresses ?? []).map((a: AdresseUser) => ({
      id: String(a._id),
      label: a.label,
      zoneNom: a.zoneNom,
      lieuDit: a.lieuDit,
      quartier: a.quartier,
      rue: a.rue,
      instructions: a.instructions,
      parDefaut: a.parDefaut,
    })),
    commandes: commandes.map((o) => ({
      id: String(o._id),
      numero: o.numero,
      statut: o.statut,
      total: o.total,
      createdAt: o.createdAt,
    })),
  });
}
