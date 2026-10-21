// Gestion des mots de passe des comptes d'administration (aucun écran prévu pour ça dans l'app).
// À lancer sur le serveur, depuis ~/apps/blanchix-actuelle :
//   npx tsx --env-file=.env scripts/admin-mot-de-passe.ts verifier
//   npx tsx --env-file=.env scripts/admin-mot-de-passe.ts changer <email> <fichier>
// Le nouveau mot de passe est lu dans <fichier> (ex. ~/.secrets/blanchix-admin-password),
// jamais passé sur la ligne de commande ni affiché.
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { dbConnect } from "../src/lib/mongodb";
import { ADMIN_ROLES } from "../src/lib/roles";
import User from "../src/models/User";

// Mot de passe par défaut des premières versions de scripts/seed.ts, publié dans l'historique
// du dépôt (public) : tout compte qui l'a encore doit être changé.
const ANCIEN_MOT_DE_PASSE_PAR_DEFAUT = "blanchix-admin-2026";

async function verifier() {
  const admins = await User.find({ role: { $in: ADMIN_ROLES } }).select("+passwordHash");
  for (const u of admins) {
    const parDefaut = !!u.passwordHash && (await bcrypt.compare(ANCIEN_MOT_DE_PASSE_PAR_DEFAUT, u.passwordHash));
    const etat = !u.passwordHash ? "aucun mot de passe" : parDefaut ? "MOT DE PASSE PAR DÉFAUT — à changer" : "ok";
    console.log(`${u.email} (${u.role}) : ${etat}`);
  }
  console.log(`${admins.length} compte(s) d'administration.`);
}

async function changer(email: string, fichier: string) {
  const motDePasse = readFileSync(fichier, "utf8").trim();
  if (motDePasse.length < 16) throw new Error("Mot de passe trop court (16 caractères minimum).");

  const user = await User.findOne({ email: email.toLowerCase().trim(), role: { $in: ADMIN_ROLES } });
  if (!user) throw new Error(`Aucun compte d'administration pour ${email}.`);

  user.passwordHash = await bcrypt.hash(motDePasse, 10);
  await user.save();
  console.log(`Mot de passe de ${user.email} changé.`);
}

async function main() {
  const [action, email, fichier] = process.argv.slice(2);
  await dbConnect();
  if (action === "verifier") await verifier();
  else if (action === "changer" && email && fichier) await changer(email, fichier);
  else throw new Error("Usage : verifier | changer <email> <fichier>");
  process.exit(0);
}

main().catch((err) => {
  console.error("Échec :", err instanceof Error ? err.message : err);
  process.exit(1);
});
