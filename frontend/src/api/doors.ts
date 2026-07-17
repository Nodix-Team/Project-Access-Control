import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Door } from "../types";

export function useDoors() {
  return useQuery({
    queryKey: ["doors"],
    queryFn: async () => {
      const { data } = await apiClient.get<Door[]>("/api/doors");
      return data;
    },
  });
}
