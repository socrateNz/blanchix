import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/session";
import { adresseUserSchema } from "@/schemas/adresse.schema";
import User, { type UserDocument } from "@/models/User";

type AdresseUser = UserDocument["adresses"][number];

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(sessionUser.id).select("adresses").lean();

  return NextResponse.json(
    (user?.adresses ?? []).map((a: AdresseUser) => ({
      id: String(a._id),
      label: a.label,
      quartier: a.quartier,
      rue: a.rue,
      gps: a.gps,
      instructions: a.instructions,
      parDefaut: a.parDefaut,
    }))
  );
}

/**
 * Ajoute une adresse enregistrée (ex. "résidence") au compte du client — utilisée depuis
 * l'étape adresse du tunnel de commande ("Définir comme ma résidence"). Marquée par défaut
 * puisqu'il n'existe pour l'instant aucune UI pour choisir parmi plusieurs adresses
 * enregistrées : la plus récemment définie par défaut est celle proposée en réutilisation.
 */
export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const parsed = adresseUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();

  await User.updateOne({ _id: sessionUser.id }, { $set: { "adresses.$[].parDefaut": false } });
  await User.updateOne(
    { _id: sessionUser.id },
    { $push: { adresses: { ...parsed.data, label: parsed.data.label ?? "Résidence", parDefaut: true } } }
  );

  return NextResponse.json({ ok: true });
}
