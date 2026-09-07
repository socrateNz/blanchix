#!/bin/bash
set -euo pipefail

# Sauvegarde quotidienne MongoDB (section 15.3 du cahier des charges). Produit une archive
# datée dans /backups (volume dédié — voir docker-compose.yml), avec rétention de 14 jours en
# local.
#
# IMPORTANT (explicite dans le cahier des charges) : ne JAMAIS considérer cette sauvegarde
# locale comme suffisante — un backup qui ne vit que sur le même VPS que la base de production
# ne protège de rien en cas de perte du serveur lui-même. Décommenter et adapter la ligne
# `rclone copy` ci-dessous dès qu'une destination externe (S3, Contabo Object Storage,
# Backblaze...) est choisie et configurée (`rclone config`) — voir DEPLOY.md.

DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/backups"
ARCHIVE="$BACKUP_DIR/blanchix_$DATE.archive.gz"

mkdir -p "$BACKUP_DIR"

mongodump \
  --uri="mongodb://${MONGO_APP_USERNAME}:${MONGO_APP_PASSWORD}@mongo:27017/blanchix?authSource=blanchix" \
  --archive="$ARCHIVE" \
  --gzip

echo "Sauvegarde créée : $ARCHIVE"

# --- Étape externe à activer une fois une destination choisie (voir commentaire ci-dessus) ---
# rclone copy "$ARCHIVE" remote:blanchix-backups/

# Rétention locale : ne garde que les 14 derniers jours (l'historique long terme doit vivre
# dans le stockage externe, pas ici).
find "$BACKUP_DIR" -name "blanchix_*.archive.gz" -mtime +14 -delete
