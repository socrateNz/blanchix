import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface CatalogItemDTO {
  id: string;
  nom: string;
  prixUnitaire: number;
  categorie?: string;
}

export function useCatalog() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data } = await api.get<CatalogItemDTO[]>("/catalog");
      return data;
    },
  });
}
