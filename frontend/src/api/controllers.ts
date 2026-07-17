import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

// Bentuk asli response GET /api/controllers/{id}/config (lihat backend/app/schemas/controller.py
// ControllerConfigOut). TIDAK ada field wifi_pass sama sekali - kolom itu memang tidak pernah
// disimpan di DB, jadi tidak ada tempat mengirimkannya balik ataupun menuliskannya.
export interface ApiControllerConfig {
  device_id: string;
  nama: string | null;
  lokasi: string | null;
  wifi_ssid: string | null;
  mqtt_broker: string | null;
  mqtt_port: number | null;
  mqtt_user: string | null;
  total_doors: number | null;
  heartbeat_s: number | null;
  ip_mode: string | null;
  ip_address: string | null;
  web_port: number | null;
}

export function useControllerConfig(controllerId: number | null) {
  return useQuery({
    queryKey: ["controllers", "config", controllerId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiControllerConfig>(
        `/api/controllers/${controllerId}/config`,
      );
      return data;
    },
    enabled: controllerId !== null,
  });
}

// PUT config backend PARTIAL (exclude_unset) - beda dari department, hanya field yang dikirim
// yang di-update. heartbeat_s/total_doors saja yang langsung di-push MQTT (lihat _SAFE_CONFIG_KEYS
// di routes/controllers.py); field lain (wifi_ssid, mqtt_broker, dst) tersimpan ke DB tapi baru
// diterapkan controller lewat web server lokalnya sendiri.
export type UpdateControllerConfigPayload = Partial<Omit<ApiControllerConfig, "device_id">>;

export function useUpdateControllerConfig(controllerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateControllerConfigPayload) => {
      const { data } = await apiClient.put<ApiControllerConfig>(
        `/api/controllers/${controllerId}/config`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["controllers"] });
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
