import { ShoppingBag, PackageSearch, Sparkles, CircleHelp } from "lucide-react";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import DashboardTile from "@/components/compte/DashboardTile";
import DeconnexionButton from "@/components/auth/DeconnexionButton";
import ActiverNotifications from "@/components/pwa/ActiverNotifications";

export default function ComptePageContent({
  user,
}: {
  user: { nom: string; email: string; telephone: string; points: number };
}) {
  return (
    <main className="bg-brand-gradient flex flex-col gap-4">
      <div className="relative px-6 pt-24 text-white">
        <Container className="max-w-2xl px-0">
          <div className="flex items-center gap-3">
            <Avatar nom={user.nom} />
            <div>
              <h1 className="font-display text-xl font-bold">{user.nom}</h1>
              <p className="font-body text-xs text-white/80">{user.email}</p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="max-w-2xl rounded-t-4xl bg-brume py-8">
        <div className="grid grid-cols-2 gap-4">
          <DashboardTile href="/commander" label="Commander" icon={ShoppingBag} />
          <DashboardTile href="/suivi" label="Mes commandes" icon={PackageSearch} />
          <DashboardTile label={`${user.points} points`} icon={Sparkles} />
          <DashboardTile href="/comment-ca-marche" label="Aide" icon={CircleHelp} />
        </div>

        <Card className="mt-6 p-6">
          <h2 className="font-body text-sm font-semibold text-marine">Mes informations</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 font-body text-sm">
            <dt className="text-ardoise">Téléphone</dt>
            <dd className="text-right text-encre">{user.telephone}</dd>
            <dt className="text-ardoise">Points de fidélité</dt>
            <dd className="text-right font-mono text-encre">{user.points}</dd>
          </dl>
        </Card>

        <Card className="mt-4 flex items-center gap-2 p-6">
          <ActiverNotifications />
          <DeconnexionButton />
        </Card>
      </Container>
    </main>
  );
}
