"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { formatFCFA } from "@/lib/utils";
import { vibrer } from "@/lib/haptics";
import Button, { buttonClasses } from "@/components/ui/Button";

interface StatutPaiementResponse {
  statutCommande: string;
  statutPaiement: string | null;
  methodePaiement: string | null;
  numero: string;
  sousTotal: number;
  fraisLivraison: number;
  majorationDelai: number;
  reduction: number;
  total: number;
}

export default function StatutPaiement({
  orderId,
  onSucces,
  onEchec,
}: {
  orderId: string;
  onSucces: () => void;
  onEchec: () => void;
}) {
  const router = useRouter();
  const { data, isError } = useQuery({
    queryKey: ["payment-status", orderId],
    queryFn: async () => {
      const { data } = await api.get<StatutPaiementResponse>("/payments/status", {
        params: { orderId },
      });
      return data;
    },
    refetchInterval: (query) => {
      const statut = query.state.data?.statutCommande;
      return !statut || statut === "EN_ATTENTE_PAIEMENT" ? 3000 : false;
    },
  });

  const echec = data?.statutCommande === "PAIEMENT_ECHOUE";
  const succes = Boolean(data) && !echec && data!.statutCommande !== "EN_ATTENTE_PAIEMENT";

  useEffect(() => {
    if (succes) {
      vibrer([10, 40, 10]);
      onSucces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [succes]);

  if (echec) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-alerte/15 text-2xl text-alerte">
          ✕
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-marine">Paiement échoué</h1>
          <p className="mt-1 font-body text-sm text-ardoise">
            Le paiement n&apos;a pas abouti. Votre commande est conservée, vous pouvez réessayer sans
            tout ressaisir.
          </p>
        </div>
        <Button type="button" onClick={onEchec}>
          Réessayer le paiement
        </Button>
      </div>
    );
  }

  if (succes && data) {
    const espece = data.methodePaiement === "espece";
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-succes/15 text-2xl text-succes">
          ✓
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-marine">
            {espece ? "Commande confirmée" : "Paiement confirmé"}
          </h1>
          <p className="mt-1 font-mono text-sm text-ardoise">{data.numero}</p>
        </div>

        <div className="w-full rounded-xl bg-brume p-4 text-left font-body text-sm">
          <div className="flex justify-between py-1">
            <span className="text-ardoise">Sous-total</span>
            <span className="font-mono">{formatFCFA(data.sousTotal)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-ardoise">Livraison</span>
            <span className="font-mono">{formatFCFA(data.fraisLivraison)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-ardoise">Majoration délai</span>
            <span className="font-mono">{formatFCFA(data.majorationDelai)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-ardoise/15 pt-2 font-bold text-marine">
            <span>Total</span>
            <span className="font-mono">{formatFCFA(data.total)}</span>
          </div>
        </div>

        <p className="font-body text-sm text-ardoise">
          {espece
            ? "Vous réglerez ce montant en espèces au coursier lors de la collecte."
            : "Votre commande est payée et sera bientôt collectée."}
        </p>

        <div className="flex gap-3">
          <a
            href={`/api/orders/${orderId}/recu`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("ghost")}
          >
            Télécharger le reçu
          </a>
          <Button type="button" onClick={() => router.push("/")}>
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-bleu border-t-transparent" />
      <p className="font-body text-sm text-ardoise">Vérification du paiement en cours…</p>
      {isError && (
        <p className="font-body text-xs text-alerte">Connexion interrompue, nouvelle tentative…</p>
      )}
    </div>
  );
}
