"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import Button from "@/components/ui/Button";

interface EntreeAudit {
  id: string;
  utilisateur: { nom: string; email: string } | null;
  action: string;
  cible: { type: string; id: string };
  ancienneValeur?: unknown;
  nouvelleValeur?: unknown;
  adresseIP?: string;
  date: string;
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: async () => {
      const { data } = await api.get<{ total: number; limit: number; entrees: EntreeAudit[] }>("/admin/audit", {
        params: { page },
      });
      return data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-marine">Journal d&apos;audit</h1>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-marine/12 bg-white shadow-sm">
            <table className="w-full font-body text-sm">
              <thead className="border-b border-ardoise/10 text-left text-xs font-semibold text-ardoise">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Cible</th>
                  <th className="px-4 py-3">Détail</th>
                </tr>
              </thead>
              <tbody>
                {data.entrees.map((e) => (
                  <tr key={e.id} className="border-b border-ardoise/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ardoise">
                      {new Date(e.date).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-encre">{e.utilisateur?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-encre">{e.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ardoise">
                      {e.cible?.type} {e.cible?.id ? `#${String(e.cible.id).slice(-6)}` : ""}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-ardoise" title={JSON.stringify(e.nouvelleValeur)}>
                      {e.nouvelleValeur ? JSON.stringify(e.nouvelleValeur) : "—"}
                    </td>
                  </tr>
                ))}
                {data.entrees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-ardoise">
                      Aucune action enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-ardoise">{data.total} entrée(s)</p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Précédent
              </Button>
              <span className="font-body text-xs text-ardoise">
                Page {page} / {totalPages}
              </span>
              <Button type="button" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
