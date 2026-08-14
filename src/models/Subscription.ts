import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Stub — section 2.7 du cahier des charges (fonctionnalité V2), non utilisé en phase 1.
const SubscriptionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["basic", "silver", "gold"], required: true },
    statut: { type: String, enum: ["actif", "inactif", "suspendu"], default: "inactif" },
    dateDebut: { type: Date },
    dateFin: { type: Date },
  },
  { timestamps: true }
);

export type SubscriptionDocument = InferSchemaType<typeof SubscriptionSchema>;

export default mongoose.models.Subscription ?? mongoose.model("Subscription", SubscriptionSchema);
