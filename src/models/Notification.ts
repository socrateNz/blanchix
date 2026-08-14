import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Stub — section 11 du cahier des charges, non utilisé en phase 1.
const NotificationSchema = new Schema(
  {
    destinataire: { type: Schema.Types.ObjectId, ref: "User", required: true },
    evenement: { type: String, required: true },
    canal: { type: String, enum: ["email", "push", "whatsapp"], required: true },
    statut: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    tentatives: { type: Number, default: 0 },
    dateEnvoi: { type: Date, default: null },
    contenuResume: { type: String, trim: true },
  },
  { timestamps: true }
);

export type NotificationDocument = InferSchemaType<typeof NotificationSchema>;

export default mongoose.models.Notification ?? mongoose.model("Notification", NotificationSchema);
