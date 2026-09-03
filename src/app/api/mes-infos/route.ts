import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/session";
import User from "@/models/User";

/**
 * Coordonnées du client connecté — utilisé pour préremplir l'étape "Vos informations" du
 * tunnel de commande (voir commander/informations/page.tsx), pas exposé plus largement.
 */
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(sessionUser.id).select("nom telephone email whatsapp").lean();
  if (!user) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    nom: user.nom,
    telephone: user.telephone,
    email: user.email,
    whatsapp: user.whatsapp ?? "",
  });
}
