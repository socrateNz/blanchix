import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface SettingsDTO {
  commandeMinimale: number;
  livraisonGratuiteActive: boolean;
  livraisonGratuiteSeuil: number;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await api.get<SettingsDTO>("/settings");
      return data;
    },
  });
}
