import { z } from "zod";

export const adresseUserSchema = z.object({
  label: z.string().trim().max(50).optional(),
  zoneId: z.string().min(1, "La zone de livraison est requise."),
  lieuDit: z.string().trim().min(1, "Le lieu-dit est requis."),
  gps: z.object({ lat: z.number(), lng: z.number() }).optional(),
  instructions: z.string().trim().max(500).optional(),
});
