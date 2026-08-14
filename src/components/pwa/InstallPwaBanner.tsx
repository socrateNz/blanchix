"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { vibrer } from "@/lib/haptics";
import { buttonClasses } from "@/components/ui/Button";

const CLE_IGNORE = "blanchix-install-ignore";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bannière d'installation PWA — s'appuie sur `beforeinstallprompt` (Chrome/Edge/Android),
 * absent sur iOS Safari qui n'expose aucune API équivalente : la bannière n'y apparaît
 * simplement jamais, pas de repli avec instructions manuelles pour l'instant.
 */
export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dejaIgnore = window.localStorage.getItem(CLE_IGNORE);
    const dejaInstalle = window.matchMedia("(display-mode: standalone)").matches;
    if (dejaIgnore || dejaInstalle) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      const evenement = e as BeforeInstallPromptEvent;
      setDeferredPrompt(evenement);
      Promise.resolve().then(() => setVisible(true));
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function installer() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") vibrer([10, 30, 10]);
    setVisible(false);
    setDeferredPrompt(null);
    window.localStorage.setItem(CLE_IGNORE, "1");
  }

  function ignorer() {
    setVisible(false);
    window.localStorage.setItem(CLE_IGNORE, "1");
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 z-40 mx-auto max-w-sm bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] px-4 sm:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-marine/12 bg-white p-3 shadow-lg">
        <div className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm font-semibold text-marine">Installer Blanchix</p>
          <p className="font-body text-xs text-ardoise">Accès en un tap depuis l&apos;écran d&apos;accueil.</p>
          <button
            type="button"
            onClick={installer}
            className={buttonClasses("primary", "!mt-2 !px-4 !py-1.5 text-xs")}
          >
            Installer
          </button>
        </div>
        <button type="button" onClick={ignorer} aria-label="Ignorer" className="shrink-0 text-ardoise">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
