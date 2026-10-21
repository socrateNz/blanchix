"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { RotateCcw, Search, X } from "lucide-react";
import { api } from "@/lib/axios";
import { useCommande } from "@/context/useCommande";
import type { ArticlePanier } from "@/context/commandeReducer";
import { useCatalog } from "@/hooks/useCatalog";
import { useSettings } from "@/hooks/useSettings";
import { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import CartSummary from "@/components/commander/CartSummary";
import ArticlePersonnaliseForm from "@/components/commander/ArticlePersonnaliseForm";
import { formatFCFA } from "@/lib/utils";
import { vibrer } from "@/lib/haptics";

// Recherche insensible à la casse et aux accents : « chemise delicate » trouve « Chemise délicate ».
function normaliser(texte: string) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

interface CommandePassee {
  id: string;
  numero: string;
}

export default function StepPanier() {
  const { state, dispatch } = useCommande();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: catalog, isLoading, isError } = useCatalog();
  const { data: settings } = useSettings();

  const [notes, setNotes] = useState(state.notesClient);
  const [error, setError] = useState("");
  const [recherche, setRecherche] = useState("");

  const { data: mesCommandes } = useQuery({
    queryKey: ["mes-commandes"],
    queryFn: async () => {
      const { data } = await api.get<CommandePassee[]>("/mes-commandes");
      return data;
    },
    enabled: !!session?.user,
  });
  const derniereCommande = mesCommandes?.[0] ?? null;

  // Recopie les articles du catalogue de la dernière commande, aux prix ACTUELS du catalogue
  // (le serveur les relit de toute façon) — les articles retirés du catalogue depuis sont
  // ignorés, les articles personnalisés aussi (leur prix reste à confirmer à chaque fois).
  const reprise = useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.get<{ articles: { catalogItemId: string; quantite: number }[] }>(
        `/mes-commandes/${orderId}`
      );
      return data.articles;
    },
    onSuccess: (articlesPasses) => {
      const parId = new Map(catalog?.map((item) => [item.id, item]));
      const articles: ArticlePanier[] = articlesPasses.flatMap((a) => {
        const item = parId.get(String(a.catalogItemId));
        return item ? [{ catalogItemId: item.id, nom: item.nom, prixUnitaire: item.prixUnitaire, quantite: a.quantite }] : [];
      });
      if (articles.length === 0) {
        setError("Les articles de votre dernière commande ne sont plus disponibles.");
        return;
      }
      vibrer(8);
      setError("");
      dispatch({ type: "REMPLACER_ARTICLES", articles });
    },
  });

  function getQuantite(catalogItemId: string) {
    return state.articles.find((a) => a.catalogItemId === catalogItemId)?.quantite ?? 0;
  }

  function updateQuantite(item: { id: string; nom: string; prixUnitaire: number }, quantite: number) {
    setError("");
    dispatch({
      type: "SET_ARTICLE_QTY",
      article: { catalogItemId: item.id, nom: item.nom, prixUnitaire: item.prixUnitaire },
      quantite,
    });
  }

  const termes = normaliser(recherche).split(/\s+/).filter(Boolean);
  const catalogueFiltre = (catalog ?? []).filter((item) => {
    const cible = normaliser(`${item.nom} ${item.categorie ?? ""}`);
    return termes.every((t) => cible.includes(t));
  });

  const sousTotal = state.articles.reduce((sum, a) => sum + a.prixUnitaire * a.quantite, 0);
  const commandeMinimale = settings?.commandeMinimale ?? 0;
  const montantManquant = Math.max(0, commandeMinimale - sousTotal);

  function handleContinuer() {
    if (state.articles.length === 0 && state.articlesPersonnalises.length === 0) {
      vibrer([30, 40, 30]);
      setError("Ajoutez au moins un article avant de continuer.");
      return;
    }
    if (montantManquant > 0) {
      vibrer([30, 40, 30]);
      setError(`Ajoutez encore ${formatFCFA(montantManquant)} d’articles pour continuer.`);
      return;
    }
    dispatch({ type: "SET_NOTES_CLIENT", notes });
    router.push("/commander/adresse");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Votre panier</h1>
        <p className="mt-1 font-body text-sm text-ardoise">
          Choisissez vos vêtements — le total se met à jour automatiquement.
        </p>
      </div>

      {derniereCommande && catalog && (
        <button
          type="button"
          onClick={() => reprise.mutate(derniereCommande.id)}
          disabled={reprise.isPending}
          className="flex items-center gap-3 rounded-xl border border-bleu/30 bg-bleu/5 p-4 text-left transition-colors hover:bg-bleu/10 disabled:opacity-60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-bleu">
            <RotateCcw className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block font-body text-sm font-semibold text-marine">
              {reprise.isPending ? "Chargement…" : "Reprendre ma dernière commande"}
            </span>
            <span className="block font-body text-xs text-ardoise">
              Mêmes articles que la commande {derniereCommande.numero} — modifiables ensuite.
            </span>
          </span>
        </button>
      )}

      {isLoading && <p className="font-body text-sm text-ardoise">Chargement du catalogue…</p>}
      {isError && (
        <p className="font-body text-sm text-alerte">Impossible de charger le catalogue pour le moment.</p>
      )}

      {catalog && catalog.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise/60" />
          <input
            type="text"
            inputMode="search"
            className={`${inputClasses} pl-9 pr-9`}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un vêtement (ex. chemise, couette…)"
            aria-label="Rechercher dans le catalogue"
            enterKeyHint="search"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ardoise hover:bg-brume"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {catalog && catalogueFiltre.length === 0 && recherche.trim() && (
        <p className="font-body text-sm text-ardoise">
          Aucun article ne correspond à « {recherche.trim()} ». Vous pouvez l’ajouter ci-dessous comme
          article personnalisé (prix confirmé par Blanchix).
        </p>
      )}

      {catalog && (
        <div className="flex flex-col divide-y divide-ardoise/10">
          {catalogueFiltre.map((item) => {
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
        onAdd={(article) => {
          setError("");
          dispatch({ type: "ADD_ARTICLE_PERSONNALISE", article });
        }}
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

      {/* Toujours visible pendant le défilement du catalogue — au-dessus de la barre d'onglets
          mobile (72px, cf. TabBar), en bas de l'écran sur desktop. Le minimum de commande et les
          erreurs s'affichent ICI, à côté du bouton : affichés plus bas dans la page, ils restaient
          hors de l'écran et le bouton semblait ne rien faire (constaté en production). */}
      <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-20 -mx-2 rounded-xl border border-marine/10 bg-white/95 p-3 shadow-lg backdrop-blur sm:bottom-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-xs text-ardoise">Sous-total</p>
            <p className="font-mono text-base font-bold text-marine">{formatFCFA(sousTotal)}</p>
            {montantManquant > 0 && (
              <p className="font-body text-[11px] font-semibold text-attente">
                Minimum {formatFCFA(commandeMinimale)} — encore {formatFCFA(montantManquant)}
              </p>
            )}
          </div>
          <Button type="button" onClick={handleContinuer} className="shrink-0">
            Continuer
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 border-t border-ardoise/10 pt-2 font-body text-xs font-semibold text-alerte">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
