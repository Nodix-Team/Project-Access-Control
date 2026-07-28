// Test toCsv — serialisasi CSV untuk Export Access Logs (diekstrak dari AccessLogs.tsx).
// Fokus: header stabil, urutan kolom, escaping RFC 4180, dan penanganan nilai null.
import { describe, expect, it } from "vitest";
import type { ApiAccessLog } from "../api/logs";
import { CSV_HEADER, toCsv } from "./csv";

function makeLog(overrides: Partial<ApiAccessLog> = {}): ApiAccessLog {
  return {
    id: 1,
    kartu: "0000123456",
    user_id: 1,
    user_nama: "John Doe",
    door_id: 2,
    door_nama: "Ruang Server",
    controller_id: 1,
    result: "GRANTED",
    reason: "VALID_ACCESS",
    server_ts: "2026-07-25T14:30:45Z",
    device_uptime_ms: null,
    is_replayed: false,
    created_at: "2026-07-25T14:30:46Z",
    ...overrides,
  };
}

describe("toCsv", () => {
  it("baris pertama adalah header dengan urutan kolom yang tetap", () => {
    const out = toCsv([]);
    expect(out).toBe(CSV_HEADER.join(","));
  });

  it("tiap sel dibungkus kutip ganda dan kolom sesuai urutan header", () => {
    const out = toCsv([makeLog()]);
    const lines = out.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      '"1","2026-07-25T14:30:45Z","0000123456","John Doe","Ruang Server","1","GRANTED","VALID_ACCESS","false"',
    );
  });

  it("nilai null (user_nama, door_nama, reason, controller_id) jadi string kosong", () => {
    // NOTE: kejadian tanpa kartu/pintu (REX/alarm) punya banyak null — tidak boleh jadi "null" literal.
    const out = toCsv([
      makeLog({ user_nama: null, door_nama: null, reason: null, controller_id: null }),
    ]);
    const cells = out.split("\n")[1];
    expect(cells).toBe('"1","2026-07-25T14:30:45Z","0000123456","","","","GRANTED","","false"');
  });

  it("kutip ganda di dalam data digandakan (escape RFC 4180)", () => {
    // NOTE: nama seperti bagian dari data bebas bisa mengandung kutip -> harus di-escape jadi ""
    const out = toCsv([makeLog({ user_nama: 'Budi "The Boss"' })]);
    expect(out.split("\n")[1]).toContain('"Budi ""The Boss"""');
  });

  it("koma di dalam data tidak merusak kolom karena sel dibungkus kutip", () => {
    const out = toCsv([makeLog({ door_nama: "Lobby, Lantai 1" })]);
    const cells = out.split("\n")[1];
    // Masih tepat 9 sel meski ada koma di dalam data.
    expect(cells.match(/","/g)?.length).toBe(CSV_HEADER.length - 1);
  });
});
