import mongoose, { Schema, type InferSchemaType } from "mongoose";

/**
 * Codes de connexion à usage unique envoyés par email au client (section 7.1 du cahier des
 * charges — OTP, ici sur canal email plutôt que SMS, voir la mémoire de session correspondante).
 * Un seul code actif par identifiant : une nouvelle demande remplace le précédent.
 */
const OtpCodeSchema = new Schema(
  {
    identifiant: { type: String, required: true, unique: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    // Index TTL : Mongo supprime le document dès que expiresAt est atteint.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consomme: { type: Boolean, default: false },
    tentatives: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type OtpCodeDocument = InferSchemaType<typeof OtpCodeSchema>;

export default mongoose.models.OtpCode ?? mongoose.model("OtpCode", OtpCodeSchema);
