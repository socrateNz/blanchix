import mongoose, { Schema, type InferSchemaType } from "mongoose";

const PaymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    // "orange_money"/"mtn_momo" : anciennes valeurs (intégration MoneyFusion, remplacée par
    // Codees) conservées pour ne pas invalider les paiements historiques — les nouveaux
    // paiements en ligne utilisent "mobile_money" (le choix Orange/MTN se fait désormais sur
    // la page hébergée Codees, jamais transmis à notre API).
    methode: { type: String, enum: ["orange_money", "mtn_momo", "mobile_money", "carte"], required: true },
    montant: { type: Number, required: true },
    devise: { type: String, default: "XAF" },
    statut: {
      type: String,
      enum: ["initie", "en_attente", "reussi", "echoue", "expire", "rembourse"],
      default: "initie",
    },
    referenceExterne: { type: String, default: null },
    idempotencyKey: { type: String, required: true, unique: true },
    callbackRecuLe: { type: [Date], default: [] },
    tentatives: { type: Number, default: 0 },
    logsBruts: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export type PaymentDocument = InferSchemaType<typeof PaymentSchema>;

export default mongoose.models.Payment ?? mongoose.model("Payment", PaymentSchema);
