"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft, Download } from "lucide-react";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import { STATUT_LABELS, type OrderStatus } from "@/lib/orderStatuses";
import { DELAI_LABELS, type Delai } from "@/lib/pricing-constants";
import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatutBadge from "@/components/admin/StatutBadge";

interface CommandeDetail {
  id: string;
  numero: string;
  statut: OrderStatus;
  articles: { nom: string; prixUnitaire: number; quantite: number }[];
  articlesPersonnalises: { nom: string; quantiteEstimee: number; statut: string; prixPropose: number | null }[];
  adresseCollecte: { quartier: string; rue: string };
  adresseLivraison: { quartier: string; rue: string };
  creneauCollecte: { date: string; plageHoraire: string } | null;
  creneauLivraison: { date: string; plageHoraire: string } | null;
  delai: Delai;
  sousTotal: number;
  fraisLivraison: number;
  majorationDelai: number;
  total: number;
  paiement?: { methode: string | null } | null;
  recuPdfUrl: string | null;
  statusHistory: { statut: OrderStatus; date: string }[];
  createdAt: string;
}

export default function SuiviDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mes-commandes", id],
    queryFn: async () => {
      const { data } = await api.get<CommandeDetail>(`/mes-commandes/${id}`);
      return data;
    },
  });

  // Réutilise /api/payments/initiate tel quel (déjà responsable de la transition
  // PAIEMENT_ECHOUE → EN_ATTENTE_PAIEMENT et de la création d'une NOUVELLE session Codees —
  // jamais une réutilisation d'URL, cause du bug CSRF déjà corrigé) plutôt que de dupliquer
  // cette logique : c'est exactement le même appel que le tunnel de commande initial.
  const relancerPaiement = useMutation({
    mutationFn: async () => {
      const { data: reponse } = await api.post<{ url: string | null }>("/payments/initiate", {
        orderId: id,
        moyen: "mobile_money",
      });
      return reponse;
    },
    onSuccess: (reponse) => {
      if (reponse.url) window.location.assign(reponse.url);
    },
  });

  return (
    <main className="min-h-screen bg-brume py-10 sm:py-14">
      <Container className="max-w-2xl">
        <Link href="/suivi" className="inline-flex items-center gap-1.5 font-body text-sm text-ardoise hover:text-marine">
          <ArrowLeft className="h-4 w-4" /> Mes commandes
        </Link>

        {isLoading && <p className="mt-6 font-body text-sm text-ardoise">Chargement…</p>}
        {isError && <p className="mt-6 font-body text-sm text-alerte">Commande introuvable.</p>}

        {data && (
          <div className="mt-4 flex flex-col gap-5">
            <Card elevation="raised" className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-mono text-lg font-bold text-marine">{data.numero}</h1>
                  <p className="mt-1 font-body text-xs text-ardoise">
                    {new Date(data.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <StatutBadge statut={data.statut} />
              </div>

              {data.recuPdfUrl && (
                <a
                  href={data.recuPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 font-body text-sm font-semibold text-bleu hover:underline"
                >
                  <Download className="h-4 w-4" /> Télécharger le reçu
                </a>
              )}

              {data.statut === "PAIEMENT_ECHOUE" && (
                <div className="mt-4">
                  <p className="font-body text-sm text-ardoise">
                    Le paiement n&apos;a pas abouti. Vous pouvez relancer le paiement pour finaliser votre commande.
                  </p>
                  <Button
                    type="button"
                    className="mt-2"
                    disabled={relancerPaiement.isPending}
                    onClick={() => relancerPaiement.mutate()}
                  >
                    {relancerPaiement.isPending ? "Redirection…" : "Relancer le paiement"}
                  </Button>
                  {relancerPaiement.isError && (
                    <p className="mt-2 font-body text-sm text-alerte">
                      {isAxiosError(relancerPaiement.error) && relancerPaiement.error.response?.data?.error
                        ? String(relancerPaiement.error.response.data.error)
                        : "Impossible de relancer le paiement. Merci de réessayer."}
                    </p>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-body text-sm font-semibold text-marine">Suivi</h2>
              <ol className="mt-4 flex flex-col gap-4 border-l-2 border-marine/12 pl-4">
                {data.statusHistory.map((h, i) => {
                  const dernier = i === data.statusHistory.length - 1;
                  return (
                    <li key={i} className="relative">
                      <span
                        className={`absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full ${
                          dernier ? "bg-bleu" : "bg-ardoise/30"
                        }`}
                      />
                      <p className={`font-body text-sm ${dernier ? "font-semibold text-marine" : "text-encre"}`}>
                        {STATUT_LABELS[h.statut]?.label ?? h.statut}
                      </p>
                      <p className="font-body text-xs text-ardoise">
                        {new Date(h.date).toLocaleString("fr-FR")}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card className="p-6">
              <h2 className="font-body text-sm font-semibold text-marine">Articles</h2>
              <div className="mt-3 flex flex-col gap-1.5 font-body text-sm">
                {data.articles.map((a, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-encre">
                      {a.nom} × {a.quantite}
                    </span>
                    <span className="font-mono text-ardoise">{formatFCFA(a.prixUnitaire * a.quantite)}</span>
                  </div>
                ))}
                {data.articlesPersonnalises.map((a, i) => (
                  <div key={`p-${i}`} className="flex justify-between">
                    <span className="text-encre">
                      {a.nom} × {a.quantiteEstimee} <span className="text-xs text-ardoise">(hors catalogue)</span>
                    </span>
                    <span className="font-mono text-ardoise">
                      {a.prixPropose != null ? formatFCFA(a.prixPropose) : "à confirmer"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-ardoise/15 pt-3 font-body text-sm font-bold text-marine">
                <span>Total</span>
                <span className="font-mono">{formatFCFA(data.total)}</span>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-body text-sm font-semibold text-marine">Logistique</h2>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 font-body text-sm">
                <dt className="text-ardoise">Formule</dt>
                <dd className="text-right text-encre">{DELAI_LABELS[data.delai]?.label ?? data.delai}</dd>
                <dt className="text-ardoise">Collecte</dt>
                <dd className="text-right text-encre">
                  {data.adresseCollecte.quartier}, {data.adresseCollecte.rue}
                  {data.creneauCollecte && (
                    <div className="text-xs text-ardoise">
                      {new Date(data.creneauCollecte.date).toLocaleDateString("fr-FR")} ·{" "}
                      {data.creneauCollecte.plageHoraire}
                    </div>
                  )}
                </dd>
                <dt className="text-ardoise">Livraison</dt>
                <dd className="text-right text-encre">
                  {data.adresseLivraison.quartier}, {data.adresseLivraison.rue}
                  {data.creneauLivraison && (
                    <div className="text-xs text-ardoise">
                      {new Date(data.creneauLivraison.date).toLocaleDateString("fr-FR")} ·{" "}
                      {data.creneauLivraison.plageHoraire}
                    </div>
                  )}
                </dd>
              </dl>
            </Card>
          </div>
        )}
      </Container>
    </main>
  );
}
