"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import { DELAI_LABELS } from "@/lib/pricing-constants";
import {
  PROCHAINE_ETAPE,
  STATUT_LABELS,
  STATUTS_ANNULABLES,
  STATUTS_REMBOURSABLES,
  type OrderStatus,
} from "@/lib/orderStatuses";
import Button from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import StatutBadge from "@/components/admin/StatutBadge";
import { MOYEN_PAIEMENT_LABELS, STATUT_PAIEMENT_LABELS } from "@/lib/paiement";

interface CommandeDetail {
  id: string;
  numero: string;
  statut: OrderStatus;
  client: { nom: string; telephone: string; email: string } | null;
  articles: { nom: string; prixUnitaire: number; quantite: number }[];
  articlesPersonnalises: { nom: string; quantiteEstimee: number; statut: string; prixPropose: number | null }[];
  adresseCollecte: { quartier: string; rue: string; instructions?: string };
  adresseLivraison: { quartier: string; rue: string; instructions?: string };
  creneauCollecte: { date: string; plageHoraire: string } | null;
  creneauLivraison: { date: string; plageHoraire: string } | null;
  delai: keyof typeof DELAI_LABELS;
  notesClient?: string;
  sousTotal: number;
  fraisLivraison: number;
  majorationDelai: number;
  reduction: number;
  total: number;
  statusHistory: { statut: OrderStatus; date: string; commentaire?: string }[];
  paiement?: { methode: string | null; statut: string | null; montant: number | null } | null;
  paiements: { id: string; methode: string; montant: number; statut: string; referenceExterne?: string }[];
  createdAt: string;
}

export default function AdminCommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [commentaire, setCommentaire] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-commande", id],
    queryFn: async () => {
      const { data } = await api.get<CommandeDetail>(`/admin/orders/${id}`);
      return data;
    },
  });

  const transition = useMutation({
    mutationFn: async (action: "etape_suivante" | "annuler" | "rembourser") => {
      await api.patch(`/admin/orders/${id}`, { action, commentaire: commentaire || undefined });
    },
    onSuccess: () => {
      setCommentaire("");
      queryClient.invalidateQueries({ queryKey: ["admin-commande", id] });
    },
  });

  if (isLoading) return <p className="font-body text-sm text-ardoise">Chargement…</p>;
  if (isError || !data) return <p className="font-body text-sm text-alerte">Commande introuvable.</p>;

  const prochaineEtape = PROCHAINE_ETAPE[data.statut];
  const peutAnnuler = STATUTS_ANNULABLES.includes(data.statut);
  const peutRembourser = STATUTS_REMBOURSABLES.includes(data.statut);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-marine">{data.numero}</h1>
          <p className="font-body text-xs text-ardoise">
            Créée le {new Date(data.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
        <StatutBadge statut={data.statut} />
      </div>

      <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {prochaineEtape && (
            <Button
              type="button"
              onClick={() => transition.mutate("etape_suivante")}
              disabled={transition.isPending}
            >
              Faire avancer → {STATUT_LABELS[prochaineEtape].label}
            </Button>
          )}
          {peutAnnuler && (
            <Button
              type="button"
              variant="ghost"
              disabled={transition.isPending}
              onClick={() => {
                if (window.confirm("Annuler cette commande ?")) transition.mutate("annuler");
              }}
            >
              Annuler
            </Button>
          )}
          {peutRembourser && (
            <Button
              type="button"
              variant="ghost"
              disabled={transition.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Marquer cette commande comme remboursée ? Le virement réel doit être effectué séparément via MoneyFusion."
                  )
                )
                  transition.mutate("rembourser");
              }}
            >
              Marquer remboursée
            </Button>
          )}
        </div>
        {(prochaineEtape || peutAnnuler || peutRembourser) && (
          <textarea
            className={`mt-3 ${inputClasses}`}
            placeholder="Commentaire (facultatif)"
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
          />
        )}
        {transition.isError && (
          <p className="mt-2 font-body text-sm text-alerte">
            {isAxiosError(transition.error) && transition.error.response?.data?.error
              ? String(transition.error.response.data.error)
              : "Action impossible."}
          </p>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
          <h2 className="font-body text-sm font-semibold text-marine">Client</h2>
          {data.client ? (
            <dl className="mt-2 grid grid-cols-2 gap-y-1 font-body text-sm">
              <dt className="text-ardoise">Nom</dt>
              <dd className="text-right text-encre">{data.client.nom}</dd>
              <dt className="text-ardoise">Téléphone</dt>
              <dd className="text-right text-encre">{data.client.telephone}</dd>
              <dt className="text-ardoise">Email</dt>
              <dd className="text-right text-encre">{data.client.email}</dd>
            </dl>
          ) : (
            <p className="mt-2 font-body text-sm text-ardoise">Client introuvable.</p>
          )}
        </div>

        <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
          <h2 className="font-body text-sm font-semibold text-marine">Logistique</h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 font-body text-sm">
            <dt className="text-ardoise">Délai</dt>
            <dd className="text-right text-encre">{DELAI_LABELS[data.delai]?.label ?? data.delai}</dd>
            <dt className="text-ardoise">Collecte</dt>
            <dd className="text-right text-encre">
              {data.adresseCollecte.quartier}, {data.adresseCollecte.rue}
              {data.creneauCollecte && (
                <div className="text-xs text-ardoise">
                  {new Date(data.creneauCollecte.date).toLocaleDateString("fr-FR")} · {data.creneauCollecte.plageHoraire}
                </div>
              )}
            </dd>
            <dt className="text-ardoise">Livraison</dt>
            <dd className="text-right text-encre">
              {data.adresseLivraison.quartier}, {data.adresseLivraison.rue}
              {data.creneauLivraison && (
                <div className="text-xs text-ardoise">
                  {new Date(data.creneauLivraison.date).toLocaleDateString("fr-FR")} · {data.creneauLivraison.plageHoraire}
                </div>
              )}
            </dd>
          </dl>
          {data.notesClient && (
            <p className="mt-2 rounded-lg bg-brume p-2 font-body text-xs text-encre">Note : {data.notesClient}</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
        <h2 className="font-body text-sm font-semibold text-marine">Articles</h2>
        <table className="mt-2 w-full font-body text-sm">
          <tbody>
            {data.articles.map((a, i) => (
              <tr key={i} className="border-b border-ardoise/5 last:border-0">
                <td className="py-1.5 text-encre">
                  {a.nom} × {a.quantite}
                </td>
                <td className="py-1.5 text-right font-mono">{formatFCFA(a.prixUnitaire * a.quantite)}</td>
              </tr>
            ))}
            {data.articlesPersonnalises.map((a, i) => (
              <tr key={`p-${i}`} className="border-b border-ardoise/5 last:border-0">
                <td className="py-1.5 text-encre">
                  {a.nom} × {a.quantiteEstimee} <span className="text-xs text-ardoise">(hors catalogue, {a.statut})</span>
                </td>
                <td className="py-1.5 text-right font-mono">
                  {a.prixPropose != null ? formatFCFA(a.prixPropose) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 grid grid-cols-2 gap-y-1 border-t border-ardoise/10 pt-3 font-body text-sm">
          <dt className="text-ardoise">Sous-total</dt>
          <dd className="text-right font-mono">{formatFCFA(data.sousTotal)}</dd>
          <dt className="text-ardoise">Livraison</dt>
          <dd className="text-right font-mono">{formatFCFA(data.fraisLivraison)}</dd>
          <dt className="text-ardoise">Majoration délai</dt>
          <dd className="text-right font-mono">{formatFCFA(data.majorationDelai)}</dd>
          <dt className="font-bold text-marine">Total</dt>
          <dd className="text-right font-mono font-bold text-marine">{formatFCFA(data.total)}</dd>
        </dl>
      </div>

      <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
        <h2 className="font-body text-sm font-semibold text-marine">Paiements</h2>
        {data.paiements.length === 0 ? (
          data.paiement?.methode === "espece" ? (
            <div className="mt-2 flex items-center justify-between font-body text-sm">
              <span className="text-encre">
                {MOYEN_PAIEMENT_LABELS.espece}
                <span className="ml-2 text-xs text-ardoise">
                  {STATUT_PAIEMENT_LABELS[data.paiement.statut ?? ""] ?? data.paiement.statut}
                </span>
              </span>
              <span className="font-mono">{formatFCFA(data.paiement.montant ?? 0)}</span>
            </div>
          ) : (
            <p className="mt-2 font-body text-sm text-ardoise">Aucune tentative de paiement.</p>
          )
        ) : (
          <table className="mt-2 w-full font-body text-sm">
            <tbody>
              {data.paiements.map((p) => (
                <tr key={p.id} className="border-b border-ardoise/5 last:border-0">
                  <td className="py-1.5 text-encre">{MOYEN_PAIEMENT_LABELS[p.methode] ?? p.methode}</td>
                  <td className="py-1.5 text-ardoise">{STATUT_PAIEMENT_LABELS[p.statut] ?? p.statut}</td>
                  <td className="py-1.5 text-right font-mono">{formatFCFA(p.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
        <h2 className="font-body text-sm font-semibold text-marine">Historique</h2>
        <ul className="mt-2 flex flex-col gap-1.5 font-body text-sm">
          {data.statusHistory
            .slice()
            .reverse()
            .map((h, i) => (
              <li key={i} className="flex items-center justify-between border-b border-ardoise/5 pb-1.5 last:border-0">
                <span className="text-encre">
                  {STATUT_LABELS[h.statut]?.label ?? h.statut}
                  {h.commentaire && <span className="text-xs text-ardoise"> — {h.commentaire}</span>}
                </span>
                <span className="text-xs text-ardoise">{new Date(h.date).toLocaleString("fr-FR")}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
