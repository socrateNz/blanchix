import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { ORDER_STATUSES } from "@/lib/orderStatuses";

const StatusHistoryEntrySchema = new Schema(
  {
    statut: { type: String, enum: ORDER_STATUSES, required: true },
    date: { type: Date, default: Date.now, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    commentaire: { type: String, trim: true },
  },
  { _id: false }
);

const ArticleCommandeSchema = new Schema(
  {
    catalogItemId: { type: Schema.Types.ObjectId, ref: "CatalogItem", required: true },
    nom: { type: String, required: true },
    prixUnitaire: { type: Number, required: true },
    quantite: { type: Number, required: true, min: 1 },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const ArticlePersonnaliseSchema = new Schema({
  nom: { type: String, required: true, trim: true },
  quantiteEstimee: { type: Number, required: true, min: 1 },
  description: { type: String, trim: true },
  statut: {
    type: String,
    enum: ["en_attente_prix", "prix_propose", "accepte", "refuse"],
    default: "en_attente_prix",
  },
  prixPropose: { type: Number, default: null },
});

const AdresseCommandeSchema = new Schema(
  {
    quartier: { type: String, required: true, trim: true },
    rue: { type: String, required: true, trim: true },
    gps: {
      lat: Number,
      lng: Number,
    },
    instructions: { type: String, trim: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    numero: { type: String, required: true, unique: true },
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },

    statut: { type: String, enum: ORDER_STATUSES, default: "BROUILLON", required: true },
    statusHistory: { type: [StatusHistoryEntrySchema], default: [] },

    articles: { type: [ArticleCommandeSchema], default: [] },
    articlesPersonnalises: { type: [ArticlePersonnaliseSchema], default: [] },

    adresseCollecte: { type: AdresseCommandeSchema, required: true },
    adresseLivraison: { type: AdresseCommandeSchema, required: true },
    creneauCollecte: { type: Schema.Types.ObjectId, ref: "DeliverySlot", required: true },
    creneauLivraison: { type: Schema.Types.ObjectId, ref: "DeliverySlot", required: true },
    livreurCollecte: { type: Schema.Types.ObjectId, ref: "User", default: null },
    livreurLivraison: { type: Schema.Types.ObjectId, ref: "User", default: null },

    delai: { type: String, enum: ["premium", "express", "standard"], required: true },
    notesClient: { type: String, trim: true },

    sousTotal: { type: Number, required: true },
    fraisLivraison: { type: Number, required: true },
    majorationDelai: { type: Number, required: true },
    reduction: { type: Number, default: 0 },
    total: { type: Number, required: true },

    pointsGagnes: { type: Number, default: 0 },
    pointsUtilises: { type: Number, default: 0 },

    // confirmation/recuPdfUrl : non peuplés en phase 1 — structure prête pour la phase notifications.
    paiement: {
      methode: { type: String, enum: ["orange_money", "mtn_momo", "carte", "espece"], default: null },
      statut: { type: String, default: null },
      referenceExterne: { type: String, default: null },
      montant: { type: Number, default: null },
      dateMaj: { type: Date, default: null },
    },
    confirmation: { type: Schema.Types.Mixed, default: {} },
    recuPdfUrl: { type: String, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ client: 1 });
OrderSchema.index({ statut: 1 });

export type OrderDocument = InferSchemaType<typeof OrderSchema>;

export default mongoose.models.Order ?? mongoose.model("Order", OrderSchema);
