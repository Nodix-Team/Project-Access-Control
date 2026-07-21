import { Navigate } from "react-router-dom";
import { useMe } from "../api/auth";
import Layout from "./Layout";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("jwt");
  // Validasi token masih hidup lewat GET /api/auth/me, bukan cuma cek "ada di localStorage".
  // Kalau 401, interceptor di api/client.ts sudah handle hapus token + redirect /login.
  const { isLoading, isError } = useMe(Boolean(token));

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading || isError) {
    return null;
  }

  return <Layout>{children}</Layout>;
}
