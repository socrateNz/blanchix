import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/session";
import User from "@/models/User";

const bodySchema = z.object({ endpoint: z.string().url() });

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();
  await User.updateOne(
    { _id: sessionUser.id },
    { $pull: { pushSubscriptions: { endpoint: parsed.data.endpoint } } }
  );

  return NextResponse.json({ ok: true });
}
