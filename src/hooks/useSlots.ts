import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface SlotDTO {
  id: string;
  date: string;
  plageHoraire: string;
  placesRestantes: number;
  complet: boolean;
}

export function useSlots(type: "collecte" | "livraison") {
  return useQuery({
    queryKey: ["slots", type],
    queryFn: async () => {
      const { data } = await api.get<SlotDTO[]>("/slots", { params: { type } });
      return data;
    },
  });
}
