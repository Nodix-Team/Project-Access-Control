# Keputusan Arsitektur — Proposal v0.2 vs Review

**Tanggal**: 2026-07-14
**Sumber**: `architecture_proposal_v0.2.md` (usulan) + `ARCHITECTURE_REVIEW.md` (review)
**Tujuan dokumen**: menyatukan dua dokumen jadi **satu kontrak yang dibekukan**, supaya 2 orang bisa kerja paralel tanpa saling menunggu.

---

## 1. Ringkasan Perbandingan

| # | Aspek | Proposal v0.2 bilang | Review bilang | **Keputusan** | Dampak ke Backend |
|---|-------|----------------------|---------------|---------------|-------------------|
| 1 | Penomoran pintu | Publish `door_id` (global) ke controller | **BUG**. Controller hanya kenal `door_number` (1–4). Baru ketahuan di controller ke-2 | **Ikut review.** Backend wajib translate `door_id → door_number` sebelum publish. `door_id` tidak pernah keluar dari Backend | Tinggi — 1 query JOIN + grouping per controller |
| 2 | Keamanan MQTT | "Tetap, tidak berubah" (= tanpa auth) | Wajib user/pass per-controller + ACL per-topic | **Ikut review, tapi bertahap**: ACL + user/pass di tahap integrasi; TLS ditunda ke v0.5 (LAN only) | Sedang — kredensial di `.env`, bukan hardcode |
| 3 | Protokol sync | `sync/start` + `sync/end`, isi di antaranya tidak didefinisikan | Butuh `sync_id` + count + **staging atomik** + QoS 1 + `sync/result` | **Ikut review 100%.** Ini yang paling sering bikin data diam-diam beda | Tinggi — butuh state sync di Backend + retry |
| 4 | Timestamp | Controller kirim Unix epoch | Controller tidak punya jam. **Backend** yang jadi sumber waktu | **Ikut review.** Controller kirim `uptime_ms`, Backend catat `server_ts = NOW()` (UTC) | Rendah — malah menyederhanakan firmware |
| 5 | Push config WiFi/broker | Ada, cuma diberi WARNING | Vektor bricking. Butuh last-known-good + rollback | **Ikut review.** Pisahkan config *aman* (`heartbeat_s`, `total_doors`) vs *berbahaya* (`wifi_*`, `mqtt_*`). Yang berbahaya butuh konfirmasi 2 langkah di UI | Sedang — 2 endpoint berbeda |
| 6 | `wifi_pass` di `config/response` | Dikirim balik | Jangan pernah | **Ikut review.** Password alirannya satu arah saja | Rendah |
| 7 | Audit log | `access_logs` simpan `kartu` saja, nama di-JOIN saat tampil | Kartu dipindahtangankan → riwayat lama berubah nama. Harus snapshot | **Ikut review.** Simpan `user_nama` + `door_nama` sebagai snapshot + kolom `reason` | Sedang — denormalisasi disengaja |
| 8 | `is_online` | Kolom BOOLEAN di tabel `controllers` | Derived state basi. Pakai LWT + hitung dari `last_seen` | **Ikut review.** Kolom `is_online` **dihapus** dari schema | Rendah |
| 9 | `users/update` | Dihapus tanpa penjelasan | Ambigu: `add` itu upsert atau bukan? | **Ikut review.** Ganti nama jadi **`users/set`** dengan semantik **upsert penuh berdasarkan kartu** | Rendah — malah lebih simpel |
| 10 | Auth Backend/Frontend | Tidak disebut sama sekali | Wajib: login, role admin/viewer, WS ikut diautentikasi, `admin_logs` | **Ikut review**, tapi ditaruh di Sprint 6 (setelah fungsional jalan). Struktur DB-nya disiapkan dari awal supaya tidak migrasi ulang | Sedang |
| 11 | Format payload | CSV polos | CSV oke, tapi tanpa versi = jebakan. Prefix `v1,` | **Ikut review.** Semua payload Server→Controller diawali `v1,` | Rendah |
| 12 | Upload CSV | Kolom `doors` isi `door_id` | Detail internal bocor ke admin | **Ikut review.** CSV pakai **nama pintu**, Backend yang resolve | Sedang — butuh validator + pesan error jelas |
| 13 | Log saat offline | Tidak dibahas | Buffer ring di LittleFS, replay saat reconnect | **Terima, tapi P2.** Backend cuma perlu siap terima flag `replayed` | Rendah |
| 14 | Scope rilis | v0.2 = hardware + backend + DB + frontend + multi-controller sekaligus | Terlalu besar, dipecah jadi v0.2–v0.5 | **Ikut review** (lihat §3) | — |

### Yang dari proposal tetap dipertahankan (review setuju, dan saya setuju)

- **`nama` user tidak dikirim ke Controller.** Controller tidak butuh PII untuk memutuskan akses.
- **Hapus user pakai `kartu`, bukan `uid`.** `uid` itu artefak database.
- **`{device_id}` di dalam topic.** Ini yang memungkinkan ACL per-controller.
- **Model akses berlapis**: department default → custom override (`is_custom_access`).
- **Backend yang memetakan pintu → controller.** Admin tidak perlu tahu topologi hardware.

---

## 2. Kontrak MQTT — FINAL (bekukan ini dulu sebelum ngoding)

Ini artefak paling penting untuk kerja paralel. Selama kontrak ini disepakati, **teman Anda bisa bikin firmware dan Anda bisa bikin backend tanpa pernah bertemu**.

### Server → Controller (QoS 1, semua diawali `v1,`)

| Topic | Payload | Semantik |
|-------|---------|----------|
| `access/{device_id}/users/set` | `v1,AABBCCDD,1\|3` | **Upsert.** Ganti total hak akses kartu ini. Belum ada → buat |
| `access/{device_id}/users/delete` | `v1,AABBCCDD` | Idempoten. Hapus yang tidak ada = sukses |
| `access/{device_id}/users/sync/start` | `v1,{sync_id}` | Buat daftar **baru di RAM**. Daftar lama TETAP dipakai |
| `access/{device_id}/users/sync/end` | `v1,{sync_id},{count}` | Bandingkan count → commit atomik atau buang |
| `access/{device_id}/config/set` | `v1,heartbeat_s,60` | Satu key per pesan |
| `access/{device_id}/config/request` | `v1` | Minta controller lapor config |

### Controller → Server

| Topic | Payload | Keterangan |
|-------|---------|------------|
| `access/{device_id}/logs` | `v1,AABBCCDD,2,GRANTED,OK,123456` | `kartu, door_number, hasil, reason, uptime_ms` |
| `access/{device_id}/status` | `v1,{total_doors},{rssi},{free_heap},{uptime_ms}` | Tiap `heartbeat_s` |
| `access/{device_id}/status/lwt` | `online` / `offline` | **Retained.** LWT diregister saat connect |
| `access/{device_id}/sync/result` | `v1,{sync_id},OK,{count}` atau `v1,{sync_id},MISMATCH,{diterima}` | |
| `access/{device_id}/config/response` | `v1,{device_id},{total_doors},{ssid},{broker},{port},{heartbeat_s}` | **TANPA wifi_pass** |

### Nilai `reason` yang sah
`OK` | `UNKNOWN_CARD` | `NO_ACCESS` | `INVALID_DOOR`

### Aturan yang tidak boleh dilanggar
1. Backend **tidak pernah** mengirim `door_id`. Hanya `door_number` (1–`total_doors`).
2. Backend **tidak pernah** mengirim `nama`.
3. `wifi_pass` mengalir satu arah: Backend → Controller. Tidak pernah balik.
4. Sync gagal ⇒ Controller **mempertahankan daftar lama**. Pintu tidak pernah "kosong".
5. Kartu tak dikenal **tetap di-log** (`reason=UNKNOWN_CARD`) — invariant warisan v0.1.

---

## 3. Pentahapan Rilis (ikut saran review, disesuaikan untuk tim 2 orang)

| Versi | Isi | Siapa | Kriteria selesai |
|-------|-----|-------|------------------|
| **v0.2** | Firmware: RFID + relay, **1 controller**, kontrak MQTT **baru** (CSV, `users/set`) | Teman | Kartu fisik membuka pintu fisik |
| | Backend+DB+Frontend: full stack jalan lawan **mock controller** | **Anda** | Admin bisa CRUD user via web, log masuk DB — tanpa ESP32 sama sekali |
| **v0.3** | Integrasi nyata: firmware ↔ backend | Berdua | Tap kartu fisik muncul di live feed web |
| **v0.4** | Multi-controller + auth MQTT + ACL | Berdua | 2 controller jalan bersamaan, P0-1 terbukti tidak terjadi |
| **v0.5** | Auth web, config push + rollback, TLS | Anda | Admin bisa kerja tanpa terminal |

> **Poin pentingnya**: di v0.2, jalur Anda dan jalur teman Anda **tidak bersentuhan sama sekali**. Yang menghubungkan hanya dokumen kontrak MQTT di atas. Titik temu pertama baru di v0.3.
