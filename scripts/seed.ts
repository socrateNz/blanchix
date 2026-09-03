// Charge .env.local avant l'exécution du script — voir le flag --env-file dans le script
// npm "seed" (package.json). Un `import { config } from "dotenv"` ici ne suffirait pas : les
// imports ES sont hoistés au-dessus du reste du fichier, y compris devant un appel à config(),
// donc src/lib/mongodb.ts lirait process.env.MONGODB_URI avant qu'il soit peuplé.
import bcrypt from "bcryptjs";
import { dbConnect } from "../src/lib/mongodb";
import { genererCreneauxAVenir, JOURS_A_VENIR } from "../src/services/slots";
import { PLAGES_HORAIRES } from "../src/lib/slots-constants";
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
const ADMIN_PASSWORD_PAR_DEFAUT = "blanchix-admin-2026";

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

async function seedSlots() {
  const count = await genererCreneauxAVenir();
  console.log(`Créneaux : ${count} créneaux seedés (${JOURS_A_VENIR} jours × ${PLAGES_HORAIRES.length} plages, collecte uniquement).`);
}

async function seedAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin : ${ADMIN_EMAIL} existe déjà.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD_PAR_DEFAUT, 10);
  await User.create({
    nom: "Admin Blanchix",
    telephone: "+237600000000",
    email: ADMIN_EMAIL,
    role: "super_admin",
    passwordHash,
  });
  console.log(`Admin : ${ADMIN_EMAIL} créé — mot de passe par défaut "${ADMIN_PASSWORD_PAR_DEFAUT}" (à changer dès la mise en place de l'authentification).`);
}

async function main() {
  await dbConnect();
  await seedCatalog();
  await seedSlots();
  await seedAdmin();
  console.log("Seed terminé.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Échec du seed :", err);
  process.exit(1);
});
