# Basé sur mongo:7 (pas alpine) : mongodump/mongorestore n'ont pas de paquet Alpine fiable,
# alors que l'image officielle mongo les inclut déjà nativement — évite de deviner un binaire
# statique ou une compatibilité glibc/musl hasardeuse pour le script de sauvegarde.
FROM mongo:7

RUN apt-get update && apt-get install -y --no-install-recommends curl cron ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /entrypoint.sh
COPY crontab /etc/cron.d/blanchix
RUN chmod +x /entrypoint.sh && chmod 644 /etc/cron.d/blanchix

ENTRYPOINT ["/entrypoint.sh"]
