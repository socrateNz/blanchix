"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import { formatZoneAdresse } from "@/lib/adresse";
import { STATUT_COMMANDE_AFFICHE_LABELS, deriveStatutCommandeAffiche, type OrderStatus } from "@/lib/orderStatuses";
import StatutBadge from "@/components/admin/StatutBadge";

interface UtilisateurDetail {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  whatsapp?: string;
  points: number;
  createdAt: string;
  adresses: {
    id: string;
    label?: string;
    zoneNom?: string;
    lieuDit?: string;
    quartier?: string;
    rue?: string;
    instructions?: string;
    parDefaut?: boolean;
  }[];
  commandes: { id: string; numero: string; statut: OrderStatus; total: number; createdAt: string }[];
}

export default function AdminUtilisateurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-utilisateur", id],
    queryFn: async () => {
      const { data } = await api.get<UtilisateurDetail>(`/admin/users/${id}`);
      return data;
    },
  });

  if (isLoading) return <p className="font-body text-sm text-ardoise">Chargement…</p>;
  if (isError || !data) return <p className="font-body text-sm text-alerte">Utilisateur introuvable.</p>;

  const totalDepense = data.commandes.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">{data.nom}</h1>
        <p className="font-body text-xs text-ardoise">
          Inscrit le {new Date(data.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
          <h2 className="font-body text-sm font-semibold text-marine">Profil</h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 font-body text-sm">
            <dt className="text-ardoise">Téléphone</dt>
            <dd className="text-right text-encre">{data.telephone}</dd>
            <dt className="text-ardoise">Email</dt>
            <dd className="text-right text-encre">{data.email}</dd>
            {data.whatsapp && (
              <>
                <dt className="text-ardoise">WhatsApp</dt>
                <dd className="text-right text-encre">{data.whatsapp}</dd>
              </>
            )}
            <dt className="text-ardoise">Points de fidélité</dt>
            <dd className="text-right font-mono text-encre">{data.points}</dd>
          </dl>
        </div>

        <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
          <h2 className="font-body text-sm font-semibold text-marine">Activité</h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 font-body text-sm">
            <dt className="text-ardoise">Commandes passées</dt>
            <dd className="text-right font-mono text-encre">{data.commandes.length}</dd>
            <dt className="text-ardoise">Total dépensé</dt>
            <dd className="text-right font-mono text-encre">{formatFCFA(totalDepense)}</dd>
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
        <h2 className="font-body text-sm font-semibold text-marine">Adresses enregistrées</h2>
        {data.adresses.length === 0 ? (
          <p className="mt-2 font-body text-sm text-ardoise">Aucune adresse enregistrée.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 font-body text-sm">
            {data.adresses.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b border-ardoise/5 pb-2 last:border-0">
                <div>
                  <p className="text-encre">
                    {a.label || "Résidence"} {a.parDefaut && <span className="ml-1 text-xs text-bleu">(par défaut)</span>}
                  </p>
                  <p className="text-xs text-ardoise">{formatZoneAdresse(a)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-marine/12 bg-white p-4 shadow-sm">
        <h2 className="font-body text-sm font-semibold text-marine">Historique des commandes</h2>
        {data.commandes.length === 0 ? (
          <p className="mt-2 font-body text-sm text-ardoise">Aucune commande.</p>
        ) : (
          <table className="mt-2 w-full font-body text-sm">
            <tbody>
              {data.commandes.map((c) => (
                <tr key={c.id} className="border-b border-ardoise/5 last:border-0">
                  <td className="py-1.5">
                    <Link href={`/admin/commandes/${c.id}`} className="font-mono text-bleu hover:underline">
                      {c.numero}
                    </Link>
                  </td>
                  <td className="py-1.5">
                    <StatutBadge statut={deriveStatutCommandeAffiche(c.statut)} labels={STATUT_COMMANDE_AFFICHE_LABELS} />
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatFCFA(c.total)}</td>
                  <td className="py-1.5 text-right text-xs text-ardoise">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
