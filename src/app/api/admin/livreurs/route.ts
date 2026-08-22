import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { logAudit } from "@/services/audit";
import User from "@/models/User";

export async function GET() {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  const livreurs = await User.find({ role: "livreur" }).sort({ nom: 1 }).lean();

  return NextResponse.json(
    livreurs.map((l) => ({
      id: String(l._id),
      nom: l.nom,
      prenom: l.prenom ?? "",
      email: l.email,
      whatsapp: l.whatsapp,
    }))
  );
}

const createSchema = z.object({
  prenom: z.string().trim().min(1, "Le prénom est requis."),
  nom: z.string().trim().min(1, "Le nom est requis."),
  email: z.string().trim().toLowerCase().email("Email invalide."),
  whatsapp: z.string().trim().min(8, "Numéro WhatsApp invalide."),
});

export async function POST(request: NextRequest) {
  const { user, reponse } = await requireAdmin();
  if (reponse) return reponse;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();

  const existant = await User.findOne({ email: parsed.data.email });
  if (existant) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
  }

  const livreur = await User.create({
    nom: parsed.data.nom,
    prenom: parsed.data.prenom,
    email: parsed.data.email,
    whatsapp: parsed.data.whatsapp,
    // Le modèle User exige un téléphone — les livreurs n'ont qu'un numéro WhatsApp saisi ici,
    // qui est aussi un numéro de téléphone valide, donc réutilisé pour ce champ.
    telephone: parsed.data.whatsapp,
    role: "livreur",
  });

  await logAudit({
    request,
    utilisateurId: user!.id,
    action: "creation_livreur",
    cibleType: "User",
    cibleId: String(livreur._id),
    nouvelleValeur: { nom: parsed.data.nom, prenom: parsed.data.prenom, email: parsed.data.email },
  });

  return NextResponse.json({ id: String(livreur._id) }, { status: 201 });
}
