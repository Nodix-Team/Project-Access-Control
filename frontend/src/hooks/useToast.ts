import { useCallback, useState } from "react";

// Toast sederhana untuk konfirmasi aksi mock (Fase A) - tanpa library tambahan.
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string, durationMs = 2500) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), durationMs);
  }, []);

  return { toastMessage: message, showToast };
}
