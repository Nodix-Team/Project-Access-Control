import { useEffect } from "react";
import { useThemeStore } from "../store/themeStore";

// Sinkronkan theme dari store ke class "dark" di <html> (dibaca custom variant Tailwind
// di index.css). Dipanggil sekali di root App supaya efeknya global ke semua halaman.
export function useThemeSync() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
}
