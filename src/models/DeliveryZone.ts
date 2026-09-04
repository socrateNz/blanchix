import mongoose, { Schema, type InferSchemaType } from "mongoose";

const DeliveryZoneSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    prix: { type: Number, required: true, min: 0 },
    actif: { type: Boolean, default: true },
    ordreAffichage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DeliveryZoneSchema.index({ actif: 1, ordreAffichage: 1 });

export type DeliveryZoneDocument = InferSchemaType<typeof DeliveryZoneSchema>;

export default mongoose.models.DeliveryZone ?? mongoose.model("DeliveryZone", DeliveryZoneSchema);
