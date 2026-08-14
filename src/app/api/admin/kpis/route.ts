import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/apiAuth";
import { getKpis } from "@/services/kpis";

export async function GET() {
  const { reponse } = await requireAdmin();
  if (reponse) return reponse;

  await dbConnect();
  return NextResponse.json(await getKpis());
}
