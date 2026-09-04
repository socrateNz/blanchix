"use client";

import { useState } from "react";
import { MoreHorizontal, ArrowRight, Banknote, Ban, Undo2, Truck, PackageCheck, CreditCard } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import {
  PROCHAINE_ETAPE,
  STATUTS_ANNULABLES,
  STATUTS_REMBOURSABLES,
  STATUT_COMMANDE_AFFICHE_LABELS,
  deriveStatutCommandeAffiche,
  type OrderStatus,
} from "@/lib/orderStatuses";
import AssignerLivreurDialog from "@/components/admin/AssignerLivreurDialog";

type Action = "etape_suivante" | "annuler" | "rembourser" | "marquer_paye" | "confirmer_paiement_manuel";

/**
 * Regroupe toutes les actions possibles sur une commande (avancement, paiement, annulation,
 * remboursement, assignation livreur) dans un unique menu déroulant par ligne — remplace
 * l'ancienne pile de boutons texte (CommandeActionsRapides + 2×AssignerLivreurDialog côte à
 * côte), trop lourde visuellement dans un tableau dense.
 *
 * Les deux dialogues d'assignation sont rendus en mode contrôlé (voir AssignerLivreurDialog) :
 * sélectionner l'item correspondant ferme le menu et ouvre le dialogue, plutôt que d'agir
 * directement — l'assignation elle-même nécessite de choisir un livreur.
 */
export default function CommandeActionsMenu({
  orderId,
  orderNumero,
  statut,
  paiement,
  livreurCollecte,
  livreurLivraison,
}: {
  orderId: string;
  orderNumero: string;
  statut: OrderStatus;
  paiement: { methode: string | null; statut: string | null } | null;
  livreurCollecte: { nom: string; prenom?: string } | null;
  livreurLivraison: { nom: string; prenom?: string } | null;
}) {
  const queryClient = useQueryClient();
  const [dialogueCollecteOuvert, setDialogueCollecteOuvert] = useState(false);
  const [dialogueLivraisonOuvert, setDialogueLivraisonOuvert] = useState(false);

  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      await api.patch(`/admin/orders/${orderId}`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commandes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commande", orderId] });
    },
    onError: (err) => {
      window.alert(
        isAxiosError(err) && err.response?.data?.error ? String(err.response.data.error) : "Action impossible."
      );
    },
  });

  const prochaineEtape = PROCHAINE_ETAPE[statut];
  const peutAnnuler = STATUTS_ANNULABLES.includes(statut);
  const peutRembourser = STATUTS_REMBOURSABLES.includes(statut);
  const peutMarquerPaye = paiement?.methode === "espece" && paiement?.statut === "a_percevoir";
  // Paiement en ligne (mobile_money) resté en attente — bascule administrative directe, sans
  // repasser par Codees (voir la page détail pour une vraie revérification auprès du
  // prestataire, via l'action "verifier_paiement").
  const peutConfirmerPaiementManuel = statut === "EN_ATTENTE_PAIEMENT";
  const aucuneAction = !prochaineEtape && !peutMarquerPaye && !peutConfirmerPaiementManuel && !peutAnnuler && !peutRembourser;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ardoise outline-none hover:bg-brume focus-visible:ring-2 focus-visible:ring-cyan"
          aria-label={`Actions — commande ${orderNumero}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {aucuneAction ? (
            <DropdownMenuLabel className="font-normal text-ardoise">Aucune action disponible</DropdownMenuLabel>
          ) : (
            <>
              {prochaineEtape && (
                <DropdownMenuItem disabled={mutation.isPending} onSelect={() => mutation.mutate("etape_suivante")}>
                  <ArrowRight />
                  Marquer {STATUT_COMMANDE_AFFICHE_LABELS[deriveStatutCommandeAffiche(prochaineEtape)].label.toLowerCase()}
                </DropdownMenuItem>
              )}
              {peutMarquerPaye && (
                <DropdownMenuItem
                  disabled={mutation.isPending}
                  onSelect={() => {
                    if (window.confirm("Marquer le paiement en espèces comme perçu ?")) mutation.mutate("marquer_paye");
                  }}
                >
                  <Banknote />
                  Marquer payé
                </DropdownMenuItem>
              )}
              {peutConfirmerPaiementManuel && (
                <DropdownMenuItem
                  disabled={mutation.isPending}
                  onSelect={() => {
                    if (
                      window.confirm(
                        "Confirmer ce paiement en ligne sans revérifier auprès de Codees ? À utiliser seulement si vous avez une confirmation par un autre moyen."
                      )
                    )
                      mutation.mutate("confirmer_paiement_manuel");
                  }}
                >
                  <CreditCard />
                  Payer
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogueCollecteOuvert(true)}>
            <PackageCheck />
            {livreurCollecte ? "Réassigner" : "Assigner"} livreur — Collecte
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialogueLivraisonOuvert(true)}>
            <Truck />
            {livreurLivraison ? "Réassigner" : "Assigner"} livreur — Livraison
          </DropdownMenuItem>

          {(peutAnnuler || peutRembourser) && (
            <>
              <DropdownMenuSeparator />
              {peutAnnuler && (
                <DropdownMenuItem
                  disabled={mutation.isPending}
                  onSelect={() => {
                    if (window.confirm("Annuler cette commande ?")) mutation.mutate("annuler");
                  }}
                >
                  <Ban />
                  Annuler
                </DropdownMenuItem>
              )}
              {peutRembourser && (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={mutation.isPending}
                  onSelect={() => {
                    if (
                      window.confirm(
                        "Marquer cette commande comme remboursée ? Le virement réel doit être effectué séparément via Codees."
                      )
                    )
                      mutation.mutate("rembourser");
                  }}
                >
                  <Undo2 />
                  Rembourser
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AssignerLivreurDialog
        orderId={orderId}
        orderNumero={orderNumero}
        type="collecte"
        livreurActuel={livreurCollecte}
        open={dialogueCollecteOuvert}
        onOpenChange={setDialogueCollecteOuvert}
      />
      <AssignerLivreurDialog
        orderId={orderId}
        orderNumero={orderNumero}
        type="livraison"
        livreurActuel={livreurLivraison}
        open={dialogueLivraisonOuvert}
        onOpenChange={setDialogueLivraisonOuvert}
      />
    </>
  );
}
