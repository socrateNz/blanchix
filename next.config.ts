import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nécessaire pour l'image Docker de production (voir Dockerfile) — ne copie que le strict
  // nécessaire (.next/standalone) au lieu de tout node_modules dans l'image finale.
  output: "standalone",
};

export default nextConfig;
