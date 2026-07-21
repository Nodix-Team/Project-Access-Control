# Laporan Integration Test — Sprint 3 (backend-mqtt)

> Tanggal: 16 Juli 2026 · Dilakukan terhadap DB MySQL & EMQX **nyata** (Docker: `pac-backend-mysql` + `access-control-emqx`), bukan mock.
> Melengkapi `backend/sprint3-test-runbook.html` (04.1–04.6, skala kecil) dengan uji skala besar: 80 user baru + 200 transaksi tap.

## Ringkasan

| Area | Status |
|---|---|
| Full sync 80 user baru (85 total) ke ctrl-A & ctrl-B | ✅ Lulus |
| 200 transaksi tap campuran (granted/denied/kartu asing) | ✅ 197/200 sesuai ekspektasi, 3 selisih — **bug data seed**, bukan bug MQTT/sync |
| WebSocket live feed di beban lebih tinggi | ✅ Lulus |
| Validasi upload CSV (7 aturan) | ✅ Lulus semua |
| Regresi 04.1–04.6 (skala kecil, sesi sebelumnya) | ✅ Lulus semua |

**1 bug ditemukan** (lihat detail di bawah) — bukan di modul MQTT Sprint 3 ini, tapi di data seed (`database/seed.sql`).

---

## 1. Setup

- MySQL (`pac-backend-mysql`, port 3307) + EMQX (`access-control-emqx`, port 1883) — keduanya container Docker asli, bukan mock.
- Backend `uvicorn` dijalankan langsung terhadap keduanya.
- Simulasi controller pakai responder MQTT non-interaktif (logika identik `tools/simulate_esp32.py`, minus CLI) supaya bisa merespons protokol sync/CRUD secara otomatis tanpa perlu ketik manual — dipakai khusus untuk sesi test besar ini.

## 2. Sync 80 User Baru (Total 85 User)

CSV 80 user digenerate (campuran department IT/HRD/Security/tanpa-dept, custom access acak) dan diupload via `POST /api/users/upload-csv`:

```json
{"success_count": 80, "error_count": 0, "errors": []}
```

Full sync ke kedua controller:

| Controller | Hasil | Count | Durasi |
|---|---|---|---|
| ctrl-A (id=1) | `OK` | 71 | **559 ms** |
| ctrl-B (id=2) | `OK` | 46 | **562 ms** |

Count di-cross-check langsung terhadap query resolusi akses (`department_access` + `user_access` → `doors.controller_id`) di database — **cocok persis** (71 dan 46). Semua `door_number` yang diterima controller tetap dalam rentang lokal 1–4, tidak ada `door_id` mentah yang bocor (regression check bug P0-1, tervalidasi di skala 85 user, bukan cuma 1 user seperti test sebelumnya).

## 3. Simulasi 200 Transaksi Tap

Payload MQTT dipublish langsung (bukan lewat CLI simulator) untuk mengontrol presisi skenario: ~60% tap valid (kartu+pintu sesuai akses nyata), ~20% tap ditolak (kartu valid, pintu di luar aksesnya), ~20% kartu asing.

- Publish 200 event: **15,6 ms** (lokal, tanpa network overhead nyata)
- Semua 200 event **berhasil masuk ke DB**, tidak ada yang hilang (23 → 223 baris sebelum dikoreksi off-by-baseline, hasil final tervalidasi 200/200 tersimpan)
- Cross-check per baris (kartu, controller, hasil, user_id) terhadap ekspektasi: **197/200 cocok persis**
- 3 selisih — lihat bug di bawah

## 4. 🐛 Bug Ditemukan: Kartu Jane Smith Tidak Ternormalisasi di Seed Data

**Gejala:** Log akses untuk kartu `11223344` (Jane Smith, seed Sprint 2) selalu tercatat dengan `user_id: NULL` dan `user_nama: NULL`, padahal `result: GRANTED` benar.

**Root cause:**
- `database/seed.sql` insert `users.kartu` untuk Jane Smith sebagai `'11223344'` (8 digit) langsung lewat SQL mentah — **tidak lewat** `normalize_kartu()`.
- Semua jalur lain (upload CSV via `csv_service.py`, ingest log MQTT via `handlers.py`) **selalu** memanggil `normalize_kartu()`, yang mem-pad string numerik <10 digit jadi 10 digit → `11223344` seharusnya jadi `0011223344`.
- Saat full sync, backend publish `users/set` pakai nilai mentah dari DB (`11223344`, belum dinormalisasi) ke controller. Controller (device asli maupun simulator) menormalisasi kartu ini SAAT MENERIMA (`normalize_kartu` juga dipanggil di firmware/simulator) → RAM controller menyimpan Jane di bawah key `0011223344`.
- Saat controller tap & kirim log dengan kartu `0011223344` (sudah ternormalisasi), `handle_log` di backend mencari `User.kartu == '0011223344'` di DB — **tidak ketemu**, karena DB masih menyimpan `'11223344'` (tanpa padding) → `user_id`/`user_nama` jadi `NULL`.
- Kartu seed lain (`AABBCCDD`, `DEADBEEF`, `FF001122`, `CAFEBABE`) aman karena bukan format numerik murni, jadi tidak tersentuh `normalize_kartu()` sama sekali — makanya bug ini baru ketemu sekarang, setelah tes skala besar ikut menyertakan kartu Jane.

**Dampak:** Keputusan akses (GRANTED/DENIED) tetap benar (diputuskan di level controller, independen dari lookup ini). Yang rusak murni **atribusi audit trail** — log tap Jane Smith tidak akan pernah tercatat atas namanya.

**Saran perbaikan** (belum saya terapkan, menunggu keputusan kamu/danskiv):
1. Perbaiki `database/seed.sql`: ganti kartu Jane Smith jadi `'0011223344'` (sudah ternormalisasi), ATAU
2. Tambah normalisasi di `sync_service.py` sebelum publish `users/set` (defense-in-depth, supaya kartu format apapun di DB selalu konsisten saat keluar ke controller) — ini juga akan mencegah bug serupa di masa depan kalau ada data tidak konsisten lainnya.

## 5. WebSocket Live Feed

5 tap dipublish beruntun, semua diterima klien WS dalam <100ms, ID berurutan, `user_nama`/`door_nama` benar, format `server_ts` diakhiri `Z` tunggal. Lulus di beban lebih tinggi (sebelumnya cuma dites 1 tap per klien).

## 6. Validasi Upload CSV (7 Skenario)

| Skenario | Ekspektasi | Hasil |
|---|---|---|
| Header salah (`card,name,dept,doors`) | Tolak seluruh file | ✅ `"Header CSV harus persis..."` |
| Nama mengandung koma (`"Doe, John"`) | Tolak seluruh file | ✅ `"Baris 2: kolom nama mengandung koma..."` |
| Kartu kosong | Tolak baris saja | ✅ |
| Nama kosong | Tolak baris saja | ✅ |
| Kartu duplikat dalam file | Tolak baris kedua, baris pertama tetap masuk | ✅ |
| Department tidak ditemukan | Tolak baris saja | ✅ `"department 'DivisiTidakAda' tidak ditemukan"` |
| Nama pintu tidak ditemukan | Tolak baris saja | ✅ `"nama pintu tidak ditemukan: Pintu Antah Berantah"` |

File dengan 8 baris data (2 file rejected + 1 file campuran) diverifikasi: **0 baris ter-insert** dari 2 file yang seharusnya ditolak total; file campuran menghasilkan tepat 3 sukses + 5 gagal sesuai baris yang dirancang, dan isi datanya diverifikasi benar di DB (termasuk kartu duplikat — baris pertama yang disimpan, bukan yang kedua).

## 7. State DB Setelah Testing

- Total user: **88** (5 seed awal + 80 dari CSV bulk + 3 dari test validasi CSV)
- Total access log: **228**
- Data test (kartu prefix `90000xxx`/`91000xxx`) masih ada di DB lokal — bisa direset via `database/seed.sql` ulang kalau mau state bersih sebelum demo/lanjut kerja.

## 8. Yang Belum Dites di Sesi Ini

- 04.6-E (config push key berbahaya wifi/mqtt) — sudah dites di sesi sebelumnya (bukan sesi ini), tidak diulang.
- Uji hardware ESP32 fisik — tidak tersedia, semua pakai simulasi software (sesuai instruksi, simulasi dianggap cukup mewakili kontrak MQTT).
- Load test lebih ekstrem (ribuan user/transaksi) — di luar skala yang diminta (~80 user sesuai target PRD v0.2).
