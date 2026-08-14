import { Poppins, Inter } from "next/font/google";
import localFont from "next/font/local";

// Charte graphique : DISPLAY = Poppins ExtraBold/Black (titres, wordmark, CTA)
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

// Charte graphique : TEXTE = Inter (paragraphes, formulaires, interface)
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// Charte graphique : DONNÉES = IBM Plex Mono (prix, commandes, statuts) — inchangé
export const plexMono = localFont({
  src: [
    { path: "./plexmono400.woff2", weight: "400", style: "normal" },
    { path: "./plexmono600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});
