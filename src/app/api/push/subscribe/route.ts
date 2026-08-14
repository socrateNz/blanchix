import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/session";
import { pushSubscriptionSchema } from "@/schemas/pushSubscription.schema";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const parsed = pushSubscriptionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await dbConnect();

  // Retire un abonnement existant avec le même endpoint avant de le réinsérer, pour éviter
  // les doublons si le navigateur régénère les mêmes clés (ex. reconnexion sur le même appareil).
  await User.updateOne(
    { _id: sessionUser.id },
    { $pull: { pushSubscriptions: { endpoint: parsed.data.endpoint } } }
  );
  await User.updateOne({ _id: sessionUser.id }, { $push: { pushSubscriptions: parsed.data } });

  return NextResponse.json({ ok: true });
}
