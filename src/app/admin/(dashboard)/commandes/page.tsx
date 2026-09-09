"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye } from "lucide-react";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import {
  STATUTS_COMMANDE_AFFICHE,
  STATUT_COMMANDE_AFFICHE_LABELS,
  deriveStatutCommandeAffiche,
  type OrderStatus,
} from "@/lib/orderStatuses";
import { STATUT_PAIEMENT_AFFICHE_LABELS, deriveStatutPaiementAffiche } from "@/lib/paiement";
import { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import StatutBadge from "@/components/admin/StatutBadge";
import CommandeActionsMenu from "@/components/admin/CommandeActionsMenu";

interface Commande {
  id: string;
  numero: string;
  statut: OrderStatus;
  client: { nom: string; telephone: string } | null;
  total: number;
  delai: string;
  createdAt: string;
  livreurCollecte: { nom: string; prenom?: string } | null;
  livreurLivraison: { nom: string; prenom?: string } | null;
  paiement: { methode: string | null; statut: string | null } | null;
}

export default function AdminCommandesPage() {
  const [q, setQ] = useState("");
  const [qSoumis, setQSoumis] = useState("");
  const [statut, setStatut] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-commandes", qSoumis, statut, page],
    queryFn: async () => {
      const { data } = await api.get<{ total: number; limit: number; commandes: Commande[] }>(
        "/admin/orders",
        { params: { q: qSoumis || undefined, statut: statut || undefined, page } }
      );
      return data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-marine">Commandes</h1>

      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQSoumis(q);
        }}
      >
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise/50" strokeWidth={1.8} />
          <input
            className={`${inputClasses} pl-10`}
            placeholder="Numéro, nom ou téléphone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={`${inputClasses} max-w-xs`}
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous les statuts</option>
          {STATUTS_COMMANDE_AFFICHE.map((s) => (
            <option key={s} value={s}>
              {STATUT_COMMANDE_AFFICHE_LABELS[s].label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}
      {isError && <p className="font-body text-sm text-alerte">Impossible de charger les commandes.</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-marine/12 bg-white shadow-sm">
            <table className="w-full font-body text-sm">
              <thead className="border-b border-ardoise/10 text-left text-xs font-semibold text-ardoise">
                <tr>
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Statut commande</th>
                  <th className="px-4 py-3">Statut paiement</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.commandes.map((c) => (
                  <tr key={c.id} className="border-b border-ardoise/5 last:border-0 hover:bg-brume">
                    <td className="px-4 py-3">
                      <Link href={`/admin/commandes/${c.id}`} className="font-mono text-bleu hover:underline">
                        {c.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.client ? (
                        <>
                          <div className="text-encre">{c.client.nom}</div>
                          <div className="text-xs text-ardoise">{c.client.telephone}</div>
                        </>
                      ) : (
                        <span className="text-ardoise/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatutBadge
                        statut={deriveStatutCommandeAffiche(c.statut)}
                        labels={STATUT_COMMANDE_AFFICHE_LABELS}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatutBadge
                        statut={deriveStatutPaiementAffiche(c)}
                        labels={STATUT_PAIEMENT_AFFICHE_LABELS}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatFCFA(c.total)}</td>
                    <td className="px-4 py-3 text-xs text-ardoise">
                      {new Date(c.createdAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/admin/commandes/${c.id}`}
                          aria-label={`Voir la commande ${c.numero}`}
                          title="Voir"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ardoise outline-none hover:bg-brume focus-visible:ring-2 focus-visible:ring-cyan"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <CommandeActionsMenu
                          orderId={c.id}
                          orderNumero={c.numero}
                          statut={c.statut}
                          paiement={c.paiement}
                          livreurCollecte={c.livreurCollecte}
                          livreurLivraison={c.livreurLivraison}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {data.commandes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-ardoise">
                      Aucune commande trouvée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-ardoise">{data.total} commande(s)</p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <span className="font-body text-xs text-ardoise">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
