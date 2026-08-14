"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Banknote } from "lucide-react";
import { useCommande } from "@/context/useCommande";
import { api } from "@/lib/axios";
import { DELAI_LABELS } from "@/lib/pricing-constants";
import Button from "@/components/ui/Button";
import CartSummary from "@/components/commander/CartSummary";
import StatutPaiement from "@/components/commander/StatutPaiement";
import type { OrderResult } from "@/context/commandeReducer";

const MOYENS_PAIEMENT = [
  { id: "orange_money", label: "Orange Money", couleur: "#FF7900" },
  { id: "mtn_momo", label: "MTN Mobile Money", couleur: "#FFCB05" },
  { id: "espece", label: "Espèces à la collecte", icon: Banknote },
] as const;

export default function StepPaiement() {
  const { state, dispatch } = useCommande();
  const router = useRouter();

  useEffect(() => {
    if (!state.delai || !state.creneauLivraisonId) router.replace("/commander/delai");
  }, [state.delai, state.creneauLivraisonId, router]);

  const [moyen, setMoyen] = useState<(typeof MOYENS_PAIEMENT)[number]["id"]>("orange_money");
  // Toujours false au (re)montage — y compris après le retour de MoneyFusion (nouvelle page).
  // Ne passe à true que sur action explicite de l'utilisateur après un échec.
  const [reessayer, setReessayer] = useState(false);

  const orderMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<OrderResult & { statut: string }>("/orders", {
        client: state.client,
        adresseCollecte: state.adresseCollecte,
        adresseLivraison: state.adresseLivraison,
        creneauCollecteId: state.creneauCollecteId,
        creneauLivraisonId: state.creneauLivraisonId,
        articles: state.articles.map((a) => ({ catalogItemId: a.catalogItemId, quantite: a.quantite })),
        articlesPersonnalises: state.articlesPersonnalises,
        notesClient: state.notesClient,
        delai: state.delai,
      });
      return data;
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (variables: { orderId: string; moyen: string }) => {
      const { data } = await api.post<{ url: string | null; token?: string }>("/payments/initiate", variables);
      return data;
    },
  });

  async function handleConfirmer() {
    let orderId = state.orderResult?.id;

    if (!orderId) {
      const order = await orderMutation.mutateAsync();
      dispatch({
        type: "SET_ORDER_RESULT",
        result: {
          id: order.id,
          numero: order.numero,
          sousTotal: order.sousTotal,
          fraisLivraison: order.fraisLivraison,
          majorationDelai: order.majorationDelai,
          reduction: order.reduction,
          total: order.total,
        },
      });
      orderId = order.id;
    }

    const { url } = await paymentMutation.mutateAsync({ orderId, moyen });
    if (!url) {
      // Espèces : rien à initier auprès d'un prestataire, la commande est déjà passée à
      // l'étape suivante côté serveur — on affiche directement l'écran de confirmation.
      return;
    }
    // Départ vers la page de paiement hébergée par MoneyFusion — le suivi reprend au retour
    // via l'état persisté (sessionStorage) plutôt que via les paramètres de l'URL de retour,
    // dont le format exact ajouté par MoneyFusion n'est pas garanti.
    window.location.assign(url);
  }

  if (state.orderResult && !reessayer) {
    return (
      <StatutPaiement
        orderId={state.orderResult.id}
        onSucces={() => dispatch({ type: "RESET" })}
        onEchec={() => setReessayer(true)}
      />
    );
  }

  const erreur = orderMutation.error ?? paymentMutation.error;
  const enCours = orderMutation.isPending || paymentMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Récapitulatif et paiement</h1>
        <p className="mt-1 font-body text-sm text-ardoise">Vérifiez votre commande avant de valider.</p>
      </div>

      <div className="rounded-xl bg-brume p-4">
        <CartSummary articles={state.articles} articlesPersonnalises={state.articlesPersonnalises} />
      </div>

      <dl className="grid grid-cols-2 gap-y-2 font-body text-sm">
        <dt className="text-ardoise">Délai</dt>
        <dd className="text-right text-encre">{state.delai ? DELAI_LABELS[state.delai].label : "—"}</dd>
        <dt className="text-ardoise">Collecte</dt>
        <dd className="text-right text-encre">
          {state.adresseCollecte.quartier}, {state.adresseCollecte.rue}
        </dd>
        <dt className="text-ardoise">Livraison</dt>
        <dd className="text-right text-encre">
          {state.adresseLivraison.quartier}, {state.adresseLivraison.rue}
        </dd>
      </dl>

      <div>
        <span className="font-body text-sm font-semibold text-marine">Moyen de paiement</span>
        <div className="mt-2 flex flex-wrap gap-3">
          {MOYENS_PAIEMENT.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMoyen(m.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-body text-sm font-medium transition-all ${
                moyen === m.id ? "border-bleu bg-bleu/10 text-marine shadow-sm" : "border-ardoise/15 bg-white text-encre"
              }`}
            >
              {"couleur" in m ? (
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.couleur }} />
              ) : (
                <m.icon className="h-4 w-4 text-succes" strokeWidth={1.8} />
              )}
              {m.label}
            </button>
          ))}
        </div>
        {moyen === "espece" && (
          <p className="mt-2 font-body text-xs text-ardoise">
            Vous réglerez le montant total en espèces directement au coursier lors de la collecte.
          </p>
        )}
      </div>

      {erreur && (
        <p className="font-body text-sm text-alerte">
          {isAxiosError(erreur) && erreur.response?.data?.error
            ? String(erreur.response.data.error)
            : "Une erreur est survenue. Merci de réessayer."}
        </p>
      )}

      <div className="flex justify-between">
        {!state.orderResult && (
          <Button type="button" variant="ghost" onClick={() => router.push("/commander/delai")}>
            Retour
          </Button>
        )}
        <Button type="button" onClick={handleConfirmer} disabled={enCours} className="ml-auto">
          {enCours
            ? moyen === "espece"
              ? "Confirmation…"
              : "Redirection en cours…"
            : moyen === "espece"
              ? "Confirmer la commande"
              : "Payer maintenant"}
        </Button>
      </div>
    </div>
  );
}
