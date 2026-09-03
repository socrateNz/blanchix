"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommande } from "@/context/useCommande";
import { DELAI_LABELS, MAJORATION_DELAI_TAUX, type Delai } from "@/lib/pricing-constants";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const DELAIS = Object.keys(DELAI_LABELS) as Delai[];

export default function StepDelai() {
  const { state, dispatch } = useCommande();
  const router = useRouter();

  useEffect(() => {
    if (state.articles.length === 0 && state.articlesPersonnalises.length === 0) {
      router.replace("/commander/panier");
    }
  }, [state.articles.length, state.articlesPersonnalises.length, router]);

  const [delai, setDelai] = useState<Delai | null>(state.delai);
  const [adresseDifferente, setAdresseDifferente] = useState(state.adresseLivraisonDifferente);
  const [adresse, setAdresse] = useState(state.adresseLivraison);
  const [error, setError] = useState("");

  function handleContinuer() {
    if (!delai) return setError("Choisissez une formule de délai.");
    if (adresseDifferente && (!adresse.quartier.trim() || !adresse.rue.trim())) {
      return setError("Renseignez l'adresse de livraison.");
    }

    dispatch({ type: "SET_DELAI", delai });
    dispatch({ type: "SET_ADRESSE_LIVRAISON_DIFFERENTE", value: adresseDifferente });
    dispatch({ type: "SET_ADRESSE_LIVRAISON", adresse: adresseDifferente ? adresse : state.adresseCollecte });
    router.push("/commander/paiement");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Délai et livraison</h1>
        <p className="mt-1 font-body text-sm text-ardoise">À quelle vitesse voulez-vous récupérer votre linge ?</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {DELAIS.map((d) => {
          const taux = MAJORATION_DELAI_TAUX[d];
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDelai(d)}
              className={`rounded-xl border p-4 text-center transition-all ${
                delai === d ? "border-bleu bg-bleu/10 shadow-sm" : "border-ardoise/15 bg-white hover:border-bleu/50"
              }`}
            >
              <p className="font-display text-sm font-bold text-marine">{DELAI_LABELS[d].label}</p>
              <p className="font-mono text-xs text-ardoise">{DELAI_LABELS[d].duree}</p>
              <p className="mt-1 font-body text-[11px] text-ardoise/70">
                {taux === 0 ? "Tarif de base" : `+${Math.round(taux * 100)}%`}
              </p>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 font-body text-sm text-encre">
        <input
          type="checkbox"
          checked={adresseDifferente}
          onChange={(e) => setAdresseDifferente(e.target.checked)}
          className="h-4 w-4 rounded border-ardoise/40 text-bleu focus:ring-bleu/30"
        />
        Livrer à une adresse différente de la collecte
      </label>

      {adresseDifferente && (
        <div className="flex flex-col gap-4 rounded-xl bg-brume p-4">
          <Field label="Quartier">
            <input
              className={inputClasses}
              value={adresse.quartier}
              onChange={(e) => setAdresse({ ...adresse, quartier: e.target.value })}
            />
          </Field>
          <Field label="Rue">
            <input
              className={inputClasses}
              value={adresse.rue}
              onChange={(e) => setAdresse({ ...adresse, rue: e.target.value })}
            />
          </Field>
          <Field label="Instructions de livraison" optional>
            <input
              className={inputClasses}
              value={adresse.instructions}
              onChange={(e) => setAdresse({ ...adresse, instructions: e.target.value })}
              placeholder="Ex. Appeler avant de monter"
            />
          </Field>
        </div>
      )}

      {error && <p className="font-body text-xs text-alerte">{error}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/commander/panier")}>
          Retour
        </Button>
        <Button type="button" onClick={handleContinuer}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
