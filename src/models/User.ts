import mongoose, { Schema, type InferSchemaType } from "mongoose";

export const USER_ROLES = ["client", "admin", "operateur", "livreur", "super_admin"] as const;

// Adresses enregistrées par le client (ex. "résidence") — réutilisables lors d'une commande
// plutôt que ressaisies à chaque fois (voir /api/mes-adresses et l'étape adresse du tunnel de
// commande). Contrairement à PushSubscriptionSchema plus bas, on garde ici l'_id auto de
// Mongoose (pas de { _id: false }) : une adresse doit pouvoir être ciblée individuellement par
// id pour être supprimée/mise à jour, sans clé naturelle fiable comme l'endpoint d'un push.
const AdresseUserSchema = new Schema({
  label: { type: String, trim: true },
  zone: { type: Schema.Types.ObjectId, ref: "DeliveryZone" },
  zoneNom: { type: String, trim: true },
  lieuDit: { type: String, trim: true },
  // quartier/rue : legacy, résidences enregistrées avant l'introduction des zones de livraison.
  quartier: { type: String, trim: true },
  rue: { type: String, trim: true },
  gps: {
    lat: Number,
    lng: Number,
  },
  instructions: { type: String, trim: true },
  parDefaut: { type: Boolean, default: false },
});

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
