#!/bin/sh
set -e

# Piège classique des cron dans Docker : crond ne transmet pas automatiquement les variables
# d'environnement du conteneur aux jobs qu'il exécute (contrairement à un simple `sh -c`
# manuel). On les exporte donc explicitement dans un fichier que chaque job source avant de
# s'exécuter (voir crontab) — sans ça, $CRON_SECRET serait vide et le job échouerait en
# silence (401 côté app, jamais visible sans regarder les logs).
printenv | sed 's/^\(.*\)=\(.*\)$/export \1="\2"/' > /etc/profile.d/docker-env.sh

cron -f
