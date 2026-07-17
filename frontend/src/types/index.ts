// Cermin schema MySQL (8 tabel, lihat database/schema.sql) + bentuk response FastAPI.
// door_id/door_number: door_id = PK global (tidak pernah keluar ke controller/UI-akses-controller),
// door_number = nomor lokal 1-N per controller (yang ditampilkan ke user di UI).

export interface Admin {
  id: number;
  username: string;
  role: "admin";
  created_at: string;
}

export interface Controller {
  id: number;
  device_id: string;
  nama: string;
  lokasi: string;
  wifi_ssid: string | null;
  mqtt_broker: string | null;
  mqtt_port: number;
  mqtt_user: string | null;
  total_doors: number;
  heartbeat_s: number;
  ip_mode: "dhcp" | "static";
  ip_address: string | null;
  web_port: number;
  last_seen: string | null;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface Door {
  id: number;
  controller_id: number;
  door_number: number;
  nama: string;
  lokasi: string;
}

export interface Department {
  id: number;
  nama: string;
  deskripsi: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentAccess {
  id: number;
  department_id: number;
  door_id: number;
}

export interface User {
  uid: number;
  kartu: string;
  nama: string;
  department_id: number | null;
  is_custom_access: boolean;
  // Hak akses ter-resolve: door_number per controller (backend menerjemahkan door_id -> door_number).
  // Dipakai di halaman User Detail untuk render checkbox per controller.
  resolved_access?: Record<number, number[]>; // controller_id -> door_number[]
  created_at: string;
  updated_at: string;
}

export interface UserAccess {
  id: number;
  user_id: number;
  door_id: number;
}

export type AccessResult = "GRANTED" | "DENIED";
export type AccessReason = "OK" | "UNKNOWN_CARD" | "NO_ACCESS" | "INVALID_DOOR";

export interface AccessLog {
  id: number;
  kartu: string;
  user_id: number | null;
  user_nama: string | null; // SNAPSHOT saat kejadian, bukan hasil JOIN ke users
  door_id: number | null;
  door_nama: string | null; // SNAPSHOT saat kejadian, bukan hasil JOIN ke doors
  controller_id: number | null;
  result: AccessResult;
  reason: AccessReason | null;
  server_ts: string; // UTC, otoritatif dari backend
  device_uptime_ms: number | null;
  is_replayed: boolean;
  created_at: string;
}
