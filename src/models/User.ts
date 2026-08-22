import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const USER_ROLES = ["client", "admin", "operateur", "livreur", "super_admin"] as const;

const AdresseUserSchema = new Schema(
  {
    label: { type: String, trim: true },
    quartier: { type: String, trim: true },
    rue: { type: String, trim: true },
    gps: {
      lat: Number,
      lng: Number,
    },
    instructions: { type: String, trim: true },
    parDefaut: { type: Boolean, default: false },
  },
  { _id: false }
);

const PushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    // Optionnel — non utilisé pour les clients (un seul champ "nom" suffit historiquement),
    // renseigné pour les livreurs (section gestion des livreurs, admin/livreurs).
    prenom: { type: String, trim: true },
    telephone: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    whatsapp: { type: String, trim: true },
    role: { type: String, enum: USER_ROLES, default: "client", required: true },
    passwordHash: { type: String, select: false },
    points: { type: Number, default: 0 },
    abonnement: { type: Schema.Types.Mixed, default: null },
    adresses: { type: [AdresseUserSchema], default: [] },
    // Web Push (section 8.1/16.1) — un client peut avoir plusieurs abonnements (plusieurs
    // appareils/navigateurs). Notifications complémentaires à l'email, jamais un remplacement.
    pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
    compteConfirme: {
      email: { type: Boolean, default: false },
      telephone: { type: Boolean, default: false },
      dateConfirmation: Date,
    },
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof UserSchema>;

export default mongoose.models.User ?? mongoose.model("User", UserSchema);
