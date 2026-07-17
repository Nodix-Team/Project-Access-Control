import type { Controller } from "../types";

// Cermin rumus backend (lihat architecture_proposal_v0.2.md - "is_online Dihitung, Bukan Disimpan"):
//   last_seen > NOW() - INTERVAL (heartbeat_s * 3) SECOND
// Dihitung ulang tiap dipanggil, TIDAK dibaca dari field is_online statis di mock data.
export function isControllerOnline(controller: Controller, now: Date = new Date()): boolean {
  if (!controller.last_seen) return false;
  const lastSeenMs = new Date(controller.last_seen).getTime();
  const thresholdMs = controller.heartbeat_s * 3 * 1000;
  return now.getTime() - lastSeenMs < thresholdMs;
}
