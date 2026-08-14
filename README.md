# Blanchix

Plateforme web de blanchisserie à domicile (Douala) — Next.js App Router, MongoDB/Mongoose, Tailwind CSS. Voir `Blanchix_Cahier_des_Charges.pdf` à la racine pour la spécification complète.

## État du projet — Phase 1

Cette phase couvre : fondation technique, pages publiques (Accueil, Comment ça fonctionne), le tunnel de commande en 5 étapes et le paiement Mobile Money (MoneyFusion — Orange Money / MTN MoMo) avec workflow serveur complet (initiation, webhook, revérification, idempotence — cahier des charges section 6). **L'authentification, le dashboard admin, le suivi de commande, la PWA et les notifications ne sont pas encore implémentés** — prochaines phases.

Le paiement MoneyFusion est codé mais **non testé en conditions réelles** : `docs.moneyfusion.net` n'était pas joignable pendant le développement, donc les formes de requête/réponse (`src/lib/moneyfusion.ts`) viennent de leurs SDK officiels/communautaires plutôt que de leur documentation lue directement. À revalider avec le vrai tableau de bord MoneyFusion dès que `MONEYFUSION_API_URL` est disponible.

## Démarrage

1. Copier `.env.example` en `.env.local` et renseigner au minimum `MONGODB_URI`.
2. Installer les dépendances : `npm install`
3. Peupler la base (catalogue de démarrage, créneaux, compte admin) : `npm run seed`
4. Lancer le serveur de développement : `npm run dev`, puis ouvrir [http://localhost:3000](http://localhost:3000).

## Points à valider avec Blanchix

- **Tarification** (`src/lib/pricing-constants.ts`) : frais de livraison et majorations par délai sont des valeurs de démarrage, pas des montants validés — le cahier des charges n'en fixe pas.
- **Logo** : `logo.jpeg`/`charte.jpeg` à la racine sont des références brutes ; le header/footer utilisent pour l'instant un logotype texte, en attendant un export vectoriel propre.
- **MoneyFusion** : `MONEYFUSION_API_URL` (et éventuellement `MONEYFUSION_WEBHOOK_SECRET`) doivent être renseignés depuis le tableau de bord MoneyFusion avant de pouvoir tester un paiement de bout en bout — voir `.env.example`.

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run seed` — peuple le catalogue, les créneaux et le compte admin (idempotent)
- `npm run lint` — ESLint
