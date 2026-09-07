# Déploiement sur Contabo (Docker)

Guide d'exécution sur le VPS — remplace le déploiement Vercel. Toutes les commandes ci-dessous
s'exécutent **sur le VPS**, en SSH, depuis la racine du dépôt cloné.

## 0. Prérequis

- Docker et Docker Compose v2 installés sur le VPS (`docker compose version` doit répondre).
- Ports 80 et 443 ouverts dans le pare-feu du VPS.
- **Phase de test choisie : sous-domaine `vps.blanchix.cm`** (`blanchix.cm` lui-même reste sur
  Vercel pour l'instant, le temps de valider ce déploiement). Ajouter un enregistrement DNS A
  pour `vps.blanchix.cm` pointant vers l'IP publique du VPS, puis vérifier avant de continuer :
  ```bash
  dig +short vps.blanchix.cm   # doit renvoyer l'IP du VPS, pas celle de Vercel
  ```
  **Une fois ce sous-domaine validé** (checklist de l'étape 7), pour basculer `blanchix.cm`
  lui-même sur le VPS : changer `DOMAIN`/`NEXTAUTH_URL` dans `.env` pour `blanchix.cm`, repointer
  son enregistrement DNS A vers le VPS (retire l'accès Vercel à ce moment précis), puis refaire
  les étapes 2-4 (nouveau certificat) pour ce domaine.
- **Cas rencontré en pratique (VPS partagé avec un autre projet)** : si `sudo ss -tlnp | grep
  ':80\|:443'` montre un Nginx déjà installé directement sur le serveur (hors Docker), ne PAS
  laisser les services Docker `nginx`/`certbot` se battre pour les ports 80/443 — ce projet
  n'utilise alors PAS ces deux services. À la place : `app` publie son port uniquement en local
  (`127.0.0.1:3010:3000`, déjà dans `docker-compose.yml`), et c'est le Nginx déjà installé qui
  fait le reverse proxy via `nginx/host/vps.blanchix.cm.conf` (voir le commentaire en tête de ce
  fichier pour la procédure d'installation — 4 commandes, dont `certbot --nginx` qui gère le
  certificat automatiquement, en réutilisant le Certbot déjà en place pour l'autre site). Sauter
  entièrement les étapes 2 (amorçage SSL Docker) et 4 (certificat Docker) ci-dessous dans ce cas.

## 1. Récupérer le code et configurer l'environnement

```bash
git clone <url-du-dépôt> blanchix && cd blanchix
```

Le fichier `.env` réel est déjà préparé en local (`.env.production.local`, jamais commité —
secrets déjà générés : `NEXTAUTH_SECRET`, `MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD`,
`CRON_SECRET`, et une **nouvelle** paire VAPID distincte de celle du dev, `SMTP_*`/`CODEES_*`
repris tels quels depuis `.env.local`). Le transférer sur le VPS puis le renommer :

```bash
scp .env.production.local votre-utilisateur@IP-DU-VPS:~/blanchix/.env
```

`.env.production.example` reste disponible comme référence si un champ doit être régénéré
manuellement plus tard (ex. rotation d'un secret).

**Important — obligatoire ici, contrairement à Vercel qui l'ajoutait automatiquement** :
`CRON_SECRET` doit être défini, sinon `/api/cron/generate-slots` resterait appelable par
n'importe qui publiquement. Déjà inclus dans le fichier préparé ci-dessus.

## 2. Amorcer le certificat SSL (nécessaire une seule fois)

Nginx refuse de démarrer si le certificat référencé dans sa config n'existe pas encore — on
crée donc un certificat temporaire auto-signé, le temps que Certbot obtienne le vrai.

```bash
source .env   # pour avoir $DOMAIN dans ce shell

docker volume create blanchix_certbot_certs
docker run --rm -v blanchix_certbot_certs:/etc/letsencrypt alpine sh -c "
  apk add --no-cache openssl >/dev/null &&
  mkdir -p /etc/letsencrypt/live/$DOMAIN &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=localhost'
"
```

## 3. Premier démarrage

```bash
docker compose up -d --build
docker compose logs -f app   # Ctrl+C une fois "Ready" affiché
```

À ce stade le site répond en HTTPS mais avec le certificat auto-signé temporaire (avertissement
navigateur normal, encore attendu).

## 4. Obtenir le vrai certificat Let's Encrypt

```bash
source .env   # au cas où ce serait une nouvelle session SSH depuis l'étape 2

docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
  --email blanchix@tacynt.com --agree-tos --no-eff-email \
  -d $DOMAIN --force-renewal" certbot

docker compose exec nginx nginx -s reload
```

Vérifier ensuite `https://vps.blanchix.cm` dans un navigateur : le cadenas doit être valide.
Le service `certbot` du `docker-compose.yml` renouvelle automatiquement ce certificat en
arrière-plan (boucle toutes les 12h) — rien d'autre à faire ensuite.

## 5. Migrer les données depuis MongoDB Atlas

Aucune perte possible : `mongodump`/`mongorestore` font une **copie**, Atlas n'est jamais
touché. Ne basculer l'app dessus qu'après vérification.

**Piège réel rencontré** : `MONGODB_URI` (dans `.env.local`) ne précise aucun nom de base
(`mongodb+srv://...@cluster0.cb8jkba.mongodb.net`, rien après) — Mongoose retombe alors sur le
nom par défaut du driver MongoDB, **`test`**, pas `blanchix`. Confirmé en interrogeant
directement l'app (`mongoose.connection.name` → `"test"`). Le conteneur, lui, est configuré pour
une base `blanchix`. Il faut donc renommer la base pendant la restauration (`--nsFrom`/`--nsTo`),
sinon les données atterrissent dans une base `test` que l'app ne consulte jamais.

```bash
source .env   # pour avoir $MONGO_APP_USERNAME/$MONGO_APP_PASSWORD dans ce shell

# Depuis le VPS (Atlas doit autoriser l'IP du VPS dans Network Access, ou temporairement 0.0.0.0/0)
docker run --rm -v $(pwd):/dump mongo:7 \
  mongodump --uri="<URI ATLAS ACTUELLE — voir MONGODB_URI dans .env.local>" --db=test --archive=/dump/blanchix.dump --gzip

# Copier le dump dans le conteneur mongo et restaurer en renommant test → blanchix
docker cp blanchix.dump blanchix-mongo-1:/tmp/blanchix.dump
docker compose exec mongo mongorestore \
  --archive=/tmp/blanchix.dump --gzip \
  --nsFrom="test.*" --nsTo="blanchix.*" \
  --uri="mongodb://${MONGO_APP_USERNAME}:${MONGO_APP_PASSWORD}@localhost:27017/?authSource=blanchix"
```

**Vérification avant bascule** — comparer les compteurs entre Atlas et le nouveau conteneur
(nombre de commandes, utilisateurs, zones) :

```bash
docker compose exec mongo mongosh \
  "mongodb://${MONGO_APP_USERNAME}:${MONGO_APP_PASSWORD}@localhost:27017/blanchix?authSource=blanchix" \
  --eval "db.orders.countDocuments()+' commandes, '+db.users.countDocuments()+' utilisateurs, '+db.deliveryzones.countDocuments()+' zones'"
```

Comparer avec les mêmes comptages faits contre Atlas. Si les nombres correspondent :

```bash
docker compose restart app   # applique déjà MONGODB_URI vers le conteneur mongo (voir docker-compose.yml)
```

**Ne pas résilier Atlas immédiatement** — le garder actif quelques jours en filet de sécurité.

## 6. Mettre à jour le webhook Codees

Dans le tableau de bord marchand Codees, pointer l'URL de webhook vers
`https://vps.blanchix.cm/api/payments/webhook` — jusqu'ici cette URL n'a jamais été
joignable depuis un `localhost` de développement (voir l'audit paiements du 2026-09-07), donc
aucun callback réel n'a encore pu être reçu. C'est la première fois que ce sera réellement
testable.

## 7. Checklist de vérification post-déploiement

- [ ] `https://vps.blanchix.cm/` répond avec un certificat valide.
- [ ] Connexion admin (`/admin/connexion`) fonctionne.
- [ ] Une commande de test peut être créée de bout en bout (catalogue → zones → paiement).
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://vps.blanchix.cm/api/cron/generate-slots` répond `{"ok":true,...}`.
- [ ] `docker compose logs cron` montre les deux tâches planifiées sans erreur le lendemain matin.
- [ ] `docker compose logs` (tous services) ne montre pas d'erreur en boucle.
- [ ] Un email de test (OTP ou confirmation de commande) arrive bien (toujours vérifier le
      dossier spam — voir la mémoire de session sur le DKIM manquant de `tacynt.com`, non
      résolu par ce déploiement).

## 8. Sauvegardes externes (à activer)

Le conteneur `cron` produit déjà un `mongodump` quotidien dans le volume `mongo_backups`
(rétention locale 14 jours) — mais le cahier des charges interdit explicitement de s'arrêter
là (perte du VPS = perte simultanée de la base ET de sa sauvegarde). Choisir une destination
externe (S3, Contabo Object Storage, Backblaze B2...), configurer `rclone config` sur le VPS,
puis décommenter la ligne `rclone copy` dans `scripts/backup-mongo.sh`.

## Mises à jour futures

```bash
git pull
docker compose up -d --build
```

Le certificat SSL et les données MongoDB survivent (volumes nommés, non touchés par un
rebuild). Consulter les logs après chaque mise à jour : `docker compose logs -f app`.
