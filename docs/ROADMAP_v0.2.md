# 🗺️ Roadmap Pengembangan v0.2

> Roadmap ini berdasarkan [Architecture Proposal v0.2 Rev3](docs/architecture_proposal_v0.2.md) dan [CONTRIBUTING.md](CONTRIBUTING.md).
> Setiap milestone = 1 feature branch dari `dev`. Setelah selesai, merge via PR ke `dev`.

---

## Overview Timeline

```
  Sprint 1           Sprint 2           Sprint 3           Sprint 4           Sprint 5
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Database │ ──►  │ Backend  │ ──►  │ Backend  │ ──►  │ Firmware │ ──►  │ Frontend │
│ + EMQX   │      │  Core    │      │  MQTT    │      │  v0.2    │      │  React   │
│  Setup   │      │  API     │      │ + Sync   │      │  Update  │      │  Web App │
└──────────┘      └──────────┘      └──────────┘      └──────────┘      └──────────┘
  ~1 hari            ~3 hari           ~3 hari           ~4 hari           ~5 hari
```

---

## Sprint 1 — Fondasi (Database + EMQX Auth)

**Branch:** `feature/database-setup`
**Estimasi:** ~1 hari
**Folder:** `database/`, EMQX config

### Checklist

- [x] Buat database `access_control` di MySQL
- [x] Jalankan `database/schema.sql` — 8 tabel
- [x] Jalankan `database/seed.sql` — data dummy
- [x] Verifikasi relasi antar tabel via MySQL Workbench
- [x] Setup auth EMQX (username/password per controller):
  - [x] Tambah user `backend` / `{random_pass}`
  - [x] Tambah user `ctrl-A` / `{random_pass}`
  - [x] Tambah user `ctrl-B` / `{random_pass}` (opsional, jika punya 2 ESP32)
- [x] Verifikasi koneksi MQTT **dengan auth** dari laptop
- [x] Catat semua kredensial di `.env.example` (tanpa value asli)

### Deliverable
✅ Database MySQL berisi 8 tabel + data dummy
✅ EMQX broker menerima koneksi hanya dari client yang ter-autentikasi

---

## Sprint 2 — Backend Core API

**Branch:** `feature/backend-core`
**Estimasi:** ~3 hari
**Folder:** `backend/`

### Checklist

- [x] Setup FastAPI project structure:
  ```
  backend/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── config.py              ← .env loader
  │   ├── database.py            ← SQLAlchemy engine + session
  │   ├── auth/
  │   │   ├── router.py          ← POST /api/auth/login
  │   │   ├── jwt.py             ← create/verify JWT token
  │   │   └── dependencies.py    ← get_current_user dependency
  │   ├── models/
  │   │   ├── admin.py
  │   │   ├── controller.py
  │   │   ├── door.py
  │   │   ├── department.py
  │   │   ├── user.py
  │   │   ├── user_access.py
  │   │   ├── department_access.py
  │   │   └── access_log.py
  │   ├── routes/
  │   │   ├── users.py           ← CRUD + upload CSV
  │   │   ├── departments.py     ← CRUD + set default access
  │   │   ├── controllers.py     ← CRUD + config push/pull
  │   │   ├── doors.py           ← CRUD
  │   │   └── logs.py            ← GET logs + filter
  │   └── services/
  │       ├── user_service.py    ← business logic (resolve akses)
  │       ├── sync_service.py    ← logika sync ke controller
  │       └── csv_service.py     ← validasi + parse CSV upload
  ├── requirements.txt
  ├── .env.example
  └── tests/
  ```
- [x] Install dependencies: `fastapi`, `uvicorn`, `sqlalchemy`, `pymysql`, `python-jose`, `bcrypt`, `python-dotenv`
- [x] Implementasi JWT Auth:
  - [x] `POST /api/auth/login` → return JWT token
  - [x] Middleware: semua route kecuali login wajib JWT header
- [x] Implementasi CRUD User:
  - [x] `GET /api/users` — daftar user + filter + pagination
  - [x] `POST /api/users` — tambah user baru
  - [x] `PUT /api/users/{uid}` — edit user
  - [x] `DELETE /api/users/{uid}` — hapus user
  - [x] `POST /api/users/upload-csv` — bulk import (validasi sesuai proposal)
- [x] Implementasi CRUD Department:
  - [x] `GET /api/departments`
  - [x] `POST /api/departments`
  - [x] `PUT /api/departments/{id}` — termasuk set `department_access`
  - [x] `DELETE /api/departments/{id}`
- [x] Implementasi Controller & Door:
  - [x] `GET /api/controllers` — daftar controller + status online (hitung dari `last_seen`)
  - [x] `GET /api/controllers/{id}/config` — baca config controller
  - [x] `PUT /api/controllers/{id}/config` — push config baru
  - [x] CRUD doors (assign ke controller, beri nama/lokasi)
- [x] Implementasi Logs:
  - [x] `GET /api/logs` — filter by kartu, controller, door, tanggal, result
- [x] Logika Resolusi Akses:
  - [x] `is_custom_access = TRUE` → ambil dari `user_access`
  - [x] `is_custom_access = FALSE` → ambil dari `department_access`
  - [x] Terjemahkan `door_id` → `door_number` per controller (**aturan kritis**)
- [x] Test semua endpoint via Swagger UI (`/docs`)

### Deliverable
✅ Backend FastAPI berjalan di `localhost:8000`
✅ Semua REST API endpoint bisa diakses via Swagger UI
✅ JWT login berfungsi

---

## Sprint 3 — Backend MQTT + Sync Protocol

**Branch:** `feature/backend-mqtt`
**Estimasi:** ~3 hari
**Folder:** `backend/app/mqtt/`

### Checklist

- [ ] Setup MQTT client (`aiomqtt`) dalam FastAPI lifecycle:
  ```
  backend/app/mqtt/
  ├── client.py              ← connect ke EMQX (dengan auth)
  ├── publisher.py           ← publish ke controller
  ├── subscriber.py          ← subscribe log, status, config/response, sync/result
  └── handlers.py            ← logika proses pesan masuk
  ```
- [ ] Subscribe topics:
  - [ ] `access/+/logs` → simpan ke `access_logs` (snapshot `user_nama`, `door_nama`, `server_ts = NOW()`)
  - [ ] `access/+/status` → update `last_seen` di controller
  - [ ] `access/+/config/response` → forward ke frontend (opsional)
  - [ ] `access/+/sync/result` → proses OK/MISMATCH
  - [ ] `access/+/status/lwt` → deteksi controller offline
- [ ] Publish topics (saat admin CRUD user/config):
  - [ ] `access/{id}/users/set` — format CSV: `AABBCCDD,1|3` (QoS 1)
  - [ ] `access/{id}/users/delete` — format CSV: `AABBCCDD` (QoS 1)
  - [ ] `access/{id}/config/set` — format CSV: `key,value` (QoS 1)
  - [ ] `access/{id}/config/request` (QoS 1)
- [ ] Implementasi **Sync Atomik**:
  - [ ] `POST /api/controllers/{id}/sync` → trigger full sync
  - [ ] Kirim `sync/start` → `users/set` × N → `sync/end` (dengan count)
  - [ ] Handle response `sync/result` (OK atau MISMATCH → retry)
- [ ] Implementasi **WebSocket** untuk live feed:
  - [ ] `WS /ws/live-feed` → push log real-time ke frontend
- [ ] Implementasi log REPLAYED:
  - [ ] Deteksi flag `REPLAYED` di payload log
  - [ ] Simpan dengan `is_replayed = TRUE`
- [ ] Backend sebagai NTP server (opsional, bisa pakai library `ntplib`):
  - [ ] Atau: cukup pakai `server_ts = NOW()` saat terima log (sudah cukup untuk v0.2)
- [ ] Test integrasi: API → MQTT → (simulasi controller) → log masuk DB

### Deliverable
✅ Backend bisa kirim perintah ke controller via MQTT
✅ Log dari controller masuk ke database dengan snapshot nama
✅ Sync atomik berfungsi (start → set × N → end → result)
✅ WebSocket live feed aktif

---

## Sprint 4 — Firmware v0.2 (ESP32 Update)

**Branch:** `feature/firmware-v0.2`
**Estimasi:** ~4 hari
**Folder:** `firmware/`

### Checklist

**MQTT Protocol Update:**
- [x] Ganti format pesan dari JSON → CSV
- [x] Ganti topic dari `access/users/add` → `access/{device_id}/users/set`
- [x] Ganti topic `access/users/delete` → pakai nomor kartu (bukan uid)
- [x] Tambah QoS 1 untuk semua topic kritis
- [x] Tambah MQTT auth (username/password) saat connect
- [x] Implementasi LWT (`access/{device_id}/status/lwt`)
- [x] Update heartbeat payload ke format CSV: `{total_doors},{user_count},{free_heap},{uptime_ms}`

**Sync Atomik:**
- [x] Handle `sync/start` → buat daftar baru di RAM (jangan hapus yang lama)
- [x] Handle `users/set` saat mode sync → tampung di RAM
- [x] Handle `sync/end` → verifikasi count:
  - [x] Cocok → atomic swap ke LittleFS, publish `sync/result OK`
  - [x] Tidak cocok → buang RAM, pertahankan lama, publish `sync/result MISMATCH`

**`users/set` (Upsert):**
- [x] Kartu sudah ada → replace daftar pintu
- [x] Kartu belum ada → tambah baru
- [x] Simpan di LittleFS (hanya `kartu` + `doors`, tanpa nama)

**Config Management:**
- [x] Handle `config/set` via MQTT
- [x] Handle `config/request` → respond `config/response` (tanpa `wifi_pass`!)
- [x] **Config rollback**: simpan `config_last_known_good.json` sebelum terapkan config berbahaya
- [x] Setelah reboot, jika gagal connect MQTT dalam 60 detik → restore config lama

**Web Server Lokal:**
- [x] Jalankan web server di port `8081` (atau configurable)
- [x] Halaman HTML: set IP (static/DHCP), WiFi, MQTT broker, heartbeat
- [x] Halaman status: koneksi WiFi, MQTT, jumlah user, free heap
- [x] Config via web server juga trigger rollback mechanism

**Buffer Log Offline (Ring Buffer):**
- [x] Saat MQTT terputus → simpan log ke `/logs/offline_buffer.csv` di LittleFS
- [x] Kapasitas: 500 entri (ring buffer, terlama ditimpa)
- [x] Saat reconnect → kirim semua log buffered dengan flag `REPLAYED`
- [x] Setelah semua terkirim → kosongkan buffer

**Hardware (opsional, jika sudah ada):**
- [ ] Integrasi RFID RC522 (gantikan simulasi Serial)
- [ ] Integrasi Relay untuk doorlock
- [ ] Integrasi buzzer/LED untuk feedback

### Deliverable
✅ Firmware v0.2 di ESP32, kompatibel dengan backend baru
✅ MQTT dengan auth, CSV, QoS 1
✅ Sync atomik berfungsi end-to-end
✅ Web server lokal bisa diakses di browser
✅ Log tidak hilang saat offline

---

## Sprint 5 — Frontend React Web App

**Branch:** `feature/frontend-app`
**Estimasi:** ~5 hari
**Folder:** `frontend/`

### Checklist

**Setup:**
- [ ] Init React + Vite: `npx -y create-vite@latest ./ --template react`
- [ ] Install: `axios`, `react-router-dom`, `react-query` (atau `zustand`)
- [ ] Setup routing, layout, auth context

**Halaman Login:**
- [ ] Form username + password
- [ ] Call `POST /api/auth/login` → simpan JWT di localStorage/cookie
- [ ] Redirect ke Dashboard setelah login

**Halaman Dashboard:**
- [ ] Statistik: total users, controllers, doors, online/offline count
- [ ] 🔴 Live Transaction Feed via WebSocket (`/ws/live-feed`)
- [ ] Status controller cards (online/offline berdasarkan heartbeat)

**Halaman User Management:**
- [ ] Tabel daftar semua user (pagination, search, filter by department)
- [ ] Tombol [+ Tambah User] → form modal
- [ ] Tombol [📤 CSV] → file upload + tampilkan hasil validasi
- [ ] Kolom aksi: lihat detail (👁️), hapus (🗑️)
- [ ] Klik user → navigasi ke User Detail

**Halaman User Detail:**
- [ ] Info user: kartu, nama, department
- [ ] Toggle sumber akses: [Ikut Department] / [Custom]
- [ ] Tampilkan checkbox pintu per controller
  - [ ] Mode department → checkbox disabled, centang otomatis
  - [ ] Mode custom → checkbox aktif, admin bisa centang/uncentang
- [ ] Tab log aktivitas user
- [ ] Tombol [💾 Simpan & Sync ke Controller]

**Halaman Department Management:**
- [ ] Tabel daftar department
- [ ] CRUD department
- [ ] Set default akses pintu per department (checkbox per controller/door)
- [ ] Tombol [🔄 Sync Semua User di Dept ke Controller]

**Halaman Controller Management:**
- [ ] Tabel daftar controller + status online/offline (badge)
- [ ] Lihat config (heartbeat, WiFi SSID, IP, dll)
- [ ] Edit & push config ke controller
- [ ] Tombol [🔄 Full Sync] per controller
- [ ] Penamaan pintu (terhubung ke Door Management)

**Halaman Door Management:**
- [ ] Tabel daftar pintu
- [ ] Assign pintu ke controller
- [ ] Beri nama dan lokasi

**Halaman Access Logs:**
- [ ] Tabel log (nama dari snapshot, bukan dari JOIN!)
- [ ] Filter: by tanggal, kartu, controller, door, result (GRANTED/DENIED)
- [ ] Badge `REPLAYED` untuk log dari buffer offline
- [ ] Export CSV

### Deliverable
✅ Web app React bisa diakses di browser
✅ Admin bisa login, manage user/dept/controller, lihat log
✅ Live feed real-time berjalan via WebSocket
✅ Semua operasi CRUD trigger sync ke controller via backend

---

## Sprint 6 — Integrasi & Rilis

**Branch:** `dev` (merge semua feature branch)
**Estimasi:** ~2 hari

### Checklist

- [ ] Merge semua feature branch ke `dev`
- [ ] Test end-to-end: Frontend → Backend → MQTT → ESP32 → tap kartu → log muncul di dashboard
- [ ] Test sync atomik: upload CSV 50 user → semua masuk ke controller
- [ ] Test offline scenario: cabut WiFi ESP32 → tap beberapa kartu → sambungkan lagi → log REPLAYED muncul
- [ ] Test config rollback: push WiFi SSID salah → ESP32 rollback otomatis
- [ ] Fix bug yang ditemukan
- [ ] Update `CHANGELOG.md` untuk v0.2.0
- [ ] Update `README.md` (status: semua ✅)
- [ ] Merge `dev` → `main`
- [ ] Tag release: `git tag -a v0.2.0 -m "Release v0.2.0"`
- [ ] Push: `git push origin main && git push origin v0.2.0`

### Deliverable
✅ **v0.2.0 Released** — sistem access control multi-controller lengkap

---

## Pembagian Kerja

| Sprint | @danskiv | @rizzalaulia |
|--------|----------|--------------|
| 1. Database + EMQX | ✅ Lead | Review |
| 2. Backend Core API | Review | ✅ Lead |
| 3. Backend MQTT + Sync | Review | ✅ Lead |
| 4. Firmware v0.2 | ✅ Lead | Review |
| 5. Frontend React | ✅ Berdua | ✅ Berdua |
| 6. Integrasi & Rilis | ✅ Berdua | ✅ Berdua |

---

## Branch Map (Referensi)

```
main ─────────────────────────────────────────────────────────► v0.2.0
  │
  └── dev
        ├── feature/database-setup ──────── Sprint 1 ──► merge ke dev
        ├── feature/backend-core ────────── Sprint 2 ──► merge ke dev
        ├── feature/backend-mqtt ────────── Sprint 3 ──► merge ke dev
        ├── feature/firmware-v0.2 ───────── Sprint 4 ──► merge ke dev
        ├── feature/frontend-app ────────── Sprint 5 ──► merge ke dev
        └── (integration testing) ───────── Sprint 6 ──► merge ke main + tag v0.2.0
```
