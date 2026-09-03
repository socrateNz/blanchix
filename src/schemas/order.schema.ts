import { z } from "zod";

const adresseSchema = z.object({
  quartier: z.string().trim().min(1, "Le quartier est requis."),
  rue: z.string().trim().min(1, "La rue est requise."),
  gps: z.object({ lat: z.number(), lng: z.number() }).optional(),
  instructions: z.string().trim().max(500).optional(),
});

export const createOrderSchema = z
  .object({
    client: z.object({
      nom: z.string().trim().min(1, "Le nom est requis."),
      telephone: z.string().trim().min(8, "Numéro de téléphone invalide."),
      email: z.string().trim().email("Email invalide."),
      whatsapp: z.string().trim().optional(),
    }),
    adresseCollecte: adresseSchema,
    adresseLivraison: adresseSchema,
    creneauCollecteId: z.string().min(1),
    articles: z
      .array(
        z.object({
          catalogItemId: z.string().min(1),
          quantite: z.number().int().positive(),
        })
      )
      .default([]),
    articlesPersonnalises: z
      .array(
        z.object({
          nom: z.string().trim().min(1),
          quantiteEstimee: z.number().int().positive(),
          description: z.string().trim().max(500).optional(),
        })
      )
      .default([]),
    notesClient: z.string().trim().max(1000).optional(),
    delai: z.enum(["premium", "express", "standard"]),
  })
  .refine((d) => d.articles.length > 0 || d.articlesPersonnalises.length > 0, {
    message: "La commande doit contenir au moins un article.",
    path: ["articles"],
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
