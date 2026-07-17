import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

// Bentuk asli response GET /api/users (lihat backend/app/schemas/user.py UserOut/UserListOut).
// `access` adalah Dict[str, List[int]] di backend -> kunci controller_id JADI STRING setelah
// lewat JSON, bukan number (gotcha umum JSON.parse) - dipakai lengkap mulai Prompt B2/B3.
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
