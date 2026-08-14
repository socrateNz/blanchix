"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface Article {
  id: string;
  nom: string;
  prixUnitaire: number;
  categorie?: string;
  actif: boolean;
  ordreAffichage: number;
}

const FORM_VIDE = { nom: "", prixUnitaire: "", categorie: "", ordreAffichage: "" };

export default function AdminCataloguePage() {
  const queryClient = useQueryClient();
  const [nouveau, setNouveau] = useState(FORM_VIDE);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionForm, setEditionForm] = useState({ nom: "", prixUnitaire: "", categorie: "", ordreAffichage: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-catalogue"],
    queryFn: async () => {
      const { data } = await api.get<Article[]>("/admin/catalog");
      return data;
    },
  });

  const invalider = () => queryClient.invalidateQueries({ queryKey: ["admin-catalogue"] });

  const creation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/catalog", {
        nom: nouveau.nom,
        prixUnitaire: Number(nouveau.prixUnitaire),
        categorie: nouveau.categorie || undefined,
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
      await api.patch(`/admin/catalog/${id}`, {
        nom: editionForm.nom,
        prixUnitaire: Number(editionForm.prixUnitaire),
        categorie: editionForm.categorie || undefined,
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
      await api.patch(`/admin/catalog/${id}`, { actif });
    },
    onSuccess: invalider,
  });

  const suppression = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/catalog/${id}`);
    },
    onSuccess: invalider,
  });

  function demarrerEdition(a: Article) {
    setEditionId(a.id);
    setEditionForm({
      nom: a.nom,
      prixUnitaire: String(a.prixUnitaire),
      categorie: a.categorie ?? "",
      ordreAffichage: String(a.ordreAffichage),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-marine">Catalogue</h1>

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
            required
          />
        </Field>
        <Field label="Prix (FCFA)">
          <input
            className={`${inputClasses} w-32`}
            type="number"
            min={0}
            value={nouveau.prixUnitaire}
            onChange={(e) => setNouveau({ ...nouveau, prixUnitaire: e.target.value })}
            required
          />
        </Field>
        <Field label="Catégorie" optional>
          <input
            className={`${inputClasses} w-36`}
            value={nouveau.categorie}
            onChange={(e) => setNouveau({ ...nouveau, categorie: e.target.value })}
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
              : "Impossible d'ajouter l'article."}
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
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3 text-right">Prix</th>
                <th className="px-4 py-3">Ordre</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) =>
                editionId === a.id ? (
                  <tr key={a.id} className="border-b border-ardoise/5 bg-brume/50">
                    <td className="px-4 py-2">
                      <input
                        className={inputClasses}
                        value={editionForm.nom}
                        onChange={(e) => setEditionForm({ ...editionForm, nom: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className={inputClasses}
                        value={editionForm.categorie}
                        onChange={(e) => setEditionForm({ ...editionForm, categorie: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className={`${inputClasses} text-right`}
                        type="number"
                        min={0}
                        value={editionForm.prixUnitaire}
                        onChange={(e) => setEditionForm({ ...editionForm, prixUnitaire: e.target.value })}
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
                          onClick={() => modification.mutate(a.id)}
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
                  <tr key={a.id} className="border-b border-ardoise/5 last:border-0 hover:bg-brume">
                    <td className="px-4 py-3 text-encre">{a.nom}</td>
                    <td className="px-4 py-3 text-ardoise">{a.categorie || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatFCFA(a.prixUnitaire)}</td>
                    <td className="px-4 py-3 text-ardoise">{a.ordreAffichage}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => bascule.mutate({ id: a.id, actif: !a.actif })}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          a.actif ? "bg-succes/15 text-succes" : "bg-ardoise/10 text-ardoise"
                        }`}
                      >
                        {a.actif ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => demarrerEdition(a)}
                          className="font-body text-xs font-semibold text-bleu hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Supprimer « ${a.nom} » du catalogue ?`)) suppression.mutate(a.id);
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
