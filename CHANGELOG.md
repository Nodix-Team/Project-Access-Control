# Changelog — ESP32 Access Control System

Semua perubahan signifikan pada project ini didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Backend Core API — Sprint 2 (`feature/backend-core`)

Implementasi REST API v0.2 (FastAPI) sesuai [ROADMAP_v0.2.md](docs/ROADMAP_v0.2.md) Sprint 2. Belum termasuk MQTT client/publisher/subscriber dan protokol sync atomik — ditunda ke Sprint 3, ditandai TODO eksplisit di kode.

### Added
- Struktur project FastAPI (`backend/app/`): `config.py` (pydantic-settings), `database.py` (SQLAlchemy engine/session), `main.py`
- Model SQLAlchemy untuk 8 tabel, 1:1 dengan `database/schema.sql` (kolom, tipe, nullable, default, UNIQUE, FK + `ON DELETE CASCADE`/`SET NULL`), termasuk `relationship()` dua arah yang relevan
- Autentikasi JWT: `POST /api/auth/login`, `GET /api/auth/me`, dependency `get_current_admin` yang memproteksi semua route lain
- `resolve_user_access()` — resolusi hak akses user (`user_access` jika custom, `department_access` jika tidak) dengan translasi `door_id → door_number` lokal per controller (aturan kritis penomoran pintu, lihat `architecture_proposal_v0.2.md`)
- CRUD `GET/POST/PUT/DELETE /api/users` — pagination, search, filter `department_id`; tiap response menyertakan hasil `resolve_user_access`
- `POST /api/users/upload-csv` — upload massal via CSV (`kartu,nama,department,doors`), validasi bertingkat: header salah / nama mengandung koma → tolak seluruh file; kartu/nama kosong, nama pintu atau department tak ditemukan, kartu duplikat → tolak baris itu saja, baris valid tetap diproses
- CRUD `GET/POST/PUT/DELETE /api/departments` — `PUT` sekaligus replace penuh `department_access` dari daftar `door_id`
- `GET /api/controllers` dengan `is_online` dihitung saat query (`last_seen` vs `heartbeat_s * 3`), **bukan** disimpan sebagai kolom
- `GET/PUT /api/controllers/{id}/config` — update config ditulis ke DB; publish MQTT ke controller fisik ditunda ke Sprint 3
- `POST /api/controllers/{id}/sync` — stub `501 Not Implemented`, sync atomik penuh: Sprint 3
- CRUD `GET/POST/PUT/DELETE /api/doors` — validasi `UNIQUE(controller_id, door_number)` per controller
- `GET /api/logs` — baca `access_logs` dari kolom snapshot (`user_nama`, `door_nama`), tanpa JOIN ke `users`/`doors`; filter `kartu`, `controller_id`, `door_id`, `result`, `date_from`, `date_to`, `is_replayed`, pagination, urut `server_ts DESC`
- Unit test di `backend/tests/`: `test_models.py`, `test_user_service.py`, `test_csv_service.py` — semua terhubung ke database nyata, bukan mock
- `backend/README.md` — panduan setup, `.env`, menjalankan test, daftar endpoint lengkap
- `tools/sample_users.csv` — contoh file untuk upload CSV

### Fixed
- Hash bcrypt admin di `database/seed.sql` rusak (59 karakter, seharusnya 60) sehingga password `admin123` tidak pernah bisa diverifikasi — ditemukan saat testing login end-to-end, sudah diperbaiki di seed data dan skema hash yang valid

---

## [v0.1.0] - 2026-07-13

### Prototype v0.1 — Serial Simulation + MQTT User Management

**Scope**: Prototype awal tanpa hardware fisik. Semua simulasi dilakukan via Serial Monitor.

### Added
- Struktur project PlatformIO untuk ESP32
- **LittleFS persistent storage**:
  - `config.json` — konfigurasi sistem (WiFi, MQTT, nama pintu)
  - `users.json` — database user (persisten, tidak hilang saat restart)
- **ConfigManager** — load/save konfigurasi dari/ke LittleFS
- **UserStorage** — CRUD user dengan auto-increment uid, persisten di Flash
- **AccessControl** — logika pengecekan akses user ke pintu tertentu
- **MqttManager** — koneksi EMQX local, subscribe & publish:
  - Subscribe: `access/users/add`, `access/users/delete`, `access/users/update`, `access/users/sync`
  - Publish: `access/logs`, `access/status`
- **SerialSim** — simulasi 4 reader & 4 doorlock via Serial Monitor:
  - Input UID kartu → pilih pintu (1-4) → hasil akses
  - Command `LIST` untuk melihat semua user
  - Command `STATUS` untuk info device
- Auto-reconnect WiFi dan MQTT
- Heartbeat status ke MQTT setiap 30 detik
- Log transaksi (GRANTED/DENIED) dikirim ke laptop via MQTT

### Architecture
```
Laptop (EMQX MQTT) ←→ ESP32 (WiFi)
                         ├── LittleFS: config.json, users.json
                         └── Serial Monitor: simulasi scan & doorlock
```

### Known Limitations (v0.1)
- Tidak ada hardware RFID reader (simulasi Serial)
- Tidak ada hardware doorlock (output Serial only)
- Config WiFi/MQTT hardcoded di source code
- Tidak ada autentikasi MQTT
- Timestamp log menggunakan `millis()` (bukan RTC/NTP)

---

## [Planned] v0.2.0

- Integrasi hardware RFID RC522 / MFRC522
- Integrasi relay untuk doorlock fisik
- NTP time sync untuk timestamp akurat
- MQTT autentikasi (username/password)
