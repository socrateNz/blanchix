import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import ComptePageContent from "@/components/compte/ComptePageContent";

export default async function ComptePage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/connexion");
  }

  await dbConnect();
  const user = await User.findById(sessionUser.id).lean();
  if (!user) {
    redirect("/connexion");
  }

  return <ComptePageContent user={user} />;
}
