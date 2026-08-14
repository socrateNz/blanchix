"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCommande } from "@/context/useCommande";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import CreneauPicker from "@/components/commander/CreneauPicker";

export default function StepAdresse() {
  const { state, dispatch } = useCommande();
  const router = useRouter();

  useEffect(() => {
    if (!state.client.nom) router.replace("/commander/informations");
  }, [state.client.nom, router]);

  const [adresse, setAdresse] = useState(state.adresseCollecte);
  const [creneauId, setCreneauId] = useState(state.creneauCollecteId);
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!adresse.quartier.trim() || !adresse.rue.trim()) {
      setError("Le quartier et la rue sont requis.");
      return;
    }
    if (!creneauId) {
      setError("Choisissez un créneau de collecte.");
      return;
    }

    dispatch({ type: "SET_ADRESSE_COLLECTE", adresse });
    dispatch({ type: "SET_CRENEAU_COLLECTE", creneauId });
    router.push("/commander/panier");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Adresse de collecte</h1>
        <p className="mt-1 font-body text-sm text-ardoise">Où venons-nous récupérer votre linge ?</p>
      </div>

      <Field label="Quartier">
        <input
          className={inputClasses}
          value={adresse.quartier}
          onChange={(e) => setAdresse({ ...adresse, quartier: e.target.value })}
          placeholder="Ex. Bonapriso"
        />
      </Field>

      <Field label="Rue">
        <input
          className={inputClasses}
          value={adresse.rue}
          onChange={(e) => setAdresse({ ...adresse, rue: e.target.value })}
          placeholder="Ex. Rue Njo-Njo, non loin de..."
        />
      </Field>

      <Field label="Instructions de collecte" optional>
        <input
          className={inputClasses}
          value={adresse.instructions}
          onChange={(e) => setAdresse({ ...adresse, instructions: e.target.value })}
          placeholder="Ex. Livrer/collecter chez le gardien"
        />
      </Field>

      <div>
        <span className="font-body text-sm font-semibold text-marine">Créneau de collecte</span>
        <div className="mt-2">
          <CreneauPicker type="collecte" selectedId={creneauId} onSelect={setCreneauId} />
        </div>
      </div>

      {error && <p className="font-body text-xs text-alerte">{error}</p>}

      <div className="mt-2 flex justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/commander/informations")}>
          Retour
        </Button>
        <Button type="submit">Continuer</Button>
      </div>
    </form>
  );
}
