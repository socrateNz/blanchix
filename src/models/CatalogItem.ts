import mongoose, { Schema, type InferSchemaType } from "mongoose";

const CatalogItemSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    prixUnitaire: { type: Number, required: true, min: 0 },
    categorie: { type: String, trim: true, default: "" },
    actif: { type: Boolean, default: true },
    ordreAffichage: { type: Number, default: 0 },
    creePar: { type: Schema.Types.ObjectId, ref: "User", default: null },
    modifiePar: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

CatalogItemSchema.index({ actif: 1, ordreAffichage: 1 });

export type CatalogItemDocument = InferSchemaType<typeof CatalogItemSchema>;

export default mongoose.models.CatalogItem ?? mongoose.model("CatalogItem", CatalogItemSchema);
