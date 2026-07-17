import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

// Bentuk asli response GET /api/users (lihat backend/app/schemas/user.py UserOut/UserListOut).
// `access` adalah Dict[str, List[int]] di backend, KUNCINYA device_id STRING (mis. "ctrl-A"),
// BUKAN controller_id angka - dikonfirmasi langsung dari response nyata, bukan asumsi dari tipe
// Python. Dipakai penuh mulai Prompt B3 (User Detail).
export interface ApiUser {
  uid: number;
  kartu: string;
  nama: string;
  department_id: number | null;
  is_custom_access: boolean;
  created_at: string;
  updated_at: string;
  access: Record<string, number[]>;
}

export interface UserListResponse {
  items: ApiUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface UsersQueryParams {
  search?: string;
  department_id?: number;
  page?: number;
  page_size?: number;
}

export function useUsers(params: UsersQueryParams = {}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const { data } = await apiClient.get<UserListResponse>("/api/users", { params });
      return data;
    },
  });
}

export interface CreateUserPayload {
  kartu: string;
  nama: string;
  department_id: number | null;
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await apiClient.post<ApiUser>("/api/users", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uid: number) => {
      await apiClient.delete(`/api/users/${uid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export interface CsvUploadRowError {
  row: number;
  kartu: string;
  reason: string;
}

export interface CsvUploadResponse {
  success_count: number;
  processed_kartu: string[];
  error_count: number;
  errors: CsvUploadRowError[];
}

export function useUploadUsersCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<CsvUploadResponse>(
        "/api/users/upload-csv",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
