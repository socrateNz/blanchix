import Link from "next/link";
import { dbConnect } from "@/lib/mongodb";
import { getDashboard } from "@/services/dashboard";
import { formatFCFA } from "@/lib/utils";
import { DELAI_LABELS, type Delai } from "@/lib/pricing-constants";
import { STATUT_COMMANDE_AFFICHE_LABELS, deriveStatutCommandeAffiche, type OrderStatus } from "@/lib/orderStatuses";
import { STATUT_PAIEMENT_AFFICHE_LABELS, deriveStatutPaiementAffiche } from "@/lib/paiement";
import StatutBadge from "@/components/admin/StatutBadge";
import { Carte, GraphiqueCA, LigneATraiter, ListeBarres, TuileKpi } from "@/components/admin/DashboardBlocs";

// Toujours calculé à la demande : un tableau de bord figé au build n'aurait aucun sens.
export const dynamic = "force-dynamic";

const MOYENS: Record<string, string> = { mobile_money: "Paiement mobile", espece: "Espèces" };
const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Douala",
});

export default async function AdminDashboardPage() {
  await dbConnect();
  const d = await getDashboard();
  const { courant, precedent } = d.mois;
  const t = d.aTraiter;
  const totalATraiter = Object.values(t).reduce((s, l) => s + l.nombre, 0);
  const commandes30j = d.serie30j.reduce((s, j) => s + j.commandes, 0);
  const totalMoyens = d.parMoyen30j.reduce((s, m) => s + m.commandes, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Tableau de bord</h1>
        <p className="font-body text-sm text-ardoise">
          Mois en cours, comparé à la même période du mois précédent. Chiffres basés sur les commandes confirmées
          (payées ou en espèces), hors annulées et remboursées.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TuileKpi
          label="Chiffre d'affaires du mois"
          valeur={formatFCFA(courant.ca)}
          courant={courant.ca}
          precedent={precedent.ca}
          detail={`vs ${formatFCFA(precedent.ca)}`}
        />
        <TuileKpi
          label="Commandes du mois"
          valeur={String(courant.commandes)}
          courant={courant.commandes}
          precedent={precedent.commandes}
          detail={`vs ${precedent.commandes}`}
        />
        <TuileKpi
          label="Panier moyen"
          valeur={formatFCFA(courant.panierMoyen)}
          courant={courant.panierMoyen}
          precedent={precedent.panierMoyen}
          detail={`vs ${formatFCFA(precedent.panierMoyen)}`}
        />
        <TuileKpi
          label="Nouveaux clients du mois"
          valeur={String(d.nouveauxClients.courant)}
          courant={d.nouveauxClients.courant}
          precedent={d.nouveauxClients.precedent}
          detail={`${d.clientsActifs30j} clients actifs sur 30 j`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="order-2 xl:order-1 xl:col-span-2">
          <Carte
            titre="Chiffre d'affaires par jour"
            sousTitre={`30 derniers jours · ${commandes30j} commandes confirmées · ${formatFCFA(
              d.serie30j.reduce((s, j) => s + j.ca, 0)
            )}`}
          >
            <GraphiqueCA serie={d.serie30j} />
          </Carte>
        </div>

        {/* En premier sur mobile : c'est le bloc sur lequel on agit. */}
        <div className="order-1 xl:order-2">
          <Carte
            titre="À traiter"
            sousTitre={totalATraiter === 0 ? "Rien en attente, tout est à jour." : "Les plus anciennes en premier."}
          >
            <ul>
              <LigneATraiter
                label="Collectes sans livreur"
                aide="Commandes confirmées, aucun livreur assigné pour la collecte."
                {...t.collectesSansLivreur}
                lienTout="/admin/commandes?statut=COLLECTE_PLANIFIEE"
                urgent
              />
              <LigneATraiter
                label="Livraisons sans livreur"
                aide="Linge prêt, aucun livreur assigné pour la livraison."
                {...t.livraisonsSansLivreur}
                lienTout="/admin/commandes?statut=PRETE"
                urgent
              />
              <LigneATraiter
                label="Prix à proposer"
                aide="Articles hors catalogue en attente de prix."
                {...t.prixAProposer}
              />
              <LigneATraiter
                label="Paiements en attente depuis plus d'1 h"
                aide="Client parti sans payer ? À relancer ou annuler."
                {...t.paiementsEnAttente}
                lienTout="/admin/commandes?statut=EN_ATTENTE_PAIEMENT"
              />
              <LigneATraiter
                label="Incidents et collectes échouées"
                aide="À résoudre avec le client."
                {...t.incidents}
                lienTout="/admin/commandes?statut=INCIDENT"
                urgent
              />
            </ul>
          </Carte>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <TuileKpi label="Commandes aujourd'hui" valeur={String(d.aujourdhui.commandes)} />
        <TuileKpi label="Collectes aujourd'hui" valeur={String(d.aujourdhui.collectes)} />
        <TuileKpi label="Livraisons aujourd'hui" valeur={String(d.aujourdhui.livraisons)} />
        <TuileKpi
          label="Paiements en ligne (30 j)"
          valeur={d.paiementsEnLigne30j.taux === null ? "—" : `${d.paiementsEnLigne30j.taux} %`}
          detail={`${d.paiementsEnLigne30j.reussis} réussis sur ${d.paiementsEnLigne30j.tentatives}`}
        />
        <TuileKpi
          label="Espèces à percevoir"
          valeur={formatFCFA(d.especesAPercevoir.montant)}
          detail={`${d.especesAPercevoir.commandes} commande(s)`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Carte titre="Articles les plus demandés" sousTitre="30 derniers jours, en nombre de pièces">
          <ListeBarres
            vide="Aucune commande confirmée sur la période."
            lignes={d.topArticles30j.map((a) => ({
              libelle: a.nom,
              valeur: a.quantite,
              affichage: `${a.quantite} pcs`,
              detail: formatFCFA(a.ca),
            }))}
          />
        </Carte>
        <Carte titre="Commandes par zone" sousTitre="30 derniers jours, zone de collecte">
          <ListeBarres
            vide="Aucune commande confirmée sur la période."
            lignes={d.parZone30j.map((z) => ({
              // « Zone A : village, bilonguè, … » → « Zone A » : la liste des quartiers est trop longue ici.
              libelle: z.nom.split(":")[0].trim(),
              valeur: z.commandes,
              affichage: String(z.commandes),
              detail: formatFCFA(z.ca),
            }))}
          />
        </Carte>
        <Carte titre="Délais et paiements" sousTitre="30 derniers jours">
          <ListeBarres
            vide="Aucune commande confirmée sur la période."
            lignes={(["standard", "express", "premium"] as Delai[]).map((delai) => {
              const n = d.parDelai30j.find((x) => x.delai === delai)?.commandes ?? 0;
              return { libelle: `${DELAI_LABELS[delai].label} (${DELAI_LABELS[delai].duree})`, valeur: n, affichage: String(n) };
            })}
          />
          <div className="mt-5 border-t border-ardoise/10 pt-4">
            <ListeBarres
              vide="—"
              lignes={d.parMoyen30j
                .filter((m) => m.methode)
                .map((m) => ({
                  libelle: MOYENS[m.methode as string] ?? String(m.methode),
                  valeur: m.commandes,
                  affichage: String(m.commandes),
                  detail: totalMoyens ? `${Math.round((m.commandes / totalMoyens) * 100)} %` : undefined,
                }))}
            />
          </div>
        </Carte>
      </div>

      <Carte
        titre="Dernières commandes"
        action={
          <Link href="/admin/commandes" className="font-body text-xs font-semibold text-bleu hover:underline">
            Toutes les commandes
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] font-body text-sm">
            <thead>
              <tr className="text-left text-xs text-ardoise">
                <th className="pb-2 font-semibold">Commande</th>
                <th className="pb-2 font-semibold">Client</th>
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Statut</th>
                <th className="pb-2 font-semibold">Paiement</th>
                <th className="pb-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {d.dernieresCommandes.map((c) => (
                <tr key={c.id} className="border-t border-ardoise/10">
                  <td className="py-2">
                    <Link href={`/admin/commandes/${c.id}`} className="font-mono text-xs font-semibold text-bleu hover:underline">
                      {c.numero}
                    </Link>
                  </td>
                  <td className="py-2 text-encre">{c.client}</td>
                  <td className="py-2 text-xs text-ardoise">{FORMAT_DATE.format(new Date(c.createdAt))}</td>
                  <td className="py-2">
                    <StatutBadge
                      statut={deriveStatutCommandeAffiche(c.statut as OrderStatus)}
                      labels={STATUT_COMMANDE_AFFICHE_LABELS}
                    />
                  </td>
                  <td className="py-2">
                    <StatutBadge statut={deriveStatutPaiementAffiche(c)} labels={STATUT_PAIEMENT_AFFICHE_LABELS} />
                  </td>
                  <td className="py-2 text-right font-mono text-marine">{formatFCFA(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>
    </div>
  );
}
