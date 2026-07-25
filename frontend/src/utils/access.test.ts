// Test accessToDoorIds — konversi access {device_id -> door_number[]} menjadi door_id global.
// Fokus utama: pemetaan HARUS lewat device_id (bukan controller_id numerik) lalu
// (controller_id, door_number) -> door.id. Ini titik yang pernah salah asumsi di versi mock lama.
import { describe, expect, it } from "vitest";
import type { Controller, Door } from "../types";
import { accessToDoorIds } from "./access";

const controllers = [
  { id: 10, device_id: "ctrl-A" },
  { id: 20, device_id: "ctrl-B" },
] as Controller[];

// door.id sengaja TIDAK berurutan dengan door_number, supaya test membuktikan resolusi lewat
// (controller_id, door_number), bukan kebetulan angka.
const doors = [
  { id: 101, controller_id: 10, door_number: 1 },
  { id: 102, controller_id: 10, door_number: 2 },
  { id: 201, controller_id: 20, door_number: 1 },
  { id: 202, controller_id: 20, door_number: 2 },
] as Door[];

describe("accessToDoorIds", () => {
  it("memetakan device_id + door_number ke door_id global yang benar", () => {
    const ids = accessToDoorIds({ "ctrl-A": [1, 2], "ctrl-B": [2] }, controllers, doors);
    expect(ids.sort((a, b) => a - b)).toEqual([101, 102, 202]);
  });

  it("device_id tak dikenal dilewati diam-diam (tidak melempar error)", () => {
    // NOTE: controller bisa saja belum ter-load / sudah dihapus; jangan crash render UserDetail.
    const ids = accessToDoorIds({ "ctrl-GHOST": [1] }, controllers, doors);
    expect(ids).toEqual([]);
  });

  it("door_number yang tidak ada di controller itu dilewati", () => {
    // ctrl-A tidak punya door_number 4 -> tidak menghasilkan id.
    const ids = accessToDoorIds({ "ctrl-A": [1, 4] }, controllers, doors);
    expect(ids).toEqual([101]);
  });

  it("access kosong menghasilkan array kosong", () => {
    expect(accessToDoorIds({}, controllers, doors)).toEqual([]);
  });

  it("tidak tertukar antar controller dengan door_number sama", () => {
    // ctrl-A door 1 (id 101) vs ctrl-B door 1 (id 201) — harus dibedakan lewat device_id.
    expect(accessToDoorIds({ "ctrl-A": [1] }, controllers, doors)).toEqual([101]);
    expect(accessToDoorIds({ "ctrl-B": [1] }, controllers, doors)).toEqual([201]);
  });
});
