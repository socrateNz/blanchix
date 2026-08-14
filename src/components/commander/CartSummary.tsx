import type { ArticlePanier, ArticlePersonnaliseDraft } from "@/context/commandeReducer";
import { formatFCFA } from "@/lib/utils";

export default function CartSummary({
  articles,
  articlesPersonnalises,
}: {
  articles: ArticlePanier[];
  articlesPersonnalises: ArticlePersonnaliseDraft[];
}) {
  const sousTotal = articles.reduce((sum, a) => sum + a.prixUnitaire * a.quantite, 0);

  if (articles.length === 0 && articlesPersonnalises.length === 0) {
    return <p className="font-body text-sm text-ardoise">Votre panier est vide.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {articles.map((a) => (
        <div key={a.catalogItemId} className="flex justify-between font-body text-sm">
          <span className="text-encre">
            {a.nom} <span className="text-ardoise">× {a.quantite}</span>
          </span>
          <span className="font-mono text-ardoise">{formatFCFA(a.prixUnitaire * a.quantite)}</span>
        </div>
      ))}
      {articlesPersonnalises.map((a, i) => (
        <div key={i} className="flex justify-between font-body text-sm">
          <span className="text-encre">
            {a.nom} <span className="text-ardoise">× {a.quantiteEstimee}</span>
          </span>
          <span className="font-mono text-attente">prix à confirmer</span>
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t border-ardoise/15 pt-2 font-body text-sm font-bold">
        <span className="text-marine">Sous-total</span>
        <span className="font-mono text-marine">{formatFCFA(sousTotal)}</span>
      </div>
    </div>
  );
}
