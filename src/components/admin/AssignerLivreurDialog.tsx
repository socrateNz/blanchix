"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/shadcn/dialog";
import Button from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";

interface Livreur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  whatsapp: string;
}

interface AssignationReponse {
  ok: true;
  livreur: { nom: string; prenom: string; whatsapp: string };
  lienWhatsapp: string;
}

export default function AssignerLivreurDialog({
  orderId,
  orderNumero,
  type,
  livreurActuel,
  triggerLabel,
  open,
  onOpenChange,
}: {
  orderId: string;
  orderNumero: string;
  type: "collecte" | "livraison";
  // Préfixe affiché sur le déclencheur (ex. "Collecte" dans le tableau des commandes, où les
  // deux boutons collecte/livraison apparaissent côte à côte sans autre contexte pour les
  // distinguer). Omis sur la page détail, où une étiquette dt/dd voisine joue déjà ce rôle.
  triggerLabel?: string;
  livreurActuel: { nom: string; prenom?: string } | null;
  // Mode contrôlé (ex. déclenché depuis un item de menu déroulant — voir
  // CommandeActionsMenu.tsx — où le bouton propre à ce composant n'a pas sa place) : quand
  // fournis, aucun déclencheur interne n'est rendu, l'appelant pilote entièrement l'ouverture.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const controle = open !== undefined && onOpenChange !== undefined;
  const [ouvertInterne, setOuvertInterne] = useState(false);
  const ouvert = controle ? open : ouvertInterne;
  const setOuvert = controle ? onOpenChange : setOuvertInterne;
  const [livreurId, setLivreurId] = useState("");

  const { data: livreurs, isLoading } = useQuery({
    queryKey: ["admin-livreurs"],
    queryFn: async () => {
      const { data } = await api.get<Livreur[]>("/admin/livreurs");
      return data;
    },
    enabled: ouvert,
  });

  const assignation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AssignationReponse>(`/admin/orders/${orderId}/livreur`, { type, livreurId });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-commande", orderId] });
      // Correspondance partielle : rafraîchit aussi la liste des commandes (clé dynamique
      // ["admin-commandes", recherche, statut, page]) si ce dialogue y est monté.
      queryClient.invalidateQueries({ queryKey: ["admin-commandes"] });
      setOuvert(false);
      setLivreurId("");
      // Ouvre WhatsApp avec le message prérempli juste après l'assignation — action côté
      // client, le serveur ne fait que fournir le lien (cf. la route d'assignation).
      window.open(data.lienWhatsapp, "_blank", "noopener,noreferrer");
    },
  });

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(prochainOuvert) => {
        setOuvert(prochainOuvert);
        if (!prochainOuvert) assignation.reset();
      }}
    >
      {!controle && (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="font-body text-xs font-semibold text-bleu hover:underline"
        >
          {triggerLabel && `${triggerLabel} : `}
          {livreurActuel ? "Réassigner" : "Assigner"}
        </button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner un livreur — {type === "collecte" ? "Collecte" : "Livraison"}</DialogTitle>
          <DialogDescription>
            Commande {orderNumero}. Le livreur reçoit un email et vous ouvrirez WhatsApp avec un message prérempli.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="font-body text-sm text-ardoise">Chargement des livreurs…</p>}

        {livreurs && livreurs.length === 0 && (
          <p className="font-body text-sm text-ardoise">
            Aucun livreur enregistré — ajoutez-en un dans la section Livreurs.
          </p>
        )}

        {livreurs && livreurs.length > 0 && (
          <select
            className={inputClasses}
            value={livreurId}
            onChange={(e) => setLivreurId(e.target.value)}
          >
            <option value="">Choisir un livreur…</option>
            {livreurs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.prenom} {l.nom}
              </option>
            ))}
          </select>
        )}

        {assignation.isError && (
          <p className="font-body text-sm text-alerte">
            {isAxiosError(assignation.error) && assignation.error.response?.data?.error
              ? String(assignation.error.response.data.error)
              : "Assignation impossible."}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOuvert(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={!livreurId || assignation.isPending}
            onClick={() => assignation.mutate()}
          >
            {assignation.isPending ? "Assignation…" : "Assigner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
