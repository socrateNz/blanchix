"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Eye } from "lucide-react";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface Utilisateur {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  points: number;
  nombreCommandes: number;
  totalDepense: number;
  createdAt: string;
}

export default function AdminUtilisateursPage() {
  const [q, setQ] = useState("");
  const [qSoumis, setQSoumis] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-utilisateurs", qSoumis, page],
    queryFn: async () => {
      const { data } = await api.get<{ total: number; limit: number; utilisateurs: Utilisateur[] }>(
        "/admin/users",
        { params: { q: qSoumis || undefined, page } }
      );
      return data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-marine">Utilisateurs</h1>

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
            placeholder="Nom, téléphone ou email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}
      {isError && <p className="font-body text-sm text-alerte">Impossible de charger les utilisateurs.</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-marine/12 bg-white shadow-sm">
            <table className="w-full font-body text-sm">
              <thead className="border-b border-ardoise/10 text-left text-xs font-semibold text-ardoise">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3 text-right">Commandes</th>
                  <th className="px-4 py-3 text-right">Total dépensé</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.utilisateurs.map((u) => (
                  <tr key={u.id} className="border-b border-ardoise/5 last:border-0 hover:bg-brume">
                    <td className="px-4 py-3 text-encre">{u.nom}</td>
                    <td className="px-4 py-3 text-encre">{u.telephone}</td>
                    <td className="px-4 py-3 text-ardoise">{u.email}</td>
                    <td className="px-4 py-3 text-right font-mono">{u.nombreCommandes}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatFCFA(u.totalDepense)}</td>
                    <td className="px-4 py-3 text-right font-mono">{u.points}</td>
                    <td className="px-4 py-3 text-xs text-ardoise">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/utilisateurs/${u.id}`}
                        aria-label={`Voir ${u.nom}`}
                        title="Voir"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ardoise outline-none hover:bg-brume focus-visible:ring-2 focus-visible:ring-cyan"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {data.utilisateurs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-ardoise">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-ardoise">{data.total} utilisateur(s)</p>
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
