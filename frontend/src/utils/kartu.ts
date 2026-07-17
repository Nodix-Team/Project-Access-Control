// Cermin PERSIS backend/app/utils/kartu.py (normalize_kartu) - lihat juga
// UserStorage::normalizeKartu (firmware) dan normalize_kartu (tools/simulate_esp32.py).
// Numerik murni <10 digit -> pad 0 di depan jadi 10 digit; selain itu (hex/alfanumerik) dibiarkan.
// Selalu di-uppercase di akhir (case-insensitive, mengikuti collation utf8mb4_general_ci MySQL).
export function normalizeKartu(kartuRaw: string): string {
  let clean = kartuRaw.trim();
  if (/^\d+$/.test(clean) && clean.length < 10) {
    clean = clean.padStart(10, "0");
  }
  return clean.toUpperCase();
}
