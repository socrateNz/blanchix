"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Banknote, Smartphone } from "lucide-react";
import { useCommande } from "@/context/useCommande";
import { api } from "@/lib/axios";
import { DELAI_LABELS } from "@/lib/pricing-constants";
import Button from "@/components/ui/Button";
import CartSummary from "@/components/commander/CartSummary";
import StatutPaiement from "@/components/commander/StatutPaiement";
import type { OrderResult } from "@/context/commandeReducer";

// Un seul choix "paiement mobile" plutôt que Orange Money/MTN MoMo séparés : avec Codees, ce
// choix se fait sur leur page de paiement hébergée, jamais transmis à notre API (voir
// src/lib/codees.ts — CheckoutSessionCreate n'a aucun champ de moyen de paiement).
const MOYENS_PAIEMENT = [
  { id: "mobile_money", label: "Paiement mobile (Orange Money / MTN MoMo)", icon: Smartphone },
  { id: "espece", label: "Espèces à la collecte", icon: Banknote },
] as const;

export default function StepPaiement() {
  const { state, dispatch } = useCommande();
  const router = useRouter();

  useEffect(() => {
    if (!state.delai) router.replace("/commander/delai");
  }, [state.delai, router]);

  const [moyen, setMoyen] = useState<(typeof MOYENS_PAIEMENT)[number]["id"]>("mobile_money");
  // Toujours false au (re)montage — y compris après le retour de Codees (nouvelle page).
  // Ne passe à true que sur action explicite de l'utilisateur après un échec.
  const [reessayer, setReessayer] = useState(false);
  // URL de la fenêtre de paiement Codees — conservée pour proposer un lien de secours si la
  // popup a été bloquée par le navigateur ou fermée par erreur (voir handleConfirmer).
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  const orderMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<OrderResult & { statut: string }>("/orders", {
        client: state.client,
        adresseCollecte: state.adresseCollecte,
        adresseLivraison: state.adresseLivraison,
        creneauCollecteId: state.creneauCollecteId,
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

  function ouvrirPaiement(url: string) {
    // Codees interdit l'affichage de sa page de paiement dans une iframe (en-tête
    // X-Frame-Options: DENY, vérifié directement sur leur réponse) — impossible de l'intégrer
    // dans un dialogue classique. Une fenêtre popup est le compromis le plus proche : le client
    // ne quitte pas notre page (qui affiche le suivi de statut juste en dessous), seule une
    // fenêtre séparée s'ouvre pour le formulaire de paiement lui-même.
    setCheckoutUrl(url);
    popupRef.current = window.open(url, "codees-checkout", "width=430,height=760");
  }

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
    ouvrirPaiement(url);
  }

  if (state.orderResult && !reessayer) {
    return (
      <div className="flex flex-col gap-4">
        {checkoutUrl && (
          <p className="rounded-xl bg-brume p-3 text-center font-body text-xs text-ardoise">
            Une fenêtre de paiement s&apos;est ouverte. Si elle ne s&apos;affiche pas,{" "}
            <button
              type="button"
              onClick={() => ouvrirPaiement(checkoutUrl)}
              className="font-semibold text-bleu hover:underline"
            >
              cliquez ici pour l&apos;ouvrir
            </button>
            .
          </p>
        )}
        <StatutPaiement
          orderId={state.orderResult.id}
          onSucces={() => {
            popupRef.current?.close();
            dispatch({ type: "RESET" });
          }}
          onEchec={() => {
            popupRef.current?.close();
            setReessayer(true);
          }}
        />
      </div>
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
              <m.icon className="h-4 w-4 text-bleu" strokeWidth={1.8} />
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
              : "Ouverture du paiement…"
            : moyen === "espece"
              ? "Confirmer la commande"
              : "Payer maintenant"}
        </Button>
      </div>
    </div>
  );
}
