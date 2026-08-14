import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import OtpCode from "@/models/OtpCode";
import { sendMail } from "@/lib/mailer";

const bodySchema = z.object({ email: z.string().trim().email("Email invalide.") });

const CODE_VALIDITE_MS = 10 * 60 * 1000;
const DELAI_RENVOI_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  await dbConnect();

  // Le compte client est créé à la première commande (section 7.1) — pas de compte,
  // pas de code. Le message est explicite plutôt que générique : la sensibilité de cette
  // fuite d'information (email existant ou non) est faible pour ce service.
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json(
      { error: "Aucun compte trouvé pour cet email. Passez d'abord une commande pour en créer un." },
      { status: 404 }
    );
  }

  // Anti-spam minimal (section 14.2) : pas de renvoi avant 60s. Une vraie limite par IP
  // nécessiterait une infrastructure de rate limiting distribuée non encore en place.
  const existant = await OtpCode.findOne({ identifiant: email });
  if (existant) {
    const dernierEnvoi = existant.get("updatedAt") as Date;
    if (Date.now() - dernierEnvoi.getTime() < DELAI_RENVOI_MS) {
      return NextResponse.json(
        { error: "Un code a déjà été envoyé récemment. Merci de patienter avant d'en redemander un." },
        { status: 429 }
      );
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);

  await OtpCode.findOneAndUpdate(
    { identifiant: email },
    { codeHash, expiresAt: new Date(Date.now() + CODE_VALIDITE_MS), consomme: false, tentatives: 0 },
    { upsert: true }
  );

  try {
    await sendMail({
      to: email,
      subject: "Votre code de connexion Blanchix",
      html: `<p>Votre code de connexion Blanchix est <strong>${code}</strong>.</p><p>Il expire dans 10 minutes.</p>`,
      text: `Votre code de connexion Blanchix est ${code}. Il expire dans 10 minutes.`,
    });
  } catch (err) {
    console.error("Échec d'envoi du code de connexion :", err);
    return NextResponse.json(
      { error: "Impossible d'envoyer le code pour le moment. Merci de réessayer." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
