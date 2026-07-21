# Jobdesk Anda (Backend + DB + Frontend) & Strategi Testing Tanpa ESP32

**Pembagian tim:**

| Orang | Tanggung jawab | Repo |
|-------|----------------|------|
| **Teman Anda** | Firmware ESP32: RFID, relay, LittleFS, MQTT client, protokol sync sisi controller | `Project-Access_control` (existing) |
| **Anda** | MySQL, FastAPI, React, mock controller, integrasi | repo baru: `access-control-server` |

**Satu-satunya penghubung**: dokumen kontrak MQTT (`01_KEPUTUSAN_ARSITEKTUR_v0.2.md` §2).
Selama itu dibekukan, Anda **tidak pernah perlu menunggu ESP32**.

---

## Sprint 0 — Bekukan Kontrak (½ hari, WAJIB berdua)

Ini satu-satunya kegiatan yang butuh teman Anda hadir. Jangan lewati.

- [ ] Duduk bareng, baca `01_KEPUTUSAN_ARSITEKTUR_v0.2.md` §2 (Kontrak MQTT FINAL)
- [ ] Sepakati: nama topic, urutan field CSV, prefix `v1,`, nilai `reason` yang sah
- [ ] Commit dokumen itu ke **kedua repo**. Perubahan setelah ini = naik versi payload
- [ ] Sepakati `device_id` awal: `ctrl-A` (4 pintu), `ctrl-B` (2 pintu)

> **Kenapa `ctrl-B` cuma 2 pintu?** Supaya bug P0-1 langsung meledak kalau Backend salah kirim `door_id`. Kalau kedua controller sama-sama 4 pintu, bug bisa tersembunyi lebih lama.

---

## Jalur Kerja Anda (paralel, 6 sprint)

### Sprint 1 — Database (1–2 hari)
- [ ] Docker compose: MySQL 8 + EMQX
- [ ] Migrasi Alembic sesuai `02_ERD_v0.2.mermaid`
  - `users.kartu` → collation `utf8mb4_general_ci` (case-insensitive, samakan dengan `findByKartu`)
  - `access_logs.id` → `BIGINT` + 3 index
  - **Tidak ada** kolom `is_online` (dihitung dari `last_seen`)
- [ ] Seed: 2 controller, 6 pintu, 3 dept, 4 user (pakai contoh skenario di proposal — John/Jane/Bob/Alice, biar mudah diverifikasi)
- [ ] **Uji manual**: query "pintu apa saja yang boleh diakses John?" harus mengembalikan hasil sesuai tabel "Hasil akses masing-masing user" di proposal

**Deliverable**: schema + seed. Belum ada API. Sudah bisa demo pakai DBeaver.

---

### Sprint 2 — Backend inti, MQTT masih dummy (3–4 hari)
- [ ] FastAPI + SQLAlchemy, CRUD: `/api/users`, `/api/departments`, `/api/controllers`, `/api/doors`
- [ ] **Modul `access_resolver.py`** — jantungnya, tulis unit test-nya duluan:
  ```
  resolve_effective_doors(user_id) → [door_id, ...]     # dept vs custom
  resolve_doors_for_publish(user_id) → {device_id: [door_number]}   # translate!
  ```
- [ ] `mqtt_publisher.py` masih **dummy**: hanya `print()` payload yang akan dikirim
- [ ] **Uji manual**: POST user dengan akses Lobby Utama (ctrl-A) + Lab Komputer (ctrl-B) → log harus mencetak:
  ```
  access/ctrl-A/users/set  →  v1,AABBCCDD,1
  access/ctrl-B/users/set  →  v1,AABBCCDD,2      ← BUKAN 6
  ```
  Kalau yang tercetak `6`, Anda baru saja mereproduksi bug P0-1. Perbaiki sekarang, sebelum ada MQTT sama sekali.

**Deliverable**: bug P0-1 mustahil terjadi, dibuktikan unit test — tanpa broker, tanpa hardware.

---

### Sprint 3 — MQTT nyata + mock controller (3–4 hari)
- [ ] Ganti dummy publisher dengan `aiomqtt`, QoS 1
- [ ] Jalankan `mock_controller.py` (terlampir) — **dua instance sekaligus**
- [ ] Log collector: subscribe `access/+/logs`, `access/+/status`, `access/+/status/lwt`, `access/+/sync/result`
- [ ] Simpan log dengan **snapshot** `user_nama` + `door_nama` + `reason`, `server_ts = NOW()` UTC
- [ ] Protokol sync: `sync_id` (UUID) + count + timeout 30 detik + retry 2×
- [ ] `is_online` = `last_seen > NOW() - INTERVAL heartbeat_s*3 SECOND`

**Deliverable**: full stack backend jalan lawan mock. ESP32 belum ada, dan itu tidak masalah.

---

### Sprint 4 — Frontend inti (4–5 hari)
Urutan halaman (dari paling berguna untuk debugging):
1. **Dashboard + Live Feed** (WebSocket) — ini alat debug Anda sendiri, bikin duluan
2. **User Management** + User Detail (toggle Ikut Dept / Custom)
3. **Department Management** + set default akses
4. **Controller & Door Management** + status online
5. **Access Logs** + filter + export

- [ ] Vite + React + TanStack Query. Jangan pakai `<form>` di artifact-mu; pakai state biasa

---

### Sprint 5 — CSV, config push, log offline (2–3 hari)
- [ ] Upload CSV pakai **nama pintu**, bukan `door_id`. Baris invalid ditolak per-baris
- [ ] Config push: pisahkan aman (`heartbeat_s`, `total_doors`) vs berbahaya (`wifi_*`, `mqtt_*`)
- [ ] Config berbahaya → UI minta ketik nama controller untuk konfirmasi

---

### Sprint 6 — Auth (2–3 hari)
- [ ] Login + JWT, role `admin` / `viewer`
- [ ] WebSocket diautentikasi saat handshake (jangan cuma REST)
- [ ] `admin_logs` (before/after JSON)
- [ ] MQTT username/password per-controller + ACL EMQX (lihat review P0-2)

---

## Titik Temu dengan Teman Anda

| Kapan | Apa | Cara |
|-------|-----|------|
| **Sprint 0** | Bekukan kontrak MQTT | Duduk bareng |
| **Akhir Sprint 3** | Teman Anda uji firmware-nya lawan **Backend Anda** (bukan lawan MQTT Explorer) | Kasih dia IP backend |
| **Akhir Sprint 4** | Integrasi pertama: ESP32 asli menggantikan `ctrl-A`, mock tetap jadi `ctrl-B` | ⭐ Ini trik terbaiknya |
| **v0.4** | ESP32 kedua menggantikan `ctrl-B` | |

> **Trik yang paling menghemat waktu**: mock controller dan ESP32 asli bicara kontrak yang **sama persis**. Jadi Anda bisa mengganti mock → ESP32 **satu per satu**. Kalau ada yang rusak, Anda tahu persis penyebabnya adalah unit yang baru saja diganti.

---

## Strategi Testing Manual Tanpa ESP32

### Alat 1 — `mock_controller.py` (terlampir)

```bash
pip install paho-mqtt
docker run -d --name emqx -p 1883:1883 -p 18083:18083 emqx/emqx:latest

# Terminal 1
python mock_controller.py --device-id ctrl-A --doors 4 --heartbeat 10
# Terminal 2 — sengaja cuma 2 pintu, biar bug P0-1 langsung ketahuan
python mock_controller.py --device-id ctrl-B --doors 2 --heartbeat 10
```

Simulasi tap kartu — ketik langsung di terminal mock:
```
AABBCCDD 2
[ctrl-A] → TAP AABBCCDD pintu 2: GRANTED (OK)
```

### Alat 2 — MQTT Explorer (tetap berguna)
Untuk **mengintip**, bukan untuk mengirim. Subscribe `access/#`, lihat apa yang benar-benar dikirim Backend Anda. Kalau Anda melihat angka `6` mengalir ke `ctrl-B`, hentikan semuanya dan perbaiki resolver.

### Alat 3 — Endpoint dev di Backend
```
POST /api/dev/simulate-tap   { "device_id": "ctrl-A", "kartu": "AABBCCDD", "door_number": 2 }
```
Backend publish ke topic `logs` seolah-olah dia controller. Berguna untuk mengetes Frontend live feed **tanpa** membuka terminal mock. **Wajib dimatikan di produksi** (`if not settings.DEV_MODE: raise 404`).

### Checklist Uji Manual (kerjakan sebelum ESP32 pertama tiba)

| # | Skenario | Cara | Hasil yang benar |
|---|----------|------|------------------|
| 1 | **Bug P0-1** | Kasih John akses Lobby Utama (ctrl-A) + Lab Komputer (ctrl-B, door_id=6, door_number=2) | ctrl-B menerima `v1,AABBCCDD,2`. **Bukan** `6`. Mock akan berteriak `⚠️ DOOR DI LUAR RENTANG` kalau salah |
| 2 | **Dept vs custom** | Ubah akses dept IT → tambah Ruang Meeting | John (`FALSE`) ikut berubah. Jane (`TRUE`) **tidak** |
| 3 | **Kartu tak dikenal** | Tap `DEADFACE` di mock | Log tersimpan, `user_id=NULL`, `reason=UNKNOWN_CARD`, muncul merah di live feed |
| 4 | **Sync gagal** | `--drop-rate 0.2`, lalu klik "Full Sync" | Mock balas `MISMATCH`, **daftar lama tetap dipakai** (uji: tap kartu lama → masih GRANTED). Backend retry |
| 5 | **Deteksi offline** | Ketik `OFFLINE` di mock | LWT `offline` masuk; UI berubah ≤ 3× heartbeat |
| 6 | **Audit log** | Ganti pemilik kartu `AABBCCDD` dari John ke Sarah | Log lama **tetap** tertulis "John Doe" |
| 7 | **Idempoten delete** | Hapus kartu yang tidak ada | Tidak error |
| 8 | **CSV invalid** | Upload CSV, 1 baris nama pintu salah ketik | Baris itu ditolak dengan pesan jelas, sisanya masuk |
| 9 | **Broker mati** | Matikan EMQX | REST + DB tetap jalan. UI kasih banner "broker offline" (NFR-6) |
| 10 | **Case-insensitive** | Tambah `aabbccdd`, lalu coba tambah `AABBCCDD` | Ditolak sebagai duplikat — DB dan firmware harus sependapat |

### Yang **tidak bisa** ditemukan mock controller (jujur, supaya Anda tidak terlena)

| Tidak tertangkap | Kapan baru ketahuan | Antisipasi |
|------------------|---------------------|------------|
| Heap ESP32 habis saat sync 500 user | Integrasi | Minta teman Anda tes 500 user sejak awal |
| Reconnect WiFi flaky | Lapangan | Buffer log offline (P2-1) |
| Latensi RFID + debounce kartu | Hardware | Bukan urusan Anda |
| Perbedaan urutan/timing pesan asli | Integrasi | QoS 1 sudah menutup sebagian besarnya |

Mock controller membuktikan **kontrak dan logika Anda benar**. Ia tidak membuktikan firmware benar. Itu tugas teman Anda.
