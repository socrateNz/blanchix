import bcrypt from "bcryptjs";
import { dbConnect } from "../src/lib/mongodb";
import User from "../src/models/User";
import OtpCode from "../src/models/OtpCode";

async function main() {
  await dbConnect();
  const client = await User.findOne({ role: "client" });
  if (!client) {
    console.error("Aucun client trouvé.");
    process.exit(1);
  }
  const code = "123456";
  const codeHash = await bcrypt.hash(code, 10);
  await OtpCode.findOneAndUpdate(
    { identifiant: client.email.toLowerCase() },
    { identifiant: client.email.toLowerCase(), codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000), consomme: false, tentatives: 0 },
    { upsert: true }
  );
  console.log("email:", client.email, "code:", code);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
