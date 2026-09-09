"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/axios";
import { STATUT_PAIEMENT_LABELS } from "@/lib/paiement";

/**
 * Revérifie réellement le statut de paiement auprès de Codees (même action "verifier_paiement"
 * que le bouton "Vérifier le paiement" de la page de détail — voir
 * src/app/admin/(dashboard)/commandes/[id]/page.tsx), mais en icône compacte pour une ligne du
 * tableau des commandes.
 *
 * Visible sur TOUTES les commandes (pas seulement "en attente de paiement") — sur demande
 * explicite : un statut "échoué"/"expiré" en base peut lui-même être erroné (webhook jamais
 * reçu, faux négatif), et le seul moyen de le corriger est de forcer une revérification même
 * sur un dossier qu'on pensait clos. La route API applique `forcer: true` pour cette raison
 * (voir src/services/payment.ts). Sur une commande sans aucune tentative de paiement (espèces,
 * jamais initiée...), l'action échoue simplement avec un message clair plutôt que de planter.
 */
export default function ActualiserPaiementButton({
  orderId,
  orderNumero,
}: {
  orderId: string;
  orderNumero: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<{ statut: string; statutPaiement: string }>(`/admin/orders/${orderId}`, {
        action: "verifier_paiement",
      });
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-commandes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commande", orderId] });
      window.alert(
        `Statut du paiement chez Codees : ${STATUT_PAIEMENT_LABELS[result.statutPaiement] ?? result.statutPaiement}`
      );
    },
    onError: (err) => {
      window.alert(
        isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : "Vérification impossible."
      );
    },
  });

  return (
    <button
      type="button"
      title="Actualiser le statut de paiement"
      aria-label={`Actualiser le statut de paiement de la commande ${orderNumero}`}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ardoise outline-none hover:bg-brume focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`} />
    </button>
  );
}
