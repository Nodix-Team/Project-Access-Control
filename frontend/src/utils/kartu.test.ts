// Test normalizeKartu — kontrak §2.1 (Wiegand -> card_id) yang WAJIB identik di 3 layer:
//   frontend  src/utils/kartu.ts        (yang ditest di sini)
//   backend   app/utils/kartu.py        (normalize_kartu)
//   firmware  UserStorage::normalizeKartu + firmware/test util native
// Kalau salah satu melenceng, kartu terdaftar tidak akan match di lapangan. Nilai ekspektasi di
// sini adalah "golden" yang sama dipakai test backend & firmware.
import { describe, expect, it } from "vitest";
import { normalizeKartu } from "./kartu";

describe("normalizeKartu", () => {
  it("numerik < 10 digit di-pad nol depan jadi 10 digit", () => {
    // NOTE: ini kasus utama format produksi %010lu dari Wiegand.
    expect(normalizeKartu("123456")).toBe("0000123456");
    expect(normalizeKartu("5")).toBe("0000000005");
  });

  it("numerik tepat 10 digit tidak diubah panjangnya", () => {
    expect(normalizeKartu("0000123456")).toBe("0000123456");
  });

  it("numerik > 10 digit dibiarkan apa adanya (tidak dipotong)", () => {
    // NOTE: memotong akan menghasilkan kartu berbeda -> berbahaya; kontrak memilih membiarkan.
    expect(normalizeKartu("123456789012")).toBe("123456789012");
  });

  it("hex/alfanumerik tidak di-pad, hanya di-uppercase", () => {
    // NOTE: kartu warisan v0.2 (AABBCCDD) bukan numerik murni -> tidak boleh dipadding.
    expect(normalizeKartu("aabbccdd")).toBe("AABBCCDD");
    expect(normalizeKartu("DeadBeef")).toBe("DEADBEEF");
  });

  it("spasi di ujung dibersihkan (trim) sebelum normalisasi", () => {
    expect(normalizeKartu("  123456  ")).toBe("0000123456");
    expect(normalizeKartu(" aabbccdd ")).toBe("AABBCCDD");
  });

  it("string kosong tetap kosong (tidak meledak)", () => {
    // NOTE: penting untuk kejadian tanpa kartu (REX/alarm) — payload boleh berkartu kosong.
    expect(normalizeKartu("")).toBe("");
    expect(normalizeKartu("   ")).toBe("");
  });
});
