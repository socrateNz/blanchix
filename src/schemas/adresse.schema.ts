import { z } from "zod";

export const adresseUserSchema = z.object({
  label: z.string().trim().max(50).optional(),
  quartier: z.string().trim().min(1, "Le quartier est requis."),
  rue: z.string().trim().min(1, "La rue est requise."),
  gps: z.object({ lat: z.number(), lng: z.number() }).optional(),
  instructions: z.string().trim().max(500).optional(),
});
