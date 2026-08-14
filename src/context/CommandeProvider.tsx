"use client";

import { createContext, useEffect, useReducer, type Dispatch } from "react";
import {
  commandeReducer,
  initialCommandeState,
  type CommandeAction,
  type CommandeState,
} from "./commandeReducer";

const STORAGE_KEY = "blanchix-commande-draft";

export const CommandeContext = createContext<
  { state: CommandeState; dispatch: Dispatch<CommandeAction> } | null
>(null);

export default function CommandeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(commandeReducer, initialCommandeState);

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
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <CommandeContext.Provider value={{ state, dispatch }}>{children}</CommandeContext.Provider>;
}
