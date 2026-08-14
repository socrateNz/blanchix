import mongoose, { Schema, type InferSchemaType } from "mongoose";

// Stub — section 2.6 du cahier des charges, non utilisé en phase 1.
const LoyaltyTransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    type: { type: String, enum: ["gain", "utilisation", "expiration", "annulation"], required: true },
    points: { type: Number, required: true },
    solde: { type: Number, required: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export type LoyaltyTransactionDocument = InferSchemaType<typeof LoyaltyTransactionSchema>;

export default mongoose.models.LoyaltyTransaction ??
  mongoose.model("LoyaltyTransaction", LoyaltyTransactionSchema);
