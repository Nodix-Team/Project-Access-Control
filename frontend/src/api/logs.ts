import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

// Bentuk asli response GET /api/logs (lihat backend/app/schemas/log.py AccessLogOut/AccessLogListOut).
// user_nama/door_nama SNAPSHOT saat kejadian - backend TIDAK JOIN ulang ke users/doors (kartu bisa
// pindah tangan, riwayat harus tetap utuh apa adanya).
export interface ApiAccessLog {
  id: number;
  kartu: string;
  user_id: number | null;
  user_nama: string | null;
  door_id: number | null;
  door_nama: string | null;
  controller_id: number | null;
  result: "GRANTED" | "DENIED";
  reason: string | null;
  server_ts: string;
  device_uptime_ms: number | null;
  is_replayed: boolean;
  created_at: string;
}

export interface AccessLogListResponse {
  items: ApiAccessLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface AccessLogsQueryParams {
  kartu?: string;
  controller_id?: number;
  door_id?: number;
  result?: "GRANTED" | "DENIED";
  date_from?: string;
  date_to?: string;
  is_replayed?: boolean;
  page?: number;
  page_size?: number;
}

// Selalu terurut server_ts DESC dari backend - bukan pilihan client (lihat routes/logs.py).
export function useAccessLogs(params: AccessLogsQueryParams) {
  return useQuery({
    queryKey: ["logs", params],
    queryFn: async () => {
      const { data } = await apiClient.get<AccessLogListResponse>("/api/logs", { params });
      return data;
    },
  });
}
