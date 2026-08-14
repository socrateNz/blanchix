import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DeliverySlotSchema = new Schema(
  {
    date: { type: Date, required: true },
    plageHoraire: { type: String, required: true, trim: true },
    type: { type: String, enum: ["collecte", "livraison"], required: true },
    capaciteMax: { type: Number, required: true, min: 1 },
    reserves: { type: Number, default: 0, min: 0 },
    statut: { type: String, enum: ["ouvert", "complet", "bloque"], default: "ouvert" },
  },
  { timestamps: true }
);

DeliverySlotSchema.index({ date: 1, type: 1, plageHoraire: 1 }, { unique: true });

export type DeliverySlotDocument = InferSchemaType<typeof DeliverySlotSchema>;

export default mongoose.models.DeliverySlot ?? mongoose.model("DeliverySlot", DeliverySlotSchema);
