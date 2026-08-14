import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Stub — section 13 du cahier des charges, non utilisé en phase 1.
const AuditLogSchema = new Schema(
  {
    utilisateur: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    cible: {
      type: { type: String },
      id: { type: Schema.Types.ObjectId },
    },
    ancienneValeur: { type: Schema.Types.Mixed },
    nouvelleValeur: { type: Schema.Types.Mixed },
    adresseIP: { type: String },
  },
  { timestamps: { createdAt: "date", updatedAt: false } }
);

export type AuditLogDocument = InferSchemaType<typeof AuditLogSchema>;

export default mongoose.models.AuditLog ?? mongoose.model("AuditLog", AuditLogSchema);
