import axios from "axios";

// Base URL dari env (Vite) - default localhost:8000 sesuai backend/README.md.
const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const apiClient = axios.create({ baseURL });

// Sisipkan JWT dari localStorage ke tiap request (kecuali login, yang belum punya token).
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 (token invalid/kadaluarsa) -> hapus token, lempar ke /login. Dicek via window.location
// (bukan useNavigate) karena interceptor ini hidup di luar konteks React Router.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("jwt");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
