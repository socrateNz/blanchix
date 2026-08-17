import type { Metadata, Viewport } from "next";
import "./globals.css";
import { poppins, inter, plexMono } from "@/fonts";
import Providers from "./providers";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Blanchix — Le linge propre, sans le moindre déplacement.",
  description:
    "Blanchisserie à domicile à Douala : collecte, lavage professionnel, repassage et livraison, sans le moindre déplacement.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Blanchix",
  },
  icons: {
    // Mêmes fichiers que les icônes PWA du manifest (voir manifest.ts) — favicon d'onglet et
    // icône de l'app installée doivent être visuellement identiques, pas juste similaires.
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#002878",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${poppins.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
