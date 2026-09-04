import Hero from "@/components/home/Hero";
import Piliers from "@/components/home/Piliers";
import CtaBand from "@/components/home/CtaBand";
import ComptePageContent from "@/components/compte/ComptePageContent";
import { getSessionUser } from "@/lib/session";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export default async function Home() {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    await dbConnect();
    const user = await User.findById(sessionUser.id).lean();
    if (user) return <ComptePageContent user={user} />;
  }

  return (
    <main className="bg-brand-gradient">
      <Hero />
      <div className="rounded-t-4xl bg-brume pb-8">
        <Piliers />
        <CtaBand />
      </div>
    </main>
  );
}
