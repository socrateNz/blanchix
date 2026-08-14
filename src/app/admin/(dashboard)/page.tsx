import { dbConnect } from "@/lib/mongodb";
import { getKpis } from "@/services/kpis";
import { formatFCFA } from "@/lib/utils";
import StatTile from "@/components/admin/StatTile";

export default async function AdminDashboardPage() {
  await dbConnect();
  const kpis = await getKpis();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-marine">Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Chiffre d'affaires" value={formatFCFA(kpis.chiffreAffaires)} />
        <StatTile label="Commandes du jour" value={String(kpis.commandesDuJour)} />
        <StatTile label="En attente de paiement" value={String(kpis.commandesEnAttente)} />
        <StatTile label="En cours (collecte → prête)" value={String(kpis.commandesEnCours)} />
        <StatTile label="Livrées (total)" value={String(kpis.commandesLivrees)} />
        <StatTile label="Collectes du jour" value={String(kpis.collectesDuJour)} />
        <StatTile label="Livraisons du jour" value={String(kpis.livraisonsDuJour)} />
        <StatTile label="Paiements réussis" value={String(kpis.paiementsReussis)} tone="succes" />
        <StatTile label="Paiements échoués" value={String(kpis.paiementsEchoues)} tone="alerte" />
        <StatTile label="Clients actifs (30j)" value={String(kpis.clientsActifs)} />
      </div>
    </div>
  );
}
