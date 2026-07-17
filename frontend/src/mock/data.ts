// Sumber data dummy TUNGGAL untuk fase MOCKUP - semua halaman ambil dari sini, jangan bikin
// dummy data terpisah di masing-masing komponen. Bentuk & isi meniru database/seed.sql asli
// supaya representatif (bukan data karangan) - lihat SPRINT3_INTEGRATION_TEST_REPORT.md.
import type {
  AccessLog,
  Controller,
  Department,
  DepartmentAccess,
  Door,
  User,
} from "../types";

export const departments: Department[] = [
  { id: 1, nama: "IT", deskripsi: "Divisi Teknologi Informasi", created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
  { id: 2, nama: "HRD", deskripsi: "Human Resource Development", created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
  { id: 3, nama: "Security", deskripsi: "Tim Keamanan", created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
];

export const controllers: Controller[] = [
  {
    id: 1,
    device_id: "ctrl-A",
    nama: "Controller Gedung A",
    lokasi: "Gedung A Lantai 1",
    wifi_ssid: "OFFICE_WIFI",
    mqtt_broker: "192.168.1.100",
    mqtt_port: 1883,
    mqtt_user: "ctrl-A",
    total_doors: 4,
    heartbeat_s: 30,
    ip_mode: "static",
    ip_address: "192.168.1.88",
    web_port: 8081,
    last_seen: new Date().toISOString(),
    is_online: true,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
  },
  {
    id: 2,
    device_id: "ctrl-B",
    nama: "Controller Gedung B",
    lokasi: "Gedung B Lantai 1",
    wifi_ssid: "OFFICE_WIFI",
    mqtt_broker: "192.168.1.100",
    mqtt_port: 1883,
    mqtt_user: "ctrl-B",
    total_doors: 4,
    heartbeat_s: 30,
    // sengaja lama supaya kelihatan offline di dashboard mockup (uji rumus last_seen vs heartbeat_s*3)
    last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    is_online: false,
    ip_mode: "dhcp",
    ip_address: null,
    web_port: 8081,
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
  },
];

// door_number LOKAL per controller (1-4) - inilah yang wajib tampil di UI, bukan door_id (id).
export const doors: Door[] = [
  { id: 1, controller_id: 1, door_number: 1, nama: "Lobby Utama", lokasi: "Gedung A - Lantai 1" },
  { id: 2, controller_id: 1, door_number: 2, nama: "Ruang Server", lokasi: "Gedung A - Lantai 1" },
  { id: 3, controller_id: 1, door_number: 3, nama: "Ruang Meeting", lokasi: "Gedung A - Lantai 2" },
  { id: 4, controller_id: 1, door_number: 4, nama: "Ruang Arsip", lokasi: "Gedung A - Lantai 2" },
  { id: 5, controller_id: 2, door_number: 1, nama: "Lobby B", lokasi: "Gedung B - Lantai 1" },
  { id: 6, controller_id: 2, door_number: 2, nama: "Lab Komputer", lokasi: "Gedung B - Lantai 1" },
  { id: 7, controller_id: 2, door_number: 3, nama: "Ruang Workshop", lokasi: "Gedung B - Lantai 2" },
  { id: 8, controller_id: 2, door_number: 4, nama: "Gudang", lokasi: "Gedung B - Lantai 2" },
];

// default akses per department (door_id, bukan door_number - resolusi ke nomor lokal terjadi di
// resolveAccess() di bawah, meniru resolve_user_access() backend)
export const departmentAccess: DepartmentAccess[] = [
  { id: 1, department_id: 1, door_id: 1 },
  { id: 2, department_id: 1, door_id: 2 },
  { id: 3, department_id: 1, door_id: 6 },
  { id: 4, department_id: 2, door_id: 1 },
  { id: 5, department_id: 2, door_id: 3 },
  { id: 6, department_id: 3, door_id: 1 },
  { id: 7, department_id: 3, door_id: 2 },
  { id: 8, department_id: 3, door_id: 3 },
  { id: 9, department_id: 3, door_id: 4 },
];

// custom access (hanya relevan untuk user is_custom_access = true)
const userAccessMap: Record<number, number[]> = {
  2: [1, 2, 3, 6], // Jane Smith: Lobby, Server, Meeting, Lab Komputer
  4: [5], // Alice Brown: Lobby B saja
};

export const users: User[] = [
  { uid: 1, kartu: "AABBCCDD", nama: "John Doe", department_id: 1, is_custom_access: false, created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
  { uid: 2, kartu: "0011223344", nama: "Jane Smith", department_id: 1, is_custom_access: true, created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
  { uid: 3, kartu: "DEADBEEF", nama: "Bob Wilson", department_id: 2, is_custom_access: false, created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
  { uid: 4, kartu: "FF001122", nama: "Alice Brown", department_id: null, is_custom_access: true, created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
  { uid: 5, kartu: "CAFEBABE", nama: "Charlie Lee", department_id: 3, is_custom_access: false, created_at: "2026-07-15T00:00:00Z", updated_at: "2026-07-15T00:00:00Z" },
];

// Meniru resolve_user_access() backend: is_custom_access -> user_access, else -> department_access.
// Hasilnya door_number per controller_id (nomor LOKAL, bukan door_id) - persis kontrak yang
// dikirim ke UI oleh backend asli.
export function resolveAccess(user: User): Record<number, number[]> {
  const doorIds = user.is_custom_access
    ? userAccessMap[user.uid] ?? []
    : departmentAccess.filter((da) => da.department_id === user.department_id).map((da) => da.door_id);

  const byController: Record<number, number[]> = {};
  for (const doorId of doorIds) {
    const door = doors.find((d) => d.id === doorId);
    if (!door) continue;
    byController[door.controller_id] = byController[door.controller_id] ?? [];
    byController[door.controller_id].push(door.door_number);
  }
  return byController;
}

users.forEach((u) => {
  u.resolved_access = resolveAccess(u);
});

function doorLookup(doorId: number | null) {
  return doors.find((d) => d.id === doorId) ?? null;
}

export const accessLogs: AccessLog[] = [
  {
    id: 1,
    kartu: "AABBCCDD",
    user_id: 1,
    user_nama: "John Doe",
    door_id: 1,
    door_nama: "Lobby Utama",
    controller_id: 1,
    result: "GRANTED",
    reason: "OK",
    server_ts: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    device_uptime_ms: 547648,
    is_replayed: false,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    kartu: "0011223344",
    user_id: 2,
    user_nama: "Jane Smith",
    door_id: 6,
    door_nama: "Lab Komputer",
    controller_id: 2,
    result: "GRANTED",
    reason: "OK",
    server_ts: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    device_uptime_ms: 123456,
    is_replayed: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    kartu: "00000FADE",
    user_id: null,
    user_nama: null,
    door_id: 1,
    door_nama: "Lobby Utama",
    controller_id: 1,
    result: "DENIED",
    reason: "UNKNOWN_CARD",
    server_ts: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    device_uptime_ms: 75303,
    is_replayed: false,
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    kartu: "DEADBEEF",
    user_id: 3,
    user_nama: "Bob Wilson",
    door_id: 2,
    door_nama: "Ruang Server",
    controller_id: 1,
    result: "DENIED",
    reason: "NO_ACCESS",
    server_ts: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    device_uptime_ms: 88120,
    is_replayed: false,
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    kartu: "AABBCCDD",
    user_id: 1,
    user_nama: "John Doe",
    door_id: 1,
    door_nama: "Lobby Utama",
    controller_id: 1,
    result: "GRANTED",
    reason: "OK",
    server_ts: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    device_uptime_ms: 1000,
    is_replayed: true,
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

export function findDoorNumber(doorId: number | null): number | null {
  return doorLookup(doorId)?.door_number ?? null;
}
