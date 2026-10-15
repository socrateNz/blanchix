"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Check } from "lucide-react";
import { api } from "@/lib/axios";
import { useCommande } from "@/context/useCommande";
import type { AdresseDraft } from "@/context/commandeReducer";
import { useSlots } from "@/hooks/useSlots";
import { formatZoneAdresse } from "@/lib/adresse";
import { DELAI_LABELS, MAJORATION_DELAI_TAUX, type Delai } from "@/lib/pricing-constants";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CreneauPicker from "@/components/commander/CreneauPicker";
import AdresseFields from "@/components/commander/AdresseFields";

interface AdresseEnregistree {
  id: string;
  label?: string;
  zoneId?: string;
  zoneNom?: string;
  lieuDit?: string;
  // quartier/rue : résidences enregistrées avant l'introduction des zones de livraison.
  quartier?: string;
  rue?: string;
  instructions?: string;
  parDefaut?: boolean;
}

// Du moins cher au plus rapide : Standard (sélectionné par défaut) en premier.
const DELAIS: Delai[] = ["standard", "express", "premium"];

export default function StepCollecte() {
  const { state, dispatch, hydrated } = useCommande();
  const router = useRouter();
  const { data: session, status: statutSession } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hydrated && state.articles.length === 0 && state.articlesPersonnalises.length === 0) {
      router.replace("/commander/panier");
    }
  }, [hydrated, state.articles.length, state.articlesPersonnalises.length, router]);

  const { data: adresses, isLoading: chargementAdresses } = useQuery({
    queryKey: ["mes-adresses"],
    queryFn: async () => {
      const { data } = await api.get<AdresseEnregistree[]>("/mes-adresses");
      return data;
    },
    enabled: !!session?.user,
  });

  const residence = adresses?.find((a) => a.parDefaut) ?? adresses?.[0] ?? null;
  // Résidence enregistrée avant l'introduction des zones : pas de zone réutilisable, le
  // formulaire est affiché à la place.
  const residenceUtilisable = residence?.zoneId ? residence : null;
  const verificationEnCours = statutSession === "loading" || (!!session?.user && chargementAdresses);

  const [saisieManuelle, setSaisieManuelle] = useState(false);
  const [adresse, setAdresse] = useState(state.adresseCollecte);
  const [definirResidence, setDefinirResidence] = useState(false);
  const [delai, setDelai] = useState<Delai>(state.delai ?? "standard");
  const [livraisonDifferente, setLivraisonDifferente] = useState(state.adresseLivraisonDifferente);
  const [adresseLivraison, setAdresseLivraison] = useState(state.adresseLivraison);
  const [error, setError] = useState("");

  // Résidence utilisée d'office (aucun clic nécessaire) tant que le client ne choisit pas
  // explicitement d'en saisir une autre.
  const surResidence = !!residenceUtilisable && !saisieManuelle;
  const adresseCollecte: AdresseDraft = surResidence
    ? {
        zoneId: residenceUtilisable.zoneId ?? "",
        lieuDit: residenceUtilisable.lieuDit ?? "",
        instructions: residenceUtilisable.instructions ?? "",
      }
    : adresse;

  // Le premier créneau libre est présélectionné ; un créneau déjà choisi est conservé tant
  // qu'il est encore proposé (un brouillon ancien peut pointer vers un créneau passé/complet).
  const { data: slots } = useSlots("collecte");
  const [creneauChoisi, setCreneauChoisi] = useState(state.creneauCollecteId);
  const creneauId =
    creneauChoisi && slots?.some((s) => s.id === creneauChoisi && !s.complet)
      ? creneauChoisi
      : (slots?.find((s) => !s.complet)?.id ?? null);

  const enregistrement = useMutation({
    mutationFn: async () => {
      await api.post("/mes-adresses", adresse);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mes-adresses"] }),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!adresseCollecte.zoneId || !adresseCollecte.lieuDit.trim()) {
      setError("La zone et le lieu-dit de collecte sont requis.");
      return;
    }
    if (!creneauId) {
      setError("Choisissez un créneau de collecte.");
      return;
    }
    if (livraisonDifferente && (!adresseLivraison.zoneId || !adresseLivraison.lieuDit.trim())) {
      setError("Renseignez l'adresse de livraison.");
      return;
    }

    if (!surResidence && definirResidence) {
      try {
        await enregistrement.mutateAsync();
      } catch {
        // L'échec de l'enregistrement de la résidence ne doit jamais bloquer la commande.
      }
    }

    dispatch({ type: "SET_ADRESSE_COLLECTE", adresse: adresseCollecte });
    dispatch({ type: "SET_CRENEAU_COLLECTE", creneauId });
    dispatch({ type: "SET_DELAI", delai });
    dispatch({ type: "SET_ADRESSE_LIVRAISON_DIFFERENTE", value: livraisonDifferente });
    dispatch({
      type: "SET_ADRESSE_LIVRAISON",
      adresse: livraisonDifferente ? adresseLivraison : adresseCollecte,
    });
    router.push("/commander/paiement");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-marine">Collecte et livraison</h1>
        <p className="mt-1 font-body text-sm text-ardoise">Où et quand venons-nous récupérer votre linge ?</p>
      </div>

      {verificationEnCours && <p className="font-body text-sm text-ardoise">Chargement…</p>}

      {!verificationEnCours && surResidence && (
        <Card className="border-succes/40 bg-succes/5 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-succes/15 text-succes">
              <Check className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="font-body text-sm font-semibold text-marine">
                {residenceUtilisable.label || "Votre résidence"}
              </p>
              <p className="font-body text-sm text-encre">{formatZoneAdresse(residenceUtilisable)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSaisieManuelle(true)}
              className="font-body text-xs font-semibold text-bleu hover:underline"
            >
              Changer
            </button>
          </div>
        </Card>
      )}

      {!verificationEnCours && !surResidence && (
        <div className="flex flex-col gap-4">
          {residenceUtilisable ? (
            <button
              type="button"
              onClick={() => setSaisieManuelle(false)}
              className="flex items-center gap-1.5 self-start font-body text-xs font-semibold text-bleu hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" /> Utiliser ma résidence enregistrée
            </button>
          ) : null}

          <AdresseFields
            adresse={adresse}
            onChange={setAdresse}
            labelInstructions="Instructions de collecte"
            placeholderInstructions="Ex. Collecter chez le gardien"
          />

          {session?.user && (
            <label className="flex items-center gap-2 font-body text-sm text-ardoise">
              <input
                type="checkbox"
                checked={definirResidence}
                onChange={(e) => setDefinirResidence(e.target.checked)}
                className="h-4 w-4 rounded border-ardoise/30 text-bleu focus:ring-2 focus:ring-bleu/30"
              />
              Enregistrer comme ma résidence (pré-remplie la prochaine fois)
            </label>
          )}
        </div>
      )}

      <div>
        <span className="font-body text-sm font-semibold text-marine">Créneau de collecte</span>
        {creneauId && !creneauChoisi && (
          <p className="mt-0.5 font-body text-xs text-ardoise">
            Le prochain créneau disponible est présélectionné — touchez-en un autre pour changer.
          </p>
        )}
        <div className="mt-2">
          <CreneauPicker type="collecte" selectedId={creneauId} onSelect={setCreneauChoisi} />
        </div>
      </div>

      <div>
        <span className="font-body text-sm font-semibold text-marine">Délai de traitement</span>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {DELAIS.map((d) => {
            const taux = MAJORATION_DELAI_TAUX[d];
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDelai(d)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  delai === d ? "border-bleu bg-bleu/10 shadow-sm" : "border-ardoise/15 bg-white hover:border-bleu/50"
                }`}
              >
                <p className="font-display text-sm font-bold text-marine">{DELAI_LABELS[d].label}</p>
                <p className="font-mono text-xs text-ardoise">{DELAI_LABELS[d].duree}</p>
                <p className="mt-1 font-body text-[11px] text-ardoise/70">
                  {taux === 0 ? "Tarif de base" : `+${Math.round(taux * 100)}%`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 font-body text-sm text-encre">
        <input
          type="checkbox"
          checked={livraisonDifferente}
          onChange={(e) => setLivraisonDifferente(e.target.checked)}
          className="h-4 w-4 rounded border-ardoise/40 text-bleu focus:ring-bleu/30"
        />
        Livrer à une adresse différente de la collecte
      </label>

      {livraisonDifferente && (
        <div className="flex flex-col gap-4 rounded-xl bg-brume p-4">
          <AdresseFields
            adresse={adresseLivraison}
            onChange={setAdresseLivraison}
            labelInstructions="Instructions de livraison"
            placeholderInstructions="Ex. Appeler avant de monter"
          />
        </div>
      )}

      {error && <p className="font-body text-xs text-alerte">{error}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/commander/panier")}>
          Retour
        </Button>
        <Button type="submit" disabled={enregistrement.isPending || verificationEnCours}>
          Continuer
        </Button>
      </div>
    </form>
  );
}
