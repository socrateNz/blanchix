import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface ZoneDTO {
  id: string;
  nom: string;
  prix: number;
}

export function useZones() {
  return useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data } = await api.get<ZoneDTO[]>("/zones");
      return data;
    },
  });
}
