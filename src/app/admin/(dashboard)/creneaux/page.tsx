"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import { PLAGES_HORAIRES } from "@/lib/slots-constants";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface Creneau {
  id: string;
  date: string;
  plageHoraire: string;
  type: "collecte" | "livraison";
  capaciteMax: number;
  reserves: number;
  statut: "ouvert" | "complet" | "bloque";
}

interface FormCreneau {
  date: string;
  plageHoraire: string;
  type: "collecte" | "livraison";
  capaciteMax: string;
}

const FORM_VIDE: FormCreneau = { date: "", plageHoraire: PLAGES_HORAIRES[0], type: "collecte", capaciteMax: "5" };

export default function AdminCreneauxPage() {
  const queryClient = useQueryClient();
  const [filtreType, setFiltreType] = useState<"collecte" | "livraison" | "">("");
  const [form, setForm] = useState<FormCreneau>(FORM_VIDE);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-creneaux", filtreType],
    queryFn: async () => {
      const { data } = await api.get<Creneau[]>("/admin/slots", { params: { type: filtreType || undefined } });
      return data;
    },
  });

  const invalider = () => queryClient.invalidateQueries({ queryKey: ["admin-creneaux"] });

  const creation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/slots", { ...form, capaciteMax: Number(form.capaciteMax) });
    },
    onSuccess: () => {
      setForm(FORM_VIDE);
      invalider();
    },
  });

  const bascule = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      await api.patch(`/admin/slots/${id}`, { statut });
    },
    onSuccess: invalider,
  });

  const suppression = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/slots/${id}`);
    },
    onSuccess: invalider,
    onError: (err) => {
      window.alert(
        isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : "Suppression impossible."
      );
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-marine">Créneaux</h1>

      <form
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-marine/12 bg-white p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          creation.mutate();
        }}
      >
        <Field label="Date">
          <input
            className={`${inputClasses} w-40`}
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </Field>
        <Field label="Plage horaire">
          <select
            className={`${inputClasses} w-40`}
            value={form.plageHoraire}
            onChange={(e) => setForm({ ...form, plageHoraire: e.target.value })}
          >
            {PLAGES_HORAIRES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            className={`${inputClasses} w-32`}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "collecte" | "livraison" })}
          >
            <option value="collecte">Collecte</option>
            <option value="livraison">Livraison</option>
          </select>
        </Field>
        <Field label="Capacité">
          <input
            className={`${inputClasses} w-24`}
            type="number"
            min={1}
            value={form.capaciteMax}
            onChange={(e) => setForm({ ...form, capaciteMax: e.target.value })}
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
              : "Impossible d'ajouter le créneau."}
          </p>
        )}
      </form>

      <div className="flex gap-2">
        {(["", "collecte", "livraison"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFiltreType(t)}
            className={`rounded-full px-3.5 py-1.5 font-body text-sm font-medium transition-colors ${
              filtreType === t ? "bg-marine text-white" : "bg-white text-ardoise"
            }`}
          >
            {t === "" ? "Tous" : t === "collecte" ? "Collecte" : "Livraison"}
          </button>
        ))}
      </div>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}

      {data && (
        <div className="overflow-x-auto rounded-2xl border border-marine/12 bg-white shadow-sm">
          <table className="w-full font-body text-sm">
            <thead className="border-b border-ardoise/10 text-left text-xs font-semibold text-ardoise">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Plage</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Places</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-b border-ardoise/5 last:border-0 hover:bg-brume">
                  <td className="px-4 py-3 text-encre">{new Date(c.date).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3 text-encre">{c.plageHoraire}</td>
                  <td className="px-4 py-3 text-ardoise">{c.type}</td>
                  <td className="px-4 py-3 font-mono text-encre">
                    {c.reserves} / {c.capaciteMax}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        c.statut === "ouvert"
                          ? "bg-succes/15 text-succes"
                          : c.statut === "bloque"
                            ? "bg-alerte/15 text-alerte"
                            : "bg-ardoise/10 text-ardoise"
                      }`}
                    >
                      {c.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => bascule.mutate({ id: c.id, statut: c.statut === "bloque" ? "ouvert" : "bloque" })}
                        className="font-body text-xs font-semibold text-bleu hover:underline"
                      >
                        {c.statut === "bloque" ? "Débloquer" : "Bloquer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Supprimer ce créneau ?")) suppression.mutate(c.id);
                        }}
                        className="font-body text-xs font-semibold text-alerte hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ardoise">
                    Aucun créneau.
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
