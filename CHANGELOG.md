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

### Backend MQTT + Sync Protocol — Sprint 3 (`feature/backend-mqtt`)

Integrasi MQTT penuh sesuai [ROADMAP_v0.2.md](docs/ROADMAP_v0.2.md) Sprint 3: koneksi broker, subscribe log/status/sync-result, publish perubahan user & config, protokol sync atomik, WebSocket live feed, dan penanganan log `REPLAYED` dari buffer offline controller.

### Added
- `backend/app/mqtt/client.py` — koneksi paho-mqtt (`CallbackAPIVersion.VERSION2`) ke EMQX, `connect_async` + `loop_start()` non-blocking di thread background, auto-reconnect (`reconnect_delay_set`), status hidup lewat `is_connected()`. **Pakai `paho-mqtt`, bukan `aiomqtt`** — app ini sync (PyMySQL), paho jalan di thread sendiri, bukan asyncio
- `GET /health` menyertakan `mqtt_connected`
- `backend/app/mqtt/subscriber.py` — subscribe QoS 1 ke `access/+/logs`, `access/+/status`, `access/+/status/lwt`, `access/+/sync/result`, `access/+/config/response`; routing `on_message` ke handler berdasar `device_id` yang diparse dari topic, exception per-pesan ditangkap (tidak pernah menjatuhkan thread paho)
- `backend/app/mqtt/handlers.py`:
  - `handle_log` — simpan ke `access_logs` dengan `normalize_kartu()`, translasi `door_number → door_id` per controller, snapshot `user_nama`/`door_nama`, kartu tak dikenal tetap disimpan (`user_id=NULL`). Mendukung payload 4 field (kontrak firmware saat ini) maupun 5 field (kontrak target + `reason`)
  - Deteksi flag `REPLAYED` (field terakhir payload) untuk log dari buffer offline controller — `is_replayed=TRUE` disimpan apa pun kejadiannya. `server_ts` direkonstruksi dari `boot_estimate` device (diisi `handle_status` dari `uptime_ms` heartbeat) + `uptime_ms` log, supaya ratusan log dari beberapa jam offline **tidak** menumpuk di satu detik yang sama; fallback ke `NOW()` kalau device belum pernah kirim status sejak backend hidup (keterbatasan diketahui, firmware belum sinkron kirim status pas reconnect sebelum replay)
  - `handle_status` — update `controllers.last_seen`
  - `handle_sync_result` — jembatani hasil sync ke `sync_service`
  - `handle_config_response` — parse pasangan `key,value,...` dan log (belum ada konsumen frontend)
- `backend/app/mqtt/publisher.py` — `push_user()`/`push_delete()`: publish perubahan akses user ke **semua** controller (bukan cuma hasil `resolve_user_access`, supaya controller yang aksesnya baru dicabut tetap menerima `users/delete`, bukan dibiarkan nyangkut). `door_id` dan `nama` tidak pernah keluar ke payload MQTT. Broker offline → log warning, route REST tetap balas sukses untuk operasi DB-nya
- `backend/app/services/sync_service.py` — `POST /api/controllers/{id}/sync` (bukan lagi `501`): full sync atomik (`sync/start` → `users/set` × N → `sync/end` dengan count → tunggu `sync/result`), retry otomatis kalau `MISMATCH`/`TIMEOUT`. Menjembatani `sync/result` (thread paho) ke request FastAPI yang menunggu (thread berbeda) lewat `threading.Event` per `sync_id`
- `PUT /api/controllers/{id}/config` — publish ke `access/{device_id}/config/set` untuk config aman (`heartbeat_s`, `total_doors`) saja; `wifi_*`/`mqtt_*` sengaja **tidak** di-push otomatis (butuh rollback firmware yang belum ada), tetap tersimpan di DB dan diterapkan manual lewat web server lokal controller
- `backend/app/ws/manager.py` + `WS /ws/live-feed` — siarkan log akses real-time ke frontend begitu tersimpan ke DB, menjembatani thread paho ke event loop asyncio lewat `asyncio.run_coroutine_threadsafe`; koneksi mati dibersihkan otomatis
- `backend/app/ws/auth.py` + `AUTH_ENABLED` (config.py, default `False`) — struktur validasi token WS (`?token=`) sudah ada meski belum diaktifkan, supaya tinggal diaktifkan tanpa ubah endpoint

### Known Limitations
- Rekonstruksi `server_ts` untuk log `REPLAYED` bergantung pada backend sudah pernah menerima minimal 1 `status` dari device sejak backend hidup; kalau belum, fallback ke `NOW()` (lebih baik daripada menolak log, tapi timestamp jadi kurang akurat untuk kasus ini)
- `POST /api/controllers/{id}/config/request` (trigger `config/response`) tidak dibuat — item opsional di roadmap, tidak ada di kriteria selesai manapun
- Belum diverifikasi end-to-end terhadap broker EMQX + MySQL + firmware/simulator sungguhan (diverifikasi lewat test lokal: SQLite, `TestClient` WebSocket asli, thread terpisah sungguhan untuk jalur cross-thread) — perlu dijalankan ulang begitu ada akses Docker/EMQX/MySQL asli

---

### Firmware v0.2 (ESP32 Update) — Sprint 4 (`feature/firmware-adjustment`)

Implementasi penyesuaian firmware ESP32 (simulasi) dan perbaikan protokol sinkronisasi backend sesuai [ROADMAP_v0.2.md](docs/ROADMAP_v0.2.md) Sprint 4.

### Added
- `OfflineLogBuffer`: Kapasitas buffer log dinaikkan secara drastis dari 500 menjadi 5.000 entri untuk mengakomodasi beban lalu lintas pintu yang lebih tinggi tanpa risiko hilangnya data saat MQTT offline.
- `MqttManager`: Modifikasi payload log akses untuk menyertakan elemen `reason` (contoh: `NO_ACCESS`, `UNKNOWN_CARD`) agar selaras dengan skema baru dari backend MQTT handler.
- GUI Stress Test Tool (`tools/stress_test_gui.py`): Alat uji beban berbasis antarmuka untuk menyimulasikan injeksi 5.000 user berelasi kompleks secara bersamaan, lengkap dengan pengujian 2.000 tap kartu MQTT secara acak untuk membuktikan tidak ada lagi race condition / *log NULL*.
- Ekstra Pengaman Konfigurasi: Model Pydantic ditambahkan `extra="ignore"` dan konfigurasi kredensial MySQL URL diubah ke format URL-encoded (`%40`) untuk mencegah *crash*.
- Normalisasi Identitas Kartu (`backend/app/utils/kartu.py`): Fungsi `normalize_kartu` sekarang menangani kapitalisasi secara konsisten (`.upper()`), menambal *Bug P0* yang dapat menyebabkan *database crash* saat mengurai huruf non-kapital dari CSV.

### Fixed
- Penyesuaian `database/seed.sql` agar data kartu Jane Smith lebih realistis dengan panjang standar (10 digit: `0011223344`).
- Penghapusan file kerangka frontend (`frontend/`) dan catatan `docs/pr_review_feedback.md` yang sebelumnya terselip secara tidak sengaja di PR ini.

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
