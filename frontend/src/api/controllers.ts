import { useMutation, useQuery } from "@tanstack/react-query";
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

// Bentuk asli response POST /api/controllers/{id}/sync (lihat backend/app/schemas/controller.py
// SyncResultOut). status=SYNC_FAILED (TIMEOUT/MISMATCH) BUKAN error HTTP - dibalas 200 apa adanya.
export interface SyncResult {
  sync_id: string;
  status: "OK" | "SYNC_FAILED";
  count: number;
  last: string | null;
}

export function useSyncController() {
  return useMutation({
    mutationFn: async (controllerId: number) => {
      const { data } = await apiClient.post<SyncResult>(`/api/controllers/${controllerId}/sync`);
      return data;
    },
  });
}
