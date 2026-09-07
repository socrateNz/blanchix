# syntax=docker/dockerfile:1

# --- deps : installe les dépendances (couche mise en cache tant que package*.json ne change pas)
FROM node:22-alpine AS deps
WORKDIR /app
# .npmrc (legacy-peer-deps=true) est requis ici : next-auth@4 a un peerOptional sur
# nodemailer@^7 alors que le projet utilise nodemailer@^9 (corrigé pour une faille de
# sécurité) — sans ce fichier, `npm ci` échoue sur un conflit ERESOLVE.
COPY package.json package-lock.json* .npmrc ./
RUN npm ci

# --- builder : build Next.js (output "standalone", voir next.config.ts)
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* est inliné dans le bundle client AU BUILD, pas lu au runtime — doit donc être
# un build ARG (passé par docker-compose.yml via build.args), pas seulement une variable
# d'environnement du conteneur final.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

RUN npm run build

# --- runner : image finale minimale, exécution en utilisateur non-root
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# logo.jpeg est lu directement au runtime par src/services/receipt.ts (fs.readFile depuis
# process.cwd()) pour le reçu PDF — pas géré par le bundler, doit être copié explicitement.
COPY --from=builder /app/logo.jpeg ./logo.jpeg
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
