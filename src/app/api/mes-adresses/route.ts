import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/session";
import { adresseUserSchema } from "@/schemas/adresse.schema";
import User, { type UserDocument } from "@/models/User";
import DeliveryZone from "@/models/DeliveryZone";

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
      zoneId: a.zone ? String(a.zone) : undefined,
      zoneNom: a.zoneNom,
      lieuDit: a.lieuDit,
      // quartier/rue : résidences enregistrées avant l'introduction des zones de livraison.
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

  // Jamais confiance au nom de zone envoyé par le client — résolu depuis la zone active en base,
  // comme pour la création de commande.
  const zone = await DeliveryZone.findOne({ _id: parsed.data.zoneId, actif: true });
  if (!zone) {
    return NextResponse.json({ error: "Zone de livraison introuvable ou désactivée." }, { status: 400 });
  }

  await User.updateOne({ _id: sessionUser.id }, { $set: { "adresses.$[].parDefaut": false } });
  await User.updateOne(
    { _id: sessionUser.id },
    {
      $push: {
        adresses: {
          label: parsed.data.label ?? "Résidence",
          zone: zone._id,
          zoneNom: zone.nom,
          lieuDit: parsed.data.lieuDit,
          gps: parsed.data.gps,
          instructions: parsed.data.instructions,
          parDefaut: true,
        },
      },
    }
  );

  return NextResponse.json({ ok: true });
}
