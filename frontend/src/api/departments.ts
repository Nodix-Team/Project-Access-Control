import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export interface CreateDepartmentPayload {
  nama: string;
  deskripsi: string | null;
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDepartmentPayload) => {
      const { data } = await apiClient.post<ApiDepartment>("/api/departments", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

// PUT backend TIDAK partial (beda dari UserUpdate) - nama, deskripsi, door_ids wajib dikirim
// semua tiap kali, door_ids selalu REPLACE PENUH department_access lama.
export interface UpdateDepartmentPayload {
  nama: string;
  deskripsi: string | null;
  door_ids: number[];
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: UpdateDepartmentPayload }) => {
      const { data } = await apiClient.put<ApiDepartment>(`/api/departments/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
