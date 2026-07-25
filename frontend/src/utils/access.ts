// Konversi hak akses ter-resolve (dari backend) menjadi daftar door_id global untuk seed checkbox
// "custom access" di halaman User Detail.
//
// Diekstrak dari UserDetail.tsx (Sprint 1 CI/CD, KEPUTUSAN §6.6) supaya bisa di-unit-test.
// PENTING: `access` dikunci oleh device_id (string, mis. "ctrl-A"), BUKAN controller_id numerik —
// backend menerjemahkan door_id -> door_number sebelum mengirim, jadi konversi baliknya wajib
// lewat controller.device_id lalu (controller_id, door_number) -> door.id. Salah asumsi kunci di
// sini pernah jadi bug di versi mock lama.
import type { Controller, Door } from "../types";

export function accessToDoorIds(
  access: Record<string, number[]>,
  controllers: Controller[],
  doors: Door[],
): number[] {
  const ids: number[] = [];
  for (const [deviceId, doorNumbers] of Object.entries(access)) {
    const controller = controllers.find((c) => c.device_id === deviceId);
    if (!controller) continue;
    for (const doorNumber of doorNumbers) {
      const door = doors.find((d) => d.controller_id === controller.id && d.door_number === doorNumber);
      if (door) ids.push(door.id);
    }
  }
  return ids;
}
