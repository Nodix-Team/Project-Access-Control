import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AdminMe {
  id: number;
  username: string;
  role: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post<TokenResponse>("/api/auth/login", payload);
      return data;
    },
  });
}

// Dipakai ProtectedRoute (opsional) buat validasi token masih hidup, bukan cuma "ada di localStorage".
export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get<AdminMe>("/api/auth/me");
      return data;
    },
    enabled,
    retry: false,
  });
}
