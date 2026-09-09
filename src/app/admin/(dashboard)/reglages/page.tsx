"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

interface Reglages {
  commandeMinimale: number;
  livraisonGratuiteActive: boolean;
  livraisonGratuiteSeuil: number;
}

export default function AdminReglagesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reglages"],
    queryFn: async () => {
      const { data } = await api.get<Reglages>("/admin/settings");
      return data;
    },
  });

  const [commandeMinimale, setCommandeMinimale] = useState("");
  const [livraisonGratuiteActive, setLivraisonGratuiteActive] = useState(false);
  const [livraisonGratuiteSeuil, setLivraisonGratuiteSeuil] = useState("");
  const [chargeInitiale, setChargeInitiale] = useState(false);

  useEffect(() => {
    if (!data || chargeInitiale) return;
    // setState différé (plutôt qu'appelé directement dans l'effet) — même contrainte que
    // rencontrée ailleurs dans ce tunnel avec react-hooks/set-state-in-effect.
    Promise.resolve().then(() => {
      setCommandeMinimale(String(data.commandeMinimale));
      setLivraisonGratuiteActive(data.livraisonGratuiteActive);
      setLivraisonGratuiteSeuil(String(data.livraisonGratuiteSeuil));
      setChargeInitiale(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const enregistrement = useMutation({
    mutationFn: async () => {
      await api.patch("/admin/settings", {
        commandeMinimale: Number(commandeMinimale),
        livraisonGratuiteActive,
        livraisonGratuiteSeuil: Number(livraisonGratuiteSeuil),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reglages"] }),
  });

  // Rattrapage ponctuel : attribue les points de fidélité aux commandes déjà confirmées avant
  // l'introduction de cette règle (voir src/app/api/admin/loyalty/backfill/route.ts). Se
  // relance sans risque, les commandes déjà créditées sont ignorées automatiquement.
  const rattrapagePoints = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ commandesTraitees: number; pointsAttribues: number }>(
        "/admin/loyalty/backfill"
      );
      return data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Réglages</h1>
        <p className="mt-1 font-body text-sm text-ardoise">Règles appliquées à toute nouvelle commande.</p>
      </div>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement…</p>}

      {data && (
        <form
          className="flex flex-col gap-5 rounded-2xl border border-marine/12 bg-white p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            enregistrement.mutate();
          }}
        >
          <div>
            <h2 className="font-body text-sm font-semibold text-marine">Commande minimale</h2>
            <p className="mt-1 font-body text-xs text-ardoise">
              En dessous de ce montant (hors frais de livraison), la commande est bloquée.
            </p>
            <div className="mt-3 max-w-xs">
              <Field label="Montant minimum (FCFA)">
                <input
                  className={inputClasses}
                  type="number"
                  min={0}
                  value={commandeMinimale}
                  onChange={(e) => setCommandeMinimale(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-ardoise/10 pt-5">
            <label className="flex items-center gap-2 font-body text-sm font-semibold text-marine">
              <input
                type="checkbox"
                checked={livraisonGratuiteActive}
                onChange={(e) => setLivraisonGratuiteActive(e.target.checked)}
                className="h-4 w-4 rounded border-ardoise/30 text-bleu focus:ring-2 focus:ring-bleu/30"
              />
              Livraison gratuite au-delà d&apos;un montant
            </label>
            <p className="mt-1 font-body text-xs text-ardoise">
              Ex. si activé avec un seuil de 5000 FCFA, une commande de 5000 FCFA ou plus (hors frais de
              livraison) n&apos;a rien à payer pour la livraison.
            </p>
            <div className="mt-3 max-w-xs">
              <Field label="Seuil (FCFA)">
                <input
                  className={inputClasses}
                  type="number"
                  min={0}
                  disabled={!livraisonGratuiteActive}
                  value={livraisonGratuiteSeuil}
                  onChange={(e) => setLivraisonGratuiteSeuil(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={enregistrement.isPending}>
              Enregistrer
            </Button>
            {enregistrement.isSuccess && (
              <span className="font-body text-sm text-succes">Enregistré.</span>
            )}
            {enregistrement.isError && (
              <span className="font-body text-sm text-alerte">
                {isAxiosError(enregistrement.error) && enregistrement.error.response?.data?.error
                  ? JSON.stringify(enregistrement.error.response.data.error)
                  : "Impossible d'enregistrer."}
              </span>
            )}
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-marine/12 bg-white p-6 shadow-sm">
        <h2 className="font-body text-sm font-semibold text-marine">Maintenance</h2>
        <p className="mt-1 font-body text-xs text-ardoise">
          Attribue les points de fidélité (500 FCFA = 1 point) aux commandes déjà confirmées avant
          l&apos;introduction de cette règle. Sans effet sur les commandes déjà créditées — peut être relancé
          sans risque.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={rattrapagePoints.isPending}
            onClick={() => rattrapagePoints.mutate()}
          >
            {rattrapagePoints.isPending ? "Traitement…" : "Rattraper les points de fidélité"}
          </Button>
          {rattrapagePoints.isSuccess && (
            <span className="font-body text-sm text-succes">
              {rattrapagePoints.data.commandesTraitees} commande(s) créditée(s), {rattrapagePoints.data.pointsAttribues}{" "}
              point(s) attribué(s).
            </span>
          )}
          {rattrapagePoints.isError && <span className="font-body text-sm text-alerte">Échec du rattrapage.</span>}
        </div>
      </div>
    </div>
  );
}
