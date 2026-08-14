"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommande } from "@/context/useCommande";
import { useCatalog } from "@/hooks/useCatalog";
import { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import CartSummary from "@/components/commander/CartSummary";
import ArticlePersonnaliseForm from "@/components/commander/ArticlePersonnaliseForm";
import { formatFCFA } from "@/lib/utils";
import { vibrer } from "@/lib/haptics";

export default function StepPanier() {
  const { state, dispatch } = useCommande();
  const router = useRouter();
  const { data: catalog, isLoading, isError } = useCatalog();

  useEffect(() => {
    if (!state.creneauCollecteId) router.replace("/commander/adresse");
  }, [state.creneauCollecteId, router]);

  const [notes, setNotes] = useState(state.notesClient);
  const [error, setError] = useState("");

  function getQuantite(catalogItemId: string) {
    return state.articles.find((a) => a.catalogItemId === catalogItemId)?.quantite ?? 0;
  }

  function updateQuantite(item: { id: string; nom: string; prixUnitaire: number }, quantite: number) {
    dispatch({
      type: "SET_ARTICLE_QTY",
      article: { catalogItemId: item.id, nom: item.nom, prixUnitaire: item.prixUnitaire },
      quantite,
    });
  }

  function handleContinuer() {
    if (state.articles.length === 0 && state.articlesPersonnalises.length === 0) {
      setError("Ajoutez au moins un article avant de continuer.");
      return;
    }
    dispatch({ type: "SET_NOTES_CLIENT", notes });
    router.push("/commander/delai");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Votre panier</h1>
        <p className="mt-1 font-body text-sm text-ardoise">
          Choisissez vos vêtements — le total se met à jour automatiquement.
        </p>
      </div>

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement du catalogue…</p>}
      {isError && (
        <p className="font-body text-sm text-alerte">Impossible de charger le catalogue pour le moment.</p>
      )}

      {catalog && (
        <div className="flex flex-col divide-y divide-ardoise/10">
          {catalog.map((item) => {
            const quantite = getQuantite(item.id);
            return (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-sm font-semibold text-encre">{item.nom}</p>
                  <p className="font-mono text-xs text-ardoise">{formatFCFA(item.prixUnitaire)}</p>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <button
                    type="button"
                    aria-label={`Retirer un ${item.nom}`}
                    onClick={() => {
                      vibrer(8);
                      updateQuantite(item, Math.max(0, quantite - 1));
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-ardoise/25 text-marine hover:border-bleu"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm text-encre">{quantite}</span>
                  <button
                    type="button"
                    aria-label={`Ajouter un ${item.nom}`}
                    onClick={() => {
                      vibrer(8);
                      updateQuantite(item, quantite + 1);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-ardoise/25 text-marine hover:border-bleu"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ArticlePersonnaliseForm
        onAdd={(article) => dispatch({ type: "ADD_ARTICLE_PERSONNALISE", article })}
      />

      {state.articlesPersonnalises.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {state.articlesPersonnalises.map((a, i) => (
            <li key={i} className="flex items-center justify-between font-body text-sm">
              <span>
                {a.nom} × {a.quantiteEstimee}{" "}
                <span className="text-xs text-attente">(prix à confirmer)</span>
              </span>
              <button
                type="button"
                onClick={() => dispatch({ type: "REMOVE_ARTICLE_PERSONNALISE", index: i })}
                className="font-body text-xs text-alerte hover:underline"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label className="font-body text-sm font-semibold text-marine">
          Notes sur le linge <span className="ml-1 font-normal text-ardoise/60">(facultatif)</span>
        </label>
        <textarea
          className={`mt-1.5 ${inputClasses}`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex. Ne pas utiliser de parfum"
        />
      </div>

      <div className="rounded-xl bg-brume p-4">
        <CartSummary articles={state.articles} articlesPersonnalises={state.articlesPersonnalises} />
      </div>

      {error && <p className="font-body text-xs text-alerte">{error}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/commander/adresse")}>
          Retour
        </Button>
        <Button type="button" onClick={handleContinuer}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
