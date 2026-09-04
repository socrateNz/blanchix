import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSettings } from "@/services/settings";

// Lecture publique — le client a besoin de ces valeurs pour afficher "minimum X FCFA" /
// "livraison offerte dès Y FCFA" pendant le tunnel de commande, avant même d'être authentifié.
export async function GET() {
  await dbConnect();
  const settings = await getSettings();

  return NextResponse.json({
    commandeMinimale: settings.commandeMinimale,
    livraisonGratuiteActive: settings.livraisonGratuiteActive,
    livraisonGratuiteSeuil: settings.livraisonGratuiteSeuil,
  });
}
