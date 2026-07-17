import { useEffect, useState } from "react";

// Simulasi delay loading data server (Fase A murni dummy, tidak ada network nyata).
// Dipakai supaya pola skeleton-loading sudah establish sebelum Fase B ganti ke React Query
// (yang punya `isLoading` asli dari network) - komponen halaman tidak perlu berubah struktur.
export function useSimulatedLoading(ms = 400): boolean {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), ms);
    return () => clearTimeout(timer);
  }, [ms]);

  return isLoading;
}
