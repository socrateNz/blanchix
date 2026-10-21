# Déploiement de Blanchix sur le VPS « tacynt »

Blanchix tourne sur le VPS Contabo **tacynt** (`169.58.213.108`), à côté de MedDoc et de Shede,
sur le même modèle qu'eux : **PM2 + script de déploiement avec retour arrière automatique**,
derrière le Nginx du serveur. La base reste sur **MongoDB Atlas** (l'adresse fixe du VPS est
autorisée dans Atlas → Network Access).

Le `Dockerfile`, `docker-compose.yml`, `cron/`, `mongo-init/` et `nginx/` datent d'un ancien
plan (MongoDB en conteneur) qui n'a pas été retenu. Ils ne servent pas sur tacynt.

## Sur le serveur

| Élément | Valeur |
| :--- | :--- |
| Domaine | `blanchix.cm` (`www.blanchix.cm` → redirection 301 vers `blanchix.cm`) |
| Port | `127.0.0.1:3002` (PM2, entrée `blanchix` de `~/apps/ecosystem.config.cjs`) |
| Versions | `~/apps/blanchix-versions/<date>-<commit>/` (3 gardées), lien `~/apps/blanchix-actuelle` |
| Configuration | `~/apps/blanchix-partage/.env` (chmod 600, dossier 700) |
| Nginx | `/etc/nginx/sites-available/blanchix.cm` — copie de référence : `deploy/nginx/blanchix.cm` |
| Déploiement | `~/scripts/deployer-blanchix.sh [commit]` — copie de référence : `deploy/scripts/` |
| Tâches planifiées | aucune (les créneaux de collecte, seule tâche quotidienne, ont été retirés le 21/10/2026) |
| Journaux | `~/apps/deploiements.log`, `pm2 logs blanchix` |

Entrée PM2 :

```js
{
  name: "blanchix",
  cwd: "/home/etarcosdev/apps/blanchix-actuelle",
  script: "node_modules/next/dist/bin/next",
  args: "start -p 3002 -H 127.0.0.1",
  env: { NODE_ENV: "production" },
  max_memory_restart: "1000M",
  time: true,
}
```

## Mettre en ligne une nouvelle version

Après un `git push` sur `main` : **[Serveur]** `~/scripts/deployer-blanchix.sh`
(ou `~/scripts/deployer-blanchix.sh <commit>` pour une version précise). Le script clone,
installe (`npm ci`), compile, bascule, vérifie que `/connexion` répond `200` en moins d'une
minute, et revient tout seul à la version précédente sinon.

## Points à connaître

- Les variables `NEXT_PUBLIC_…` (clé VAPID publique) sont figées à la compilation : après les
  avoir changées dans `.env`, **redéployer** (un simple `pm2 restart` ne suffit pas).
- `MONGODB_URI` ne précise aucun nom de base : le pilote utilise la base **`test`** d'Atlas,
  qui contient les vraies données. Ne pas ajouter `/blanchix` à l'adresse sans migrer.
- `NEXTAUTH_URL=https://blanchix.cm` sert aussi d'adresse de retour Codees
  (`/commander/paiement`). Webhook à déclarer dans le tableau de bord Codees :
  `https://blanchix.cm/api/payments/webhook`.
- Avertissement sans effet au démarrage : `"next start" does not work with "output: standalone"`
  (réglage gardé pour le `Dockerfile`).
- Atlas (offre gratuite) ne fait **aucune sauvegarde** : une sauvegarde `mongodump` vers un
  stockage externe reste à mettre en place.
