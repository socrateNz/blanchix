"use client";

import type { AdresseDraft } from "@/context/commandeReducer";
import { useZones } from "@/hooks/useZones";
import { formatFCFA } from "@/lib/utils";
import Field, { inputClasses } from "@/components/ui/Field";

/** Zone + lieu-dit + instructions — commun à l'adresse de collecte et à celle de livraison. */
export default function AdresseFields({
  adresse,
  onChange,
  labelInstructions,
  placeholderInstructions,
}: {
  adresse: AdresseDraft;
  onChange: (adresse: AdresseDraft) => void;
  labelInstructions: string;
  placeholderInstructions: string;
}) {
  const { data: zones, isLoading: chargementZones } = useZones();

  return (
    <>
      <Field label="Zone">
        <select
          className={inputClasses}
          value={adresse.zoneId}
          onChange={(e) => onChange({ ...adresse, zoneId: e.target.value })}
          disabled={chargementZones}
        >
          <option value="">{chargementZones ? "Chargement…" : "Sélectionnez une zone"}</option>
          {zones?.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nom} — {formatFCFA(z.prix)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Lieu-dit">
        <input
          className={inputClasses}
          value={adresse.lieuDit}
          onChange={(e) => onChange({ ...adresse, lieuDit: e.target.value })}
          placeholder="Ex. Non loin du carrefour, portail bleu"
        />
      </Field>

      <Field label={labelInstructions} optional>
        <input
          className={inputClasses}
          value={adresse.instructions}
          onChange={(e) => onChange({ ...adresse, instructions: e.target.value })}
          placeholder={placeholderInstructions}
        />
      </Field>
    </>
  );
}
