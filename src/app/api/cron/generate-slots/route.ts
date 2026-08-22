import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { genererCreneauxAVenir } from "@/services/slots";

/**
 * Appelée quotidiennement par Vercel Cron (voir vercel.json) pour repousser d'un jour la
 * fenêtre glissante de créneaux ouverts — sans ça, tous les créneaux finissent par passer
 * dans le passé (vécu en prod le 2026-08-20, cf. services/slots.ts). Protégée par CRON_SECRET :
 * Vercel Cron envoie automatiquement `Authorization: Bearer $CRON_SECRET` quand cette variable
 * d'environnement existe sur le projet (convention Vercel Cron Jobs, pas Next.js).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  await dbConnect();
  const count = await genererCreneauxAVenir();

  return NextResponse.json({ ok: true, creneauxTraites: count });
}
