import mongoose, { Schema, type InferSchemaType } from "mongoose";

const INCIDENT_TYPES = [
  "client_absent",
  "adresse_incorrecte",
  "vetement_manquant",
  "vetement_endommage",
  "vetement_tache",
  "probleme_paiement",
  "probleme_livraison",
  "retard",
  "autre",
] as const;

// Stub — section 10 du cahier des charges, non utilisé en phase 1.
const IncidentSchema = new Schema(
  {
    commande: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    type: { type: String, enum: INCIDENT_TYPES, required: true },
    description: { type: String, trim: true },
    createur: { type: Schema.Types.ObjectId, ref: "User", required: true },
    statut: { type: String, enum: ["ouvert", "en_cours", "resolu", "clos"], default: "ouvert" },
    resolution: { type: String, trim: true },
    historique: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export type IncidentDocument = InferSchemaType<typeof IncidentSchema>;

export default mongoose.models.Incident ?? mongoose.model("Incident", IncidentSchema);
