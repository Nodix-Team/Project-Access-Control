import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export interface DoorPayload {
  controller_id: number;
  door_number: number;
  nama: string;
  lokasi: string;
}

export function useCreateDoor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: DoorPayload) => {
      const { data } = await apiClient.post<Door>("/api/doors", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doors"] });
    },
  });
}

export function useUpdateDoor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: DoorPayload }) => {
      const { data } = await apiClient.put<Door>(`/api/doors/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doors"] });
    },
  });
}

export function useDeleteDoor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/doors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doors"] });
    },
  });
}
