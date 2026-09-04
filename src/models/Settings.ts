import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Singleton via un _id fixe — voir src/services/settings.ts pour l'accès (jamais directement,
// pour garantir qu'un seul document existe même sous accès concurrents).
const SettingsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    commandeMinimale: { type: Number, default: 0 },
    livraisonGratuiteActive: { type: Boolean, default: false },
    livraisonGratuiteSeuil: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type SettingsDocument = InferSchemaType<typeof SettingsSchema>;

export default mongoose.models.Settings ?? mongoose.model("Settings", SettingsSchema);
