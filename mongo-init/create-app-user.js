// Exécuté automatiquement au tout premier démarrage du conteneur mongo (dossier
// /docker-entrypoint-initdb.d/, convention de l'image officielle mongo) — crée un utilisateur
// applicatif dédié, limité à la base "blanchix", plutôt que de faire tourner l'app avec le
// compte root Mongo (MONGO_INITDB_ROOT_USERNAME/PASSWORD, réservé à l'administration).
db = db.getSiblingDB("blanchix");

db.createUser({
  user: process.env.MONGO_APP_USERNAME,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: "readWrite", db: "blanchix" }],
});
