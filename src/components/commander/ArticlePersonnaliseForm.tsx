"use client";

import { useState } from "react";
import type { ArticlePersonnaliseDraft } from "@/context/commandeReducer";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function ArticlePersonnaliseForm({
  onAdd,
}: {
  onAdd: (article: ArticlePersonnaliseDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [description, setDescription] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-body text-sm font-semibold text-bleu hover:underline"
      >
        + Ajouter un autre article (hors catalogue)
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-bleu/40 bg-brume/60 p-4">
      <Field label="Nom du vêtement">
        <input
          className={inputClasses}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex. Chaussure Nike blanche"
        />
      </Field>
      <Field label="Quantité">
        <input
          type="number"
          min={1}
          className={inputClasses}
          value={quantite}
          onChange={(e) => setQuantite(Math.max(1, Number(e.target.value)))}
        />
      </Field>
      <Field label="Description" optional>
        <input
          className={inputClasses}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Précisions utiles pour l'atelier"
        />
      </Field>
      <p className="font-body text-xs text-ardoise">
        Cet article n&apos;a pas de prix fixe : nous vous proposerons un prix après inspection, que
        vous pourrez accepter ou refuser.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          className="!px-4 !py-2 text-xs"
          onClick={() => {
            if (!nom.trim()) return;
            onAdd({ nom: nom.trim(), quantiteEstimee: quantite, description: description.trim() });
            setNom("");
            setQuantite(1);
            setDescription("");
            setOpen(false);
          }}
        >
          Ajouter
        </Button>
        <Button type="button" variant="ghost" className="!px-4 !py-2 text-xs" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
