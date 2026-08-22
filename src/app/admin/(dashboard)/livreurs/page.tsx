"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface Livreur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  whatsapp: string;
}

const FORM_VIDE = { prenom: "", nom: "", email: "", whatsapp: "" };

export default function AdminLivreursPage() {
  const queryClient = useQueryClient();
  const [nouveau, setNouveau] = useState(FORM_VIDE);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [editionForm, setEditionForm] = useState(FORM_VIDE);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-livreurs"],
    queryFn: async () => {
      const { data } = await api.get<Livreur[]>("/admin/livreurs");
      return data;
    },
  });

  const invalider = () => queryClient.invalidateQueries({ queryKey: ["admin-livreurs"] });

  const creation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/livreurs", nouveau);
    },
    onSuccess: () => {
      setNouveau(FORM_VIDE);
      invalider();
    },
  });

  const modification = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/admin/livreurs/${id}`, editionForm);
    },
    onSuccess: () => {
      setEditionId(null);
      invalider();
    },
  });

  const suppression = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/livreurs/${id}`);
    },
    onSuccess: invalider,
    onError: (err) => {
      window.alert(
        isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : "Suppression impossible."
      );
    },
  });

  function demarrerEdition(l: Livreur) {
    setEditionId(l.id);
    setEditionForm({ prenom: l.prenom, nom: l.nom, email: l.email, whatsapp: l.whatsapp });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-marine">Livreurs</h1>

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-marine/12 bg-white p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          creation.mutate();
        }}
      >
        <Field label="Prénom">
          <input
            className={`${inputClasses} w-36`}
            value={nouveau.prenom}
            onChange={(e) => setNouveau({ ...nouveau, prenom: e.target.value })}
            required
          />
        </Field>
        <Field label="Nom">
          <input
            className={`${inputClasses} w-36`}
            value={nouveau.nom}
            onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
            required
          />
        </Field>
        <Field label="Email">
          <input
            className={`${inputClasses} w-56`}
            type="email"
            value={nouveau.email}
            onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })}
            required
          />
        </Field>
        <Field label="WhatsApp">
          <input
            className={`${inputClasses} w-40`}
            placeholder="+237600000000"
            value={nouveau.whatsapp}
            onChange={(e) => setNouveau({ ...nouveau, whatsapp: e.target.value })}
            required
          />
        </Field>
        <Button type="submit" disabled={creation.isPending}>
          Ajouter
        </Button>
        {creation.isError && (
          <p className="w-full font-body text-sm text-alerte">
            {isAxiosError(creation.error) && creation.error.response?.data?.error
              ? String(creation.error.response.data.error)
              : "Impossible d'ajouter le livreur."}
          </p>
        )}
      </form>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-marine/12 bg-white shadow-sm">
          <table className="w-full font-body text-sm">
            <thead className="border-b border-ardoise/10 text-left text-xs font-semibold text-ardoise">
              <tr>
                <th className="px-4 py-3">Prénom</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((l) =>
                editionId === l.id ? (
                  <tr key={l.id} className="border-b border-ardoise/5 bg-brume/50">
                    <td className="px-4 py-2">
                      <input
                        className={inputClasses}
                        value={editionForm.prenom}
                        onChange={(e) => setEditionForm({ ...editionForm, prenom: e.target.value })}
                      />
                    </td>
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
                        type="email"
                        value={editionForm.email}
                        onChange={(e) => setEditionForm({ ...editionForm, email: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className={inputClasses}
                        value={editionForm.whatsapp}
                        onChange={(e) => setEditionForm({ ...editionForm, whatsapp: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => modification.mutate(l.id)}
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
                  <tr key={l.id} className="border-b border-ardoise/5 last:border-0 hover:bg-brume">
                    <td className="px-4 py-3 text-encre">{l.prenom}</td>
                    <td className="px-4 py-3 text-encre">{l.nom}</td>
                    <td className="px-4 py-3 text-ardoise">{l.email}</td>
                    <td className="px-4 py-3 text-ardoise">{l.whatsapp}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => demarrerEdition(l)}
                          className="font-body text-xs font-semibold text-bleu hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Supprimer « ${l.prenom} ${l.nom} » ?`)) suppression.mutate(l.id);
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
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ardoise">
                    Aucun livreur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
