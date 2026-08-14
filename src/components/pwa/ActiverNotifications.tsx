"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { api } from "@/lib/axios";
import { vibrer } from "@/lib/haptics";
import Button from "@/components/ui/Button";

type Etat = "verification" | "non_supporte" | "refuse" | "inactif" | "actif" | "en_cours";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function ActiverNotifications() {
  // Toujours "verification" au premier rendu, y compris côté client lors de l'hydratation —
  // le serveur ne peut pas connaître l'état des API navigateur. Toute détection réelle est
  // repoussée après le montage (effet), pour que le premier rendu client corresponde
  // exactement au HTML serveur (sinon : erreur d'hydratation React).
  const [etat, setEtat] = useState<Etat>("verification");

  useEffect(() => {
    let annule = false;

    Promise.resolve().then(async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!annule) setEtat("non_supporte");
        return;
      }
      if (Notification.permission === "denied") {
        if (!annule) setEtat("refuse");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!annule) setEtat(subscription ? "actif" : "inactif");
    });

    return () => {
      annule = true;
    };
  }, []);

  async function activer() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY manquant.");
      return;
    }

    setEtat("en_cours");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setEtat(permission === "denied" ? "refuse" : "inactif");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      await api.post("/push/subscribe", subscription.toJSON());
      vibrer([10, 30, 10]);
      setEtat("actif");
    } catch (err) {
      console.error("Échec de l'activation des notifications push :", err);
      setEtat("inactif");
    }
  }

  if (etat === "verification") return null;

  if (etat === "non_supporte") {
    return (
      <p className="flex items-center gap-2 font-body text-xs text-ardoise">
        <BellOff className="h-4 w-4" /> Notifications non disponibles sur ce navigateur.
      </p>
    );
  }

  if (etat === "refuse") {
    return (
      <p className="flex items-center gap-2 font-body text-xs text-ardoise">
        <BellOff className="h-4 w-4" /> Notifications bloquées — autorisez-les dans les réglages du navigateur.
      </p>
    );
  }

  if (etat === "actif") {
    return (
      <p className="flex items-center gap-2 font-body text-xs text-succes">
        <BellRing className="h-4 w-4" /> Notifications activées sur cet appareil.
      </p>
    );
  }

  return (
    <Button type="button" variant="ghost" onClick={activer} disabled={etat === "en_cours"} className="text-xs">
      <Bell className="h-4 w-4" />
      {etat === "en_cours" ? "Activation…" : "Activer les notifications"}
    </Button>
  );
}
