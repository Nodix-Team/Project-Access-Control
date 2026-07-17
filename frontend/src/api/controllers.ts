import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Controller } from "../types";

export function useControllers() {
  return useQuery({
    queryKey: ["controllers"],
    queryFn: async () => {
      const { data } = await apiClient.get<Controller[]>("/api/controllers");
      return data;
    },
  });
}
