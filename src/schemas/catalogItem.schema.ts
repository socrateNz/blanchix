import { z } from "zod";

export const catalogItemSchema = z.object({
  nom: z.string().trim().min(1),
  prixUnitaire: z.number().int().nonnegative(),
  categorie: z.string().trim().optional(),
  actif: z.boolean().default(true),
  ordreAffichage: z.number().int().default(0),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
