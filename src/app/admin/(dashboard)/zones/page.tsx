"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface Zone {
  id: string;
  nom: string;
  prix: number;
  actif: boolean;
  ordreAffichage: number;
}

const FORM_VIDE = { nom: "", prix: "", ordreAffichage: "" };

export default function AdminZonesPage() {
  const queryClient = useQueryClient();
  const [nouveau, setNouveau] = useState(FORM_VIDE);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionForm, setEditionForm] = useState({ nom: "", prix: "", ordreAffichage: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-zones"],
    queryFn: async () => {
      const { data } = await api.get<Zone[]>("/admin/zones");
      return data;
    },
  });

  const invalider = () => queryClient.invalidateQueries({ queryKey: ["admin-zones"] });

  const creation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/zones", {
        nom: nouveau.nom,
        prix: Number(nouveau.prix),
        ordreAffichage: nouveau.ordreAffichage ? Number(nouveau.ordreAffichage) : undefined,
      });
    },
    onSuccess: () => {
      setNouveau(FORM_VIDE);
      invalider();
    },
  });

  const modification = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/admin/zones/${id}`, {
        nom: editionForm.nom,
        prix: Number(editionForm.prix),
        ordreAffichage: editionForm.ordreAffichage ? Number(editionForm.ordreAffichage) : undefined,
      });
    },
    onSuccess: () => {
      setEditionId(null);
      invalider();
    },
  });

  const bascule = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      await api.patch(`/admin/zones/${id}`, { actif });
    },
    onSuccess: invalider,
  });

  const suppression = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/zones/${id}`);
    },
    onSuccess: invalider,
  });

  function demarrerEdition(z: Zone) {
    setEditionId(z.id);
    setEditionForm({ nom: z.nom, prix: String(z.prix), ordreAffichage: String(z.ordreAffichage) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Zones de livraison</h1>
        <p className="mt-1 font-body text-sm text-ardoise">
          Le client choisit une de ces zones lors de la commande — son prix détermine les frais de
          livraison.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-marine/12 bg-white p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          creation.mutate();
        }}
      >
        <Field label="Nom">
          <input
            className={`${inputClasses} w-40`}
            value={nouveau.nom}
            onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
            placeholder="Ex. Bonapriso"
            required
          />
        </Field>
        <Field label="Prix (FCFA)">
          <input
            className={`${inputClasses} w-32`}
            type="number"
            min={0}
            value={nouveau.prix}
            onChange={(e) => setNouveau({ ...nouveau, prix: e.target.value })}
            required
          />
        </Field>
        <Field label="Ordre" optional>
          <input
            className={`${inputClasses} w-20`}
            type="number"
            value={nouveau.ordreAffichage}
            onChange={(e) => setNouveau({ ...nouveau, ordreAffichage: e.target.value })}
          />
        </Field>
        <Button type="submit" disabled={creation.isPending}>
          Ajouter
        </Button>
        {creation.isError && (
          <p className="w-full font-body text-sm text-alerte">
            {isAxiosError(creation.error) && creation.error.response?.data?.error
              ? JSON.stringify(creation.error.response.data.error)
              : "Impossible d'ajouter la zone."}
          </p>
        )}
      </form>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-marine/12 bg-white shadow-sm">
          <table className="w-full font-body text-sm">
            <thead className="border-b border-ardoise/10 text-left text-xs font-semibold text-ardoise">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3 text-right">Prix</th>
                <th className="px-4 py-3">Ordre</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((z) =>
                editionId === z.id ? (
                  <tr key={z.id} className="border-b border-ardoise/5 bg-brume/50">
                    <td className="px-4 py-2">
                      <input
                        className={inputClasses}
                        value={editionForm.nom}
                        onChange={(e) => setEditionForm({ ...editionForm, nom: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className={`${inputClasses} text-right`}
                        type="number"
                        min={0}
                        value={editionForm.prix}
                        onChange={(e) => setEditionForm({ ...editionForm, prix: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className={inputClasses}
                        type="number"
                        value={editionForm.ordreAffichage}
                        onChange={(e) => setEditionForm({ ...editionForm, ordreAffichage: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2" colSpan={2}>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => modification.mutate(z.id)}
                          disabled={modification.isPending}
                        >
                          Enregistrer
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setEditionId(null)}>
                          Annuler
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={z.id} className="border-b border-ardoise/5 last:border-0 hover:bg-brume">
                    <td className="px-4 py-3 text-encre">{z.nom}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatFCFA(z.prix)}</td>
                    <td className="px-4 py-3 text-ardoise">{z.ordreAffichage}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => bascule.mutate({ id: z.id, actif: !z.actif })}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          z.actif ? "bg-succes/15 text-succes" : "bg-ardoise/10 text-ardoise"
                        }`}
                      >
                        {z.actif ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => demarrerEdition(z)}
                          className="font-body text-xs font-semibold text-bleu hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Supprimer la zone « ${z.nom} » ?`)) suppression.mutate(z.id);
                          }}
                          className="font-body text-xs font-semibold text-alerte hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
