// Serialisasi array log akses jadi teks CSV untuk fitur Export di halaman Access Logs.
//
// Diekstrak dari AccessLogs.tsx (Sprint 1 CI/CD, KEPUTUSAN §6.6) supaya bisa di-unit-test tanpa
// merender komponen. Aturan escaping CSV: bungkus tiap sel dengan tanda kutip ganda, dan gandakan
// (" -> "") tiap kutip di dalam sel — mengikuti RFC 4180 supaya koma/kutip/newline dalam data
// (mis. nama user) tidak merusak struktur kolom.
import type { ApiAccessLog } from "../api/logs";

export const CSV_HEADER = [
  "id",
  "server_ts",
  "kartu",
  "user_nama",
  "door_nama",
  "controller_id",
  "result",
  "reason",
  "is_replayed",
] as const;

function escapeCell(value: unknown): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function toCsv(logs: ApiAccessLog[]): string {
  const rows = logs.map((log) =>
    [
      log.id,
      log.server_ts,
      log.kartu,
      log.user_nama ?? "",
      log.door_nama ?? "",
      log.controller_id ?? "",
      log.result,
      log.reason ?? "",
      log.is_replayed,
    ]
      .map(escapeCell)
      .join(","),
  );
  return [CSV_HEADER.join(","), ...rows].join("\n");
}
