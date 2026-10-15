"use client";

import { createContext, useEffect, useReducer, useState, type Dispatch } from "react";
import {
  commandeReducer,
  initialCommandeState,
  type CommandeAction,
  type CommandeState,
} from "./commandeReducer";

const STORAGE_KEY = "blanchix-commande-draft";

export const CommandeContext = createContext<
  { state: CommandeState; dispatch: Dispatch<CommandeAction>; hydrated: boolean } | null
>(null);

export default function CommandeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(commandeReducer, initialCommandeState);
  // Les effets des étapes (enfants) s'exécutent AVANT celui-ci : sans ce drapeau, leurs gardes
  // de redirection voient l'état vierge au rechargement (ex. retour de Codees sur /paiement)
  // et renvoient le client en arrière avant que le brouillon ne soit relu.
  const [hydrated, setHydrated] = useState(false);

  // Hydratation après montage uniquement, pour ne jamais désynchroniser le rendu serveur/client.
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        dispatch({ type: "HYDRATE", state: JSON.parse(raw) });
      } catch {
        // Brouillon corrompu — on repart d'un état vierge silencieusement.
      }
    }
    // Différé (react-hooks/set-state-in-effect) — même contournement qu'ailleurs dans le code.
    Promise.resolve().then(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  return (
    <CommandeContext.Provider value={{ state, dispatch, hydrated }}>{children}</CommandeContext.Provider>
  );
}
