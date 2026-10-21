#!/bin/bash
# Tâches planifiées de Blanchix (crontab d'etarcosdev) : appelle une route /api/cron/<tâche> de
# l'application locale avec le secret CRON_SECRET (en-tête lu dans
# ~/.secrets/blanchix-cron-entete, jamais affiché ni passé sur la ligne de commande).
# Remplace Vercel Cron (vercel.json, conservé pour l'historique).
# Usage : taches-blanchix.sh generate-slots
# Journal : ~/apps/blanchix-taches.log
set -uo pipefail

tache=${1:?tâche manquante}
case "$tache" in
  generate-slots) ;;
  *) echo "tâche inconnue : $tache" >&2; exit 2 ;;
esac

journal=/home/etarcosdev/apps/blanchix-taches.log
exec 9> "/tmp/blanchix-tache-$tache.lock"
flock -n 9 || { echo "$(date -Is) $tache : exécution précédente encore en cours" >> "$journal"; exit 0; }

reponse=$(curl -sS --max-time 300 -w '\n%{http_code}' \
  -H @/home/etarcosdev/.secrets/blanchix-cron-entete \
  "http://127.0.0.1:3002/api/cron/$tache" 2>&1)
code=${reponse##*$'\n'}
corps=${reponse%$'\n'*}

if [ "$code" != "200" ]; then
  echo "$(date -Is) $tache : ÉCHEC (HTTP $code) ${corps:0:1500}" >> "$journal"
  exit 1
fi
echo "$(date -Is) $tache : OK ${corps:0:1500}" >> "$journal"
