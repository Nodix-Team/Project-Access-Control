// Format waktu standar seluruh aplikasi (catatan revisi @danskiv): dd-mm-yyyy hh:mm:ss, 24 jam,
// pemisah jam pakai titik dua (:) - BUKAN toLocaleTimeString("id-ID") yang defaultnya pakai titik (.).
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}
