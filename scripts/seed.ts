// Charge .env avant l'exécution du script — voir le flag --env-file dans le script
// npm "seed" (package.json). Un `import { config } from "dotenv"` ici ne suffirait pas : les
// imports ES sont hoistés au-dessus du reste du fichier, y compris devant un appel à config(),
// donc src/lib/mongodb.ts lirait process.env.MONGODB_URI avant qu'il soit peuplé.
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { dbConnect } from "../src/lib/mongodb";
import CatalogItem from "../src/models/CatalogItem";
import User from "../src/models/User";

const STARTER_CATALOG = [
  { nom: "T-shirt", prixUnitaire: 500, ordreAffichage: 1 },
  { nom: "Chemise", prixUnitaire: 700, ordreAffichage: 2 },
  { nom: "Pantalon", prixUnitaire: 800, ordreAffichage: 3 },
  { nom: "Robe", prixUnitaire: 1000, ordreAffichage: 4 },
  { nom: "Costume", prixUnitaire: 2000, ordreAffichage: 5 },
  { nom: "Chaussures", prixUnitaire: 1500, ordreAffichage: 6 },
  { nom: "Couette", prixUnitaire: 3500, ordreAffichage: 7 },
];

const ADMIN_EMAIL = "admin@blanchix.com";
// Jamais de mot de passe écrit ici (dépôt public) : ADMIN_SEED_PASSWORD si défini, sinon un mot
// de passe aléatoire affiché une seule fois. Changement ultérieur : scripts/admin-mot-de-passe.ts.
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || randomBytes(18).toString("base64url");

async function seedCatalog() {
  for (const item of STARTER_CATALOG) {
    await CatalogItem.findOneAndUpdate(
      { nom: item.nom },
      { $set: item },
      { upsert: true, new: true }
    );
  }
  console.log(`Catalogue : ${STARTER_CATALOG.length} articles seedés.`);
}

async function seedAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin : ${ADMIN_EMAIL} existe déjà.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    nom: "Admin Blanchix",
    telephone: "+237600000000",
    email: ADMIN_EMAIL,
    role: "super_admin",
    passwordHash,
  });
  console.log(
    process.env.ADMIN_SEED_PASSWORD
      ? `Admin : ${ADMIN_EMAIL} créé avec ADMIN_SEED_PASSWORD.`
      : `Admin : ${ADMIN_EMAIL} créé — mot de passe généré (noté nulle part ailleurs) : ${ADMIN_PASSWORD}`
  );
}

async function main() {
  await dbConnect();
  await seedCatalog();
  await seedAdmin();
  console.log("Seed terminé.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Échec du seed :", err);
  process.exit(1);
});
