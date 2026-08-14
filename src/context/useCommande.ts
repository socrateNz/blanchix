"use client";

import { useContext } from "react";
import { CommandeContext } from "./CommandeProvider";

export function useCommande() {
  const ctx = useContext(CommandeContext);
  if (!ctx) {
    throw new Error("useCommande doit être utilisé à l'intérieur de /commander (CommandeProvider).");
  }
  return ctx;
}
