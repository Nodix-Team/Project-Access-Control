# ⚡ PROJECT ARCHITECTURE INDEX & KNOWLEDGE BASE
> **Dokumen Acuan Ringkas (Token-Efficient Reference)**
> *Dokumen ini dibuat sebagai peta arsitektur utama untuk menghemat penggunaan token AI.*

---

## 1. 🏗️ Ringkasan Arsitektur Sistem

```
┌─────────────────┐        MQTT (CSV, QoS 1)        ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│ ESP32 Controller│◄───────────────────────────────►│  EMQX Broker │◄───►│   Backend    │◄───►│ Database│
│ (RFID + Relay)  │  (Port 1883 / 8081 WebConfig)   │ (Port 1883)  │     │  (FastAPI)   │     │ (MySQL) │
└─────────────────┘                                 └──────────────┘     └──────┬───────┘     └─────────┘
                                                                                │ REST + WS (Port 8000)
                                                                                ▼
                                                                         ┌──────────────┐
                                                                         │   Frontend   │
                                                                         │ (React+Vite) │
                                                                         └──────────────┘
```

---

## 2. 🔌 Port & Default Konfigurasi

| Komponen | Service / Port | Default Credential / Note |
|---|---|---|
| **ESP32 Web Config** | `HTTP Port 8081` | Basic Auth: `admin` / `p@ssw0rd` |
| **ESP32 Serial** | `115200 Baud` | Target USB: `COM13` (perintah: `LIST`, `STATUS`, `RESTART`) |
| **EMQX Broker** | `MQTT Port 1883` | Default User: `backend` / `p@ssw0rd` |
| **Backend FastAPI** | `REST & WS Port 8000` | Swagger: `http://localhost:8000/docs` |
| **Frontend React** | `Port 5173` (Vite) | Web App SPA |

---

## 3. 📡 Kontrak Topik & Payload MQTT (CSV Format, QoS 1)

*`{device_id}` default: `esp32-ac-001`*

1. **Log Akses & Kejadian Pintu**: `access/{device_id}/logs`
   * Format: `<card_id>,<door_number>,<GRANTED|DENIED|ALARM>,<reason>,<timestamp_epoch>[,REPLAYED]`
   * *Catatan: `<card_id>` dikosongkan jika dipicu tombol REX atau alarm door sensor.*

2. **Upsert Hak Akses User**: `access/{device_id}/users/set`
   * Format: `<card_id>,<door1|door2|door3>` (contoh: `0000123456,1|2|3`)

3. **Hapus User**: `access/{device_id}/users/delete`
   * Format: `<card_id>`

4. **Protokol Sinkronisasi Atomik**:
   * Start: `access/{device_id}/users/sync/start` → `<session_id>`
   * Item Data: `access/{device_id}/users/set` → `<card_id>,<doors>`
   * End: `access/{device_id}/users/sync/end` → `<session_id>,<expected_count>`
   * Respon ESP32: `access/{device_id}/sync/result` → `<session_id>,<OK|MISMATCH>,<count>`

5. **Heartbeat ESP32**: `access/{device_id}/heartbeat`
   * Format: `<uptime_s>,<rssi>,<free_heap>,<total_users>`

6. **Config via MQTT**:
   * Set: `access/{device_id}/config/set` → `key,value`
   * Request: `access/{device_id}/config/request`
   * Response: `access/{device_id}/config/response`
   * Bulk Sync: `access/{device_id}/config/sync` → `key1:value1|key2:value2|...` (Untuk force sync konfigurasi per pintu `dX_` dan network saat online).

---

## 4. 🗄️ Skema Database & Entitas Utama (8 Tabel)

* **`admins`**: Pengelola web dashboard (username, hashed password, role).
* **`users`**: Data pemegang kartu (name, card_id 10-digit, department_id, status).
* **`departments`**: Departemen/Kelompok user.
* **`controllers`**: Unit ESP32 (device_id, ip_address, status, last_heartbeat).
* **`doors`**: Pintu fisik (door_number 1-4, controller_id, location).
* **`user_access`**: Pemetaan `user_id` ↔ `door_id` (akses individual).
* **`department_access`**: Pemetaan `department_id` ↔ `door_id` (akses kelompok).
* **`access_logs`**: Catatan riwayat tap kartu (card_id, door_id, status, is_replayed, timestamp).

---

## 5. 📂 Peta Struktur File Utama

```
Project-Access_control/
├── firmware/
│   ├── platformio.ini              ← Dependency & env PlatformIO
│   └── src/
│       ├── main.cpp                ← Entry point ESP32, loop, serial commands
│       ├── storage/
│       │   └── OfflineLogBuffer.cpp← Ring Buffer FIFO 500 log offline
│       └── web/
│           └── WebConfigServer.cpp ← Local Admin Web Config (Port 8081)
├── backend/
│   ├── app/
│   │   ├── main.py                 ← FastAPI app initialization & CORS
│   │   ├── auth/                   ← JWT authentication & dependencies
│   │   ├── mqtt/                   ← Subscriber/Publisher EMQX broker
│   │   ├── routes/                 ← REST API (users, doors, controllers, logs)
│   │   ├── services/               ← Business logic & atomic sync
│   │   └── ws/                     ← WebSocket manager & live feeds
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 ← Layout & Router
│   │   ├── api/                    ← Axios API Clients
│   │   ├── pages/                  ← Page Views (Dashboard, Users, Doors, Logs, Controllers)
│   │   └── ws/liveFeed.ts          ← Real-time WebSocket listener
│   └── package.json
└── docs/                           ← Archive & Detailed Specifications
    ├── ARCHITECTURE-PROPOSAL-V0.3.md ← Spesifikasi proposal arsitektur v0.3
    ├── PROPOSAL-RANCANGAN-HARDWARE-V0.3.md ← Proposal rancangan hardware v0.3
    ├── ROADMAP_v0.3.md             ← Draft proposal roadmap v0.3
    └── PROJECT_ARCHITECTURE_INDEX.md← Dokumen acuan ringkas arsitektur ini
```

---

## 🌿 6. Aturan Git & Workflow Tim

* **Protected Branch**: `main` (hanya terima merge dari `dev`).
* **Integration Branch**: `dev`.
* **Feature Branch Format**: `feature/nama-fitur` atau `fix/nama-bug`.
* **Commit Message Format**: `<type>: <description>`
  * Type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
* **Remote Git Operations**: Wajib menggunakan **GitHub CLI (`gh`)** untuk operasi push/pull/sync atau REST API bypass jika `git push` mengalami kendala otentikasi/cache proxy.


---

## 📜 7. Log Kemajuan & Catatan Aktivitas (Session History)

* **2026-07-21**:
  - **Synchronization**: Melakukan `git pull origin main` (fast-forward 87 commit) dari repositori GitHub.
  - **Verification**: Memeriksa dan memastikan keselarasan aturan pada `CONTRIBUTING.md` dan `docs/testing_guide.md`.
  - **Token Efficiency Setup**: Membuat file indeks arsitektur [`docs/PROJECT_ARCHITECTURE_INDEX.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/PROJECT_ARCHITECTURE_INDEX.md).
  - **Hardware Verification**: ESP32 terdeteksi di `COM13` (CH9102, MAC: `ec:64:c9:87:1c:74`).
  - **Firmware Flashing**: Berhasil kompilasi & flash Firmware v0.2.0 ke ESP32 pada `COM13` (Success 100%).
  - **Comprehensive Hardware Testing**:
    - Booting & LittleFS File System OK (1408 KB total, 16 KB used).
    - WiFi Connection OK: Terhubung ke SSID `REDMI` dengan IP `10.48.73.48`.
    - Web Config Local Server OK (Port 8081 pada `http://10.48.73.48:8081`, Basic Auth `admin`/`p@ssw0rd`).
    - Serial CLI `STATUS` & `LIST` OK (Free Heap: ~246 KB).
    - 10-Digit Card Padding OK (`123456` -> `0000123456`).
    - Access Logic & Relay DENIED test OK (Pintu 1 - Lobby Utama).
    - Offline Log Ring Buffer FIFO OK (Saved 1 log to LittleFS `/logs/offline_buffer.csv`).
  - **Backend & Database Infrastructure Verification**:
    - Confirmed local MySQL active on `127.0.0.1:3306` with database `access_control` (8 tables ready).
    - Confirmed local MQTT Broker active on `127.0.0.1:1883`.
    - Updated `backend/.env` to point to local services (`127.0.0.1`).
    - Successfully launched FastAPI Backend on `http://localhost:8000` (Swagger UI live at `http://localhost:8000/docs`).
  - **ESP32 Live Hardware Integration (OPSI B) — SUCCESS**:
    - Identifikasi IP PC di jaringan WiFi `REDMI`: `10.48.73.153`.
    - Mengonfigurasi `MQTT_BROKER` di firmware ESP32 ke `10.48.73.153`.
    - ESP32 terhubung 100% ke Broker MQTT di PC (`10.48.73.153:1883`).
    - **Offline Log Auto-Replay Verification**: ESP32 mendeteksi koneksi online dan langsung otomatis mereplay 1 log offline tersimpan (`0000123456,1,DENIED`) ke Backend.
    - **Real-Time Stream Verification**: Tap kartu baru langsung terkirim secara real-time ke Backend tanpa buffer (`[MQTT] Log berhasil dikirim ke backend!`).
  - **Official v0.2.0 Closure & Roadmap v0.3 Sync (Team Update from @rizzalaulia)**:
    - Merged `dev` -> `main` & tagged `v0.2.0` release officially.
    - Published [`docs/V0.2_CLOSURE_REPORT.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/V0.2_CLOSURE_REPORT.md) & [`docs/ROADMAP_v0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/ROADMAP_v0.3.md) (7 Sprints).
    - Added simulation scripts (`tools/simulate_random_taps.py`, `tools/simulate_serial_taps.py`).
  - **Proposal Rancangan Hardware & Git Workflow Transition**:
    - Mengganti nama rancangan hardware menjadi [`docs/PROPOSAL-RANCANGAN-HARDWARE-V0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/PROPOSAL-RANCANGAN-HARDWARE-V0.3.md) dan menerbitkannya di remote `dev` branch.
    - Melakukan transisi alur kerja remote menggunakan **GitHub CLI (`gh`)** via REST API untuk menghindari kendala cache proxy.
    - Menambahkan banner status **DRAFT / PROPOSAL** pada dokumen [`docs/ROADMAP_v0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/ROADMAP_v0.3.md) untuk menghindari kesalahpahaman tim.
    - Menyusun dan menerbitkan berkas [`docs/ARCHITECTURE-PROPOSAL-V0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/ARCHITECTURE-PROPOSAL-V0.3.md) yang memuat spesifikasi teknis lengkap migrasi sistem ke versi 0.3.
  - **Sprint 1: Backend Testing Infrastructure Setup (v0.3)**:
    - Membuat berkas [`backend/requirements-dev.txt`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/backend/requirements-dev.txt) dan menginstal pustaka `pytest`, `pytest-asyncio`, dan `httpx`.
    - Membuat berkas konfigurasi [`backend/pytest.ini`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/backend/pytest.ini) untuk mendeteksi rute testing otomatis.
    - Membuat berkas fixture [`backend/tests/conftest.py`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/backend/tests/conftest.py) untuk melakukan mocking database menggunakan file SQLite `test.db` lokal pada masa import-time dan menyuntikkan data seed uji coba.
    - Memverifikasi pengujian backend berhasil lulus 100% (20/20 test cases pass).
  - **Spesifikasi Hardware Grade-Industri (19 Poin Proteksi & Safety)**:
    - Menerbitkan dokumen evaluasi [`docs/HARDWARE-AUDIT-REVIEW-V0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/HARDWARE-AUDIT-REVIEW-V0.3.md) yang menyetujui (100% ACC) 19 poin masukan teknis dari Emping (Rizal).
    - Memperbarui [`docs/PROPOSAL-RANCANGAN-HARDWARE-V0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/PROPOSAL-RANCANGAN-HARDWARE-V0.3.md) dengan Hardware Fire Release Interlock (P-MOSFET Cut-off VCC Lock), Dioda Flyback Fast-Recovery 1N4007 + MOV 14D390K di terminal `L+`/`L-`, External Watchdog TPS3823-33 (`GPIO34`), Reverse Polarity P-MOSFET AO4407A, TVS SMBJ15CA + MOV 14D220K, Fuse Utama 5A, TVS + Resistor 220Ω per input, PTC 500mA per Reader VCC, dan EOL Resistor 2.2kΩ.
    - Mengintegrasikan ADC Sensing PLN/Aki (`GPIO1`/`GPIO2`), Smart SLA Charger CN3768, DC-DC Buck 3.3V MP2315, SMD Holder CR2032 RTC, Bob Smith RJ45, USBLC6-2SC6 USB ESD, Ferrite Bead, dan Pogo-Pin Test Point Pad 6-Pin di bottom PCB.
    - Menglarifikasi penyuplaian koil relay SRD-12VDC langsung dari Rel 12V DC via IC ULN2003ADR.
  - **Penyahan Kontrak Kode 3-Lapis v0.3 ([`docs/CONTRACT-CODES-V0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/CONTRACT-CODES-V0.3.md))**:
    - Menerbitkan dan menyetujui kontrak kode 3-lapis: Angka 1-byte di kabel MQTT, Kode Pendek Uppercase di Database, dan Teks Uppercase Keminggris di Frontend UI.
    - Mengubah kode REX menjadi **`VALID_EXIT`** (Angka `3`) dan **`VALID_EXIT_UNOPENED`** (Angka `4`).
    - Menegaskan pengiriman 2 field (`<status>` & `<reason>`) pada payload MQTT dan penanganan zona waktu dinamis mengikuti lokasi Server & Browser User.
    - Memperbarui [`docs/ARCHITECTURE-PROPOSAL-V0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/ARCHITECTURE-PROPOSAL-V0.3.md), `database/schema.sql`, dan `backend/app/mqtt/handlers.py` agar 100% selaras.
  - **Roadmap Prototyping Hardware Fisik v0.3 ([`docs/HARDWARE_PROTOTYPING_ROADMAP_v0.3.md`](file:///C:/Users/tech/Documents/GitHub/Project-Access_control/docs/HARDWARE_PROTOTYPING_ROADMAP_v0.3.md))**:
    - Menerbitkan panduan pengujian fisik 7 Fase di breadboard untuk board **ESP32-WROOM-32D (38-Pin)** (Silicon Rev 3).
    - Menambahkan **Hardware Abstraction Layer (HAL)** `pin_config.h` untuk migrasi seamless ke target produksi ESP32-S3 (§1.1).











