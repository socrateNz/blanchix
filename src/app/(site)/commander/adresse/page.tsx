"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Check } from "lucide-react";
import { api } from "@/lib/axios";
import { useCommande } from "@/context/useCommande";
import Field, { inputClasses } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CreneauPicker from "@/components/commander/CreneauPicker";

interface AdresseEnregistree {
  id: string;
  label?: string;
  quartier: string;
  rue: string;
  instructions?: string;
  parDefaut?: boolean;
}

export default function StepAdresse() {
  const { state, dispatch } = useCommande();
  const router = useRouter();
  const { data: session, status: statutSession } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!state.client.nom) router.replace("/commander/informations");
  }, [state.client.nom, router]);

  const { data: adresses, isLoading: chargementAdresses } = useQuery({
    queryKey: ["mes-adresses"],
    queryFn: async () => {
      const { data } = await api.get<AdresseEnregistree[]>("/mes-adresses");
      return data;
    },
    enabled: !!session?.user,
  });

  const residence = adresses?.find((a) => a.parDefaut) ?? adresses?.[0] ?? null;
  const verificationEnCours = statutSession === "loading" || (!!session?.user && chargementAdresses);

  const [saisieManuelle, setSaisieManuelle] = useState(false);
  const [residenceSelectionnee, setResidenceSelectionnee] = useState(false);
  const [adresse, setAdresse] = useState(state.adresseCollecte);
  const [creneauId, setCreneauId] = useState(state.creneauCollecteId);
  const [definirResidence, setDefinirResidence] = useState(false);
  const [error, setError] = useState("");

  const enregistrement = useMutation({
    mutationFn: async () => {
      await api.post("/mes-adresses", adresse);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mes-adresses"] }),
  });

  function utiliserResidence() {
    if (!residence) return;
    setAdresse({ quartier: residence.quartier, rue: residence.rue, instructions: residence.instructions ?? "" });
    setSaisieManuelle(false);
    setResidenceSelectionnee(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!adresse.quartier.trim() || !adresse.rue.trim()) {
      setError("Le quartier et la rue sont requis.");
      return;
    }
    if (!creneauId) {
      setError("Choisissez un créneau de collecte.");
      return;
    }

    if (definirResidence) {
      try {
        await enregistrement.mutateAsync();
      } catch {
        // L'échec de l'enregistrement de la résidence ne doit jamais bloquer la commande.
      }
    }

    dispatch({ type: "SET_ADRESSE_COLLECTE", adresse });
    dispatch({ type: "SET_CRENEAU_COLLECTE", creneauId });
    router.push("/commander/panier");
  }

  const afficherFormulaire = !verificationEnCours && (saisieManuelle || !residence);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Adresse de collecte</h1>
        <p className="mt-1 font-body text-sm text-ardoise">Où venons-nous récupérer votre linge ?</p>
      </div>

      {verificationEnCours && <p className="font-body text-sm text-ardoise">Chargement…</p>}

      {!verificationEnCours && residence && !saisieManuelle && (
        <Card className={`p-4 transition-colors ${residenceSelectionnee ? "border-succes/40 bg-succes/5" : ""}`}>
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                residenceSelectionnee ? "bg-succes/15 text-succes" : "bg-brume text-bleu"
              }`}
            >
              {residenceSelectionnee ? <Check className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            </span>
            <div className="flex-1">
              <p className="font-body text-sm font-semibold text-marine">{residence.label || "Votre résidence"}</p>
              <p className="font-body text-sm text-encre">
                {residence.quartier}, {residence.rue}
              </p>
            </div>
          </div>
          {residenceSelectionnee ? (
            <div className="mt-3 flex items-center justify-between">
              <p className="font-body text-xs font-semibold text-succes">✓ Cette adresse sera utilisée</p>
              <button
                type="button"
                onClick={() => setSaisieManuelle(true)}
                className="font-body text-xs font-semibold text-bleu hover:underline"
              >
                Changer
              </button>
            </div>
          ) : (
            <div className="mt-3 flex gap-3">
              <Button type="button" onClick={utiliserResidence} className="flex-1">
                Utiliser cette adresse
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSaisieManuelle(true)}>
                Saisir une autre
              </Button>
            </div>
          )}
        </Card>
      )}

      {afficherFormulaire && (
        <>
          {residence && (
            <button
              type="button"
              onClick={() => setSaisieManuelle(false)}
              className="self-start font-body text-xs font-semibold text-bleu hover:underline"
            >
              ← Utiliser ma résidence enregistrée
            </button>
          )}

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

          {session?.user && (
            <label className="flex items-center gap-2 font-body text-sm text-ardoise">
              <input
                type="checkbox"
                checked={definirResidence}
                onChange={(e) => setDefinirResidence(e.target.checked)}
                className="h-4 w-4 rounded border-ardoise/30 text-bleu focus:ring-2 focus:ring-bleu/30"
              />
              Définir comme ma résidence
            </label>
          )}
        </>
      )}

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
        <Button type="submit" disabled={enregistrement.isPending}>
          Continuer
        </Button>
      </div>
    </form>
  );
}
