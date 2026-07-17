import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

// Bentuk asli response GET /api/departments (lihat backend/app/schemas/department.py).
export interface ApiDepartment {
  id: number;
  nama: string;
  deskripsi: string | null;
  created_at: string;
  updated_at: string;
  user_count: number;
  door_ids: number[]; // default akses saat ini (door_id asli, bukan door_number)
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiDepartment[]>("/api/departments");
      return data;
    },
  });
}
