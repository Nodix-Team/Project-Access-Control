// Test format tanggal/waktu tampilan (revisi @danskiv: dd-mm-yyyy hh:mm:ss, pemisah titik dua).
//
// NOTE PENTING soal timezone: formatDate/formatTime membaca komponen LOKAL (getDate/getHours/...).
// Supaya test deterministik lintas zona waktu mesin CI, input sengaja memakai ISO TANPA offset
// ("2026-07-25T14:30:45") — string semacam ini diparse sebagai waktu LOKAL, lalu dibaca balik
// sebagai lokal, jadi round-trip-nya bebas dari zona waktu runner. Jangan pakai suffix "Z" di sini.
import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime } from "./format";

describe("formatDate", () => {
  it("format dd-mm-yyyy", () => {
    expect(formatDate("2026-07-25T14:30:45")).toBe("25-07-2026");
  });

  it("hari & bulan satu digit di-pad nol", () => {
    expect(formatDate("2026-01-05T09:08:07")).toBe("05-01-2026");
  });
});

describe("formatTime", () => {
  it("format hh:mm:ss 24 jam dengan pemisah titik dua", () => {
    expect(formatTime("2026-07-25T14:30:45")).toBe("14:30:45");
  });

  it("jam/menit/detik satu digit di-pad nol", () => {
    expect(formatTime("2026-01-05T09:08:07")).toBe("09:08:07");
  });

  it("tengah malam jadi 00:00:00, bukan 24:00:00", () => {
    expect(formatTime("2026-07-25T00:00:00")).toBe("00:00:00");
  });
});

describe("formatDateTime", () => {
  it("gabungan tanggal + spasi + waktu", () => {
    expect(formatDateTime("2026-07-25T14:30:45")).toBe("25-07-2026 14:30:45");
  });
});
