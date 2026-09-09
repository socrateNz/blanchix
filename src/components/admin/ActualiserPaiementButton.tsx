"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/axios";
import { STATUT_PAIEMENT_LABELS } from "@/lib/paiement";
import type { OrderStatus } from "@/lib/orderStatuses";

/**
 * Revérifie réellement le statut de paiement auprès de Codees (même action "verifier_paiement"
 * que le bouton "Vérifier le paiement" de la page de détail — voir
 * src/app/admin/(dashboard)/commandes/[id]/page.tsx), mais en icône compacte pour une ligne du
 * tableau des commandes. Visible uniquement quand un paiement en ligne est encore en attente —
 * les autres statuts n'ont rien à revérifier auprès du prestataire.
 */
export default function ActualiserPaiementButton({
  orderId,
  orderNumero,
  statut,
}: {
  orderId: string;
  orderNumero: string;
  statut: OrderStatus;
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

  if (statut !== "EN_ATTENTE_PAIEMENT") return null;

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
