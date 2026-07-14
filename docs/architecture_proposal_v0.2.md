# 🏗️ Arsitektur Access Control System — Proposal v0.2 (Revisi 3)

> [!NOTE]
> Revisi ini memasukkan semua feedback dari [ARCHITECTURE_REVIEW.md](file:///c:/Users/tech/Documents/GitHub/Project-Access_control/ARCHITECTURE_REVIEW.md).
> Perubahan ditandai dengan label `[REV3]` agar mudah ditelusuri.

## Gambaran Umum (Multi-Controller)

```
┌──────────────┐
│ Controller A │──── Pintu 1–4 (Lobby, Server, Meeting, Arsip)      [REV3: penomoran lokal]
│ (ESP32)      │                          ┌──────────┐      ┌──────────────┐      ┌─────────┐
└──────┬───────┘                          │   EMQX   │      │              │      │         │
       │          MQTT (CSV, QoS 1)       │ (Broker) │◄────►│   Backend    │◄────►│  MySQL  │
┌──────┴───────┐◄────────────────────────►│  + Auth  │      │  (FastAPI)   │      │         │
│ Controller B │                          │          │      │  + NTP Srv   │      │         │
│ (ESP32)      │                          └──────────┘      └──────┬───────┘      └─────────┘
└──────┬───────┘                                                   │
       │──── Pintu 1–4 (Lobby B, Lab, ...)                  REST API + WebSocket
                                                             (JWT Auth)
┌──────────────┐                                            ┌──────┴───────┐
│ Controller C │──── Pintu 1–2 (Gudang, Loading)            │   Frontend   │
│ (ESP32)      │                                            │ (React+Vite) │
└──────────────┘                                            └──────────────┘
```

> [!IMPORTANT]
> **Perubahan utama dari versi sebelumnya:**
> 1. ESP32 disebut **"Controller"**, setiap controller punya **penomoran pintu lokal** (1–N)
> 2. **Nama user TIDAK dikirim ke Controller** — hanya `kartu` + `doors`
> 3. **Config bisa di-push** dari web app dan **dari web server lokal Controller sendiri**
> 4. **MQTT diamankan** dengan username/password per controller `[REV3]`
> 5. **Protokol sync atomik** dengan verifikasi count dan staging di RAM `[REV3]`
> 6. **Backend menentukan timestamp**, bukan Controller `[REV3]`
> 7. **Topic `users/add` diubah menjadi `users/set`** (semantik upsert) `[REV3]`

---

## 1. Controller (ESP32 — Firmware C++)

### Apa yang Disimpan di Controller?

Controller hanya menyimpan data **seminimal mungkin** untuk membuat keputusan akses:

| Data | Contoh | Keterangan |
|------|--------|------------|
| Nomor kartu | `AABBCCDD` | Untuk mencocokkan saat tap |
| Daftar pintu | `1\|3` | **Nomor pintu lokal** (1–N, bukan door_id database) |

**Nama user TIDAK disimpan di Controller.** Nama hanya ada di database MySQL.

### `[REV3]` Aturan Kritis: Penomoran Pintu

> [!CAUTION]
> **`door_id` (ID database) TIDAK PERNAH keluar dari Backend.** Controller hanya bicara `door_number` (nomor lokal 1–N).
>
> Contoh: "Lab Komputer" = `door_id 6` di database, tapi di Controller B ia adalah **pintu nomor 2**. Yang dikirim ke Controller B adalah `2`, bukan `6`.
>
> Backend **wajib** menerjemahkan `door_id` → `door_number` sebelum publish ke MQTT:
> ```sql
> SELECT c.device_id, d.door_number
> FROM user_access ua
> JOIN doors d       ON d.id = ua.door_id
> JOIN controllers c ON c.id = d.controller_id
> WHERE ua.user_id = :uid;
> ```

### Format Data yang Dikirim ke Controller (CSV)

```
AABBCCDD,1|3             (12 byte — nomor pintu LOKAL)
```

### `[REV3]` Controller Web Server (Config Lokal)

Setiap Controller menjalankan **web server sederhana** yang bisa diakses langsung via browser:

```
http://192.168.1.88:8081
```

| Fitur Web Server Lokal | Keterangan |
|------------------------|------------|
| Set IP Address | Static atau DHCP |
| Set WiFi SSID & Password | Untuk koneksi ke jaringan |
| Set MQTT Broker | IP address dan port |
| Set Heartbeat Interval | Detik |
| Lihat status | Koneksi WiFi, MQTT, jumlah user, free heap |

> [!TIP]
> Web server lokal ini adalah **jaring pengaman** jika Controller kehilangan koneksi MQTT akibat config salah. Admin bisa langsung akses IP Controller via browser untuk memperbaiki config tanpa perlu flash ulang via USB.

### `[REV3]` Config Rollback (Pencegahan Bricking)

Saat Controller menerima perubahan config WiFi/MQTT (baik dari MQTT maupun web server lokal):

```
1. Simpan config LAMA sebagai config_last_known_good.json
2. Terapkan config baru, tandai "pending"
3. Reboot
4. Jika berhasil connect MQTT dalam 60 detik:
      → tandai config baru sebagai "confirmed"
   Jika GAGAL:
      → restore config_last_known_good.json, reboot lagi
```

| Config Aman (langsung terapkan) | Config Berbahaya (butuh rollback) |
|--------------------------------|-----------------------------------|
| `heartbeat_s` | `wifi_ssid`, `wifi_pass` |
| `total_doors` | `mqtt_broker`, `mqtt_port` |

### `[REV3]` Buffer Log Offline (Ring Buffer)

Saat koneksi MQTT terputus, Controller tetap bisa memutuskan akses (data user ada di LittleFS). Namun log transaksi tidak bisa dikirim ke server. Solusinya:

**Ring Buffer di LittleFS** — Controller menyimpan log transaksi secara lokal saat offline:

```
┌─────────────────────────────────────────────────────────┐
│ File: /logs/offline_buffer.csv (di LittleFS)            │
│                                                          │
│ Kapasitas: 500 entri (jika penuh, entri terlama ditimpa) │
│                                                          │
│ Format per baris:                                        │
│ {uptime_ms},{kartu},{door_number},{result}                │
│                                                          │
│ Contoh isi:                                              │
│ 123456,AABBCCDD,1,GRANTED                                │
│ 123890,DEADBEEF,2,DENIED                                 │
│ 124100,11223344,3,GRANTED                                │
│ ...                                                      │
└─────────────────────────────────────────────────────────┘
```

**Cara kerja:**
1. **Saat offline**: Setiap transaksi tap kartu disimpan ke file `offline_buffer.csv` sebagai baris baru.
2. **Saat reconnect**: Controller mendeteksi koneksi MQTT kembali, lalu mengirim semua log yang tersimpan satu per satu ke topic `access/{device_id}/logs` dengan flag khusus `REPLAYED`.
3. **Di Backend**: Backend menerima log tersebut dan menyimpannya ke MySQL dengan kolom `is_replayed = TRUE` agar bisa dibedakan dari log real-time.
4. **Setelah semua terkirim**: Controller mengosongkan file buffer.

**Mengapa "Ring Buffer" (bukan buffer biasa)?**
- LittleFS punya kapasitas terbatas (~1.5 MB di ESP32).
- Jika offline sangat lama dan buffer penuh (500 entri), **entri terlama ditimpa** oleh entri baru.
- Prinsipnya: log terbaru lebih penting daripada log lama.
- 500 entri ≈ ~25 KB, sangat aman untuk LittleFS.

---

## 2. EMQX Broker `[REV3]`

### Autentikasi MQTT (Username/Password)

> [!WARNING]
> Tanpa autentikasi, siapa pun yang bisa menjangkau broker dapat menambah user, membaca password WiFi, atau melumpuhkan controller. **Auth MQTT wajib di v0.2.**

Setiap Controller dan Backend memiliki **kredensial terpisah**:

| Client | Username | Password | Keterangan |
|--------|----------|----------|------------|
| Controller A | `ctrl-A` | `{random}` | Satu controller, satu kredensial |
| Controller B | `ctrl-B` | `{random}` | Berbeda per controller |
| Backend | `backend` | `{random}` | Hanya Backend yang boleh manage user |

**Pengembangan selanjutnya (bukan versi ini):**
- ACL per-topic (Controller hanya boleh subscribe topic miliknya sendiri)
- TLS (port 8883) untuk enkripsi trafik
- `wifi_pass` tidak pernah dikirim balik via `config/response`

---

## 3. Backend — FastAPI (Python)

### Mengapa FastAPI?

| Pertimbangan | Alasan |
|-------------|--------|
| **Sudah kenal Python** | Sudah punya `test_mqtt.py` di project |
| **Async native** | MQTT + API web bersamaan tanpa lag |
| **Auto-dokumentasi** | Swagger UI otomatis |
| **Ringan** | Tidak seberat Django, lebih terstruktur dari Flask |

### `[REV3]` Backend sebagai NTP Server Lokal

Backend juga berperan sebagai **NTP server lokal** untuk semua Controller di jaringan:
- Controller sinkronisasi waktu ke Backend (bukan ke internet)
- Berguna jika jaringan tidak ada akses internet

> [!NOTE]
> **Catatan (Known Issue):** Tanpa modul RTC, ESP32 akan kehilangan waktu setiap kali reboot jika WiFi belum connect. Ini dicatat sebagai issue dan akan diselesaikan di versi mendatang saat RTC module ditambahkan. Untuk versi ini, **Backend yang menentukan timestamp resmi**, bukan Controller.

### `[REV3]` Autentikasi REST API (JWT)

- **Login** dengan username/password → dapat JWT token
- **Role untuk versi ini:** `admin` saja (full access ke semua fitur)
- **Pengembangan mendatang:** role `viewer` (hanya lihat log), audit trail admin (siapa menambah/menghapus user siapa)

### MQTT Topics `[REV3]`

| Fungsi | Topic | Arah | Payload CSV | QoS |
|--------|-------|------|-------------|-----|
| **Set user (upsert)** | `access/{id}/users/set` | Server → Ctrl | `AABBCCDD,1\|3` | 1 |
| Hapus user | `access/{id}/users/delete` | Server → Ctrl | `AABBCCDD` | 1 |
| Mulai sync | `access/{id}/users/sync/start` | Server → Ctrl | `{sync_id}` | 1 |
| Selesai sync | `access/{id}/users/sync/end` | Server → Ctrl | `{sync_id},{count}` | 1 |
| Hasil sync | `access/{id}/sync/result` | Ctrl → Server | `{sync_id},OK,{count}` atau `{sync_id},MISMATCH,{n}` | 1 |
| Push config | `access/{id}/config/set` | Server → Ctrl | *(key,value)* | 1 |
| Baca config | `access/{id}/config/request` | Server → Ctrl | *(kosong)* | 1 |
| Response config | `access/{id}/config/response` | Ctrl → Server | *(CSV, tanpa wifi_pass)* | 1 |
| Log akses | `access/{id}/logs` | Ctrl → Server | `AABBCCDD,2,GRANTED,{uptime_ms}` | 1 |
| Log replayed | `access/{id}/logs` | Ctrl → Server | `AABBCCDD,2,GRANTED,{uptime_ms},REPLAYED` | 1 |
| Status/Heartbeat | `access/{id}/status` | Ctrl → Server | `{total_doors},{user_count},{free_heap},{uptime_ms}` | 0 |
| LWT (offline) | `access/{id}/status/lwt` | Broker → Server | `offline` (otomatis oleh EMQX) | 1 |

> [!IMPORTANT]
> **Perubahan penting dari versi sebelumnya:**
> - `users/add` → `users/set` **(upsert)**: kartu sudah ada? → replace akses. Belum ada? → buat baru. Tidak ada jendela waktu tanpa akses.
> - `users/delete` sekarang pakai **nomor kartu** (bukan uid). Idempoten (hapus yang tidak ada = sukses).
> - Semua topic `users/#` dan `config/#` wajib **QoS 1** (at least once delivery).
> - **Timestamp ditentukan oleh Backend** (`server_ts = NOW()` saat menerima log), bukan oleh Controller.
> - Controller mengirim `uptime_ms` untuk keperluan diagnosa, bukan sebagai waktu resmi.

### REST API Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                            │
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────────────────────┐  │
│  │  MQTT Client      │    │  REST API (JWT Protected)         │  │
│  │  (aiomqtt)        │    │                                   │  │
│  │                   │    │  --- Auth ---                     │  │
│  │  Subscribe:       │    │  POST   /api/auth/login           │  │
│  │  - access/+/logs  │    │                                   │  │
│  │  - access/+/status│    │  --- User Management ---          │  │
│  │  - access/+/config│    │  GET    /api/users                │  │
│  │    /response      │    │  POST   /api/users                │  │
│  │  - access/+/sync  │    │  PUT    /api/users/{uid}          │  │
│  │    /result        │    │  DELETE /api/users/{uid}          │  │
│  │                   │    │  POST   /api/users/upload-csv     │  │
│  │  Publish:         │    │                                   │  │
│  │  - access/{id}/*  │    │  --- Department ---               │  │
│  │                   │    │  GET    /api/departments          │  │
│  │                   │    │  POST   /api/departments          │  │
│  │                   │    │  PUT    /api/departments/{id}     │  │
│  │                   │    │  DELETE /api/departments/{id}     │  │
│  │                   │    │                                   │  │
│  │                   │    │  --- Controller ---               │  │
│  │                   │    │  GET    /api/controllers          │  │
│  │                   │    │  POST   /api/controllers/{id}/sync│  │
│  │                   │    │  GET    /api/controllers/{id}/config│
│  │                   │    │  PUT    /api/controllers/{id}/config│
│  │                   │    │                                   │  │
│  │                   │    │  --- Logs & Dashboard ---         │  │
│  │                   │    │  GET    /api/logs                 │  │
│  │                   │    │  WS     /ws/live-feed             │  │
│  └──────────────────┘    └───────────────────────────────────┘  │
│                                                                  │
│  NTP Server (untuk sinkronisasi waktu Controller)                │
└─────────────────────────────────────────────────────────────────┘
```

### `[REV3]` Protokol Sync Atomik

Saat Backend melakukan full sync ke Controller (misal setelah upload CSV):

```
Backend → access/{id}/users/sync/start     payload: "{sync_id}"
    │
    │  Controller: buat daftar BARU di RAM (JANGAN hapus yang lama)
    │
Backend → access/{id}/users/set            payload: "AABBCCDD,1|3"   (QoS 1, N kali)
Backend → access/{id}/users/set            payload: "11223344,2"     (QoS 1)
    │  ...
    │  Controller: tampung semua di daftar baru (RAM)
    │
Backend → access/{id}/users/sync/end       payload: "{sync_id},80"
    │
    │  Controller: bandingkan count
    │
    ├── Count cocok (80 = 80):
    │     → Tulis daftar baru ke LittleFS (ATOMIC SWAP)
    │     → Publish: access/{id}/sync/result  →  "{sync_id},OK,80"
    │
    └── Count TIDAK cocok (misal terima 77):
          → BUANG daftar baru, PERTAHANKAN yang lama
          → Publish: access/{id}/sync/result  →  "{sync_id},MISMATCH,77"
          → Backend terima MISMATCH → ulangi sync
```

> [!IMPORTANT]
> Dengan pola staging ini, **sync yang gagal TIDAK PERNAH meninggalkan pintu tanpa akses**. Controller tetap memakai daftar lama yang valid sampai sync berhasil 100%.

### Alur Kerja — Admin Menambah User via Web

```
Admin isi form: kartu=AABBCCDD, nama=John Doe, department=IT
        │
        ▼
Frontend kirim POST /api/users (JWT header)
        │
        ▼
Backend:
  ├── Simpan ke MySQL (uid=1, kartu=AABBCCDD, nama=John Doe, dept=IT)
  │
  ├── Resolve akses: IT dept → door_id [1,2,6] → terjemahkan:
  │     ctrl-A: door_number [1,2]
  │     ctrl-B: door_number [2]
  │
  ├── Publish MQTT ke ctrl-A:
  │   topic: access/ctrl-A/users/set     [REV3: set bukan add]
  │   payload: "AABBCCDD,1|2"            [REV3: door_number LOKAL, bukan door_id]
  │
  └── Publish MQTT ke ctrl-B:
      topic: access/ctrl-B/users/set
      payload: "AABBCCDD,2"              ← door_number 2 (BUKAN door_id 6)
```

### Alur Kerja — Push Config ke Controller

```
Admin ubah heartbeat Controller A dari 30 → 60 detik
        │
        ▼
Frontend kirim PUT /api/controllers/ctrl-A/config (JWT header)
        │
        ▼
Backend:
  ├── Update di MySQL
  └── Publish MQTT: access/ctrl-A/config/set → "heartbeat_s,60"
        │
        ▼
Controller A:
  ├── Config aman → langsung terapkan
  └── Config berbahaya (wifi/mqtt) → simpan last_known_good → terapkan → reboot → rollback jika gagal
```

---

## 4. Database — MySQL (7 Tabel + 1 Tabel Auth) `[REV3]`

### Desain Tabel (Schema) — 8 Tabel

```sql
-- ═══════════════════════════════════════════
-- AUTH [REV3]
-- ═══════════════════════════════════════════

-- Tabel Admin (Login JWT)
CREATE TABLE admins (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,           -- bcrypt hash
    role        ENUM('admin') DEFAULT 'admin',   -- versi ini: admin saja
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════
-- HARDWARE
-- ═══════════════════════════════════════════

-- Tabel Controller (setiap ESP32 yang terpasang)
CREATE TABLE controllers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    device_id   VARCHAR(50) NOT NULL UNIQUE,   -- "ctrl-A", "ctrl-B"
    nama        VARCHAR(100),                   -- "Controller Gedung A"
    lokasi      VARCHAR(100),                   -- "Gedung A Lantai 1"
    wifi_ssid   VARCHAR(50),
    mqtt_broker VARCHAR(50),
    mqtt_port   INT DEFAULT 1883,
    mqtt_user   VARCHAR(50),                    -- [REV3] username MQTT
    total_doors INT DEFAULT 4,
    heartbeat_s INT DEFAULT 30,
    ip_mode     ENUM('dhcp','static') DEFAULT 'dhcp',  -- [REV3]
    ip_address  VARCHAR(15),                    -- [REV3] jika static
    web_port    INT DEFAULT 8081,               -- [REV3] port web server lokal
    last_seen   DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Pintu (setiap pintu fisik)
CREATE TABLE doors (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    controller_id   INT NOT NULL,
    door_number     INT NOT NULL,               -- nomor pintu LOKAL di controller (1-4)
    nama            VARCHAR(100),               -- "Ruang Server", "Lobby" [REV3: penamaan di config]
    lokasi          VARCHAR(100),
    FOREIGN KEY (controller_id) REFERENCES controllers(id),
    UNIQUE KEY (controller_id, door_number)
);

-- ═══════════════════════════════════════════
-- ORGANISASI
-- ═══════════════════════════════════════════

-- Tabel Department
CREATE TABLE departments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nama        VARCHAR(100) NOT NULL UNIQUE,   -- "IT", "HRD", "Security"
    deskripsi   VARCHAR(255),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Default Akses Department
CREATE TABLE department_access (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    department_id   INT NOT NULL,
    door_id         INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE CASCADE,
    UNIQUE KEY (department_id, door_id)
);

-- ═══════════════════════════════════════════
-- USER & AKSES
-- ═══════════════════════════════════════════

-- Tabel User (Data pemilik kartu)
CREATE TABLE users (
    uid             INT AUTO_INCREMENT PRIMARY KEY,
    kartu           VARCHAR(20) NOT NULL UNIQUE,    -- collation: case-insensitive [REV3]
    nama            VARCHAR(100) NOT NULL,
    department_id   INT DEFAULT NULL,
    is_custom_access BOOLEAN DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Tabel Custom Akses User (override dari akses department)
CREATE TABLE user_access (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    door_id     INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE CASCADE,
    UNIQUE KEY (user_id, door_id)
);

-- ═══════════════════════════════════════════
-- LOG [REV3: dengan snapshot nama]
-- ═══════════════════════════════════════════

-- Tabel Log Akses (Riwayat tap kartu — IMMUTABLE)
CREATE TABLE access_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,    -- [REV3] BIGINT bukan INT
    kartu           VARCHAR(20) NOT NULL,
    user_id         INT NULL,                             -- FK, NULL jika kartu tak dikenal
    user_nama       VARCHAR(100) NULL,                    -- [REV3] SNAPSHOT saat kejadian
    door_id         INT NULL,
    door_nama       VARCHAR(100) NULL,                    -- [REV3] SNAPSHOT saat kejadian
    controller_id   INT NULL,
    result          ENUM('GRANTED', 'DENIED') NOT NULL,
    reason          VARCHAR(50) NULL,                     -- [REV3] 'UNKNOWN_CARD', 'NO_ACCESS', 'OK'
    server_ts       DATETIME(3) NOT NULL,                 -- [REV3] otoritatif (UTC), dari Backend
    device_uptime_ms BIGINT NULL,                         -- [REV3] untuk diagnosa
    is_replayed     BOOLEAN DEFAULT FALSE,                -- [REV3] TRUE jika dari buffer offline
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE SET NULL,
    INDEX idx_ts (server_ts),                             -- [REV3]
    INDEX idx_kartu_ts (kartu, server_ts),                -- [REV3]
    INDEX idx_ctrl_ts (controller_id, server_ts)          -- [REV3]
);
```

### `[REV3]` Mengapa Log Menyimpan Snapshot Nama?

Jika kartu `AABBCCDD` milik John dipakai 6 bulan, lalu John resign dan kartunya di-assign ulang ke Sarah — tanpa snapshot, **seluruh riwayat John berubah menjadi Sarah**. Itu kegagalan audit yang serius.

Dengan menyimpan `user_nama` dan `door_nama` langsung di log, riwayat tidak pernah berubah meskipun data user atau pintu diubah kemudian.

### `[REV3]` is_online Dihitung, Bukan Disimpan

Kolom `is_online` **dihapus** dari tabel `controllers`. Statusnya dihitung saat query:

```sql
SELECT device_id,
       (last_seen > NOW() - INTERVAL (heartbeat_s * 3) SECOND) AS is_online
FROM controllers;
```

Ditambah mekanisme **MQTT Last Will & Testament (LWT)**:

```cpp
// Controller mendaftarkan LWT saat connect
mqttClient.connect(deviceId, user, pass,
                   "access/ctrl-A/status/lwt",  // will topic
                   1, true, "offline");         // QoS 1, retain
// Setelah connect sukses:
mqttClient.publish("access/ctrl-A/status/lwt", "online", true);
```

Broker otomatis mem-publish `offline` kalau Controller hilang — tanpa polling.

### Logika Penentuan Hak Akses User

```
User punya custom access (is_custom_access = TRUE)?
  │
  ├── YA  → Pakai data dari tabel user_access
  │
  └── TIDAK → User punya department?
                │
                ├── YA  → Pakai data dari tabel department_access
                │
                └── TIDAK → Tidak bisa akses pintu manapun
```

### Contoh Data

**Tabel `departments`:**

| id | nama | deskripsi |
|----|------|-----------|
| 1 | IT | Divisi Teknologi Informasi |
| 2 | HRD | Human Resource Development |
| 3 | Security | Tim Keamanan |

**Tabel `department_access` (default akses per department):**

| department_id | door_id | Artinya |
|---------------|---------|----------|
| 1 (IT) | 1 | IT → Lobby Utama (ctrl-A pintu 1) |
| 1 (IT) | 2 | IT → Ruang Server (ctrl-A pintu 2) |
| 1 (IT) | 6 | IT → Lab Komputer (ctrl-B pintu 2) |

**Tabel `users`:**

| uid | kartu | nama | department_id | is_custom_access |
|-----|-------|------|---------------|------------------|
| 1 | AABBCCDD | John Doe | 1 (IT) | FALSE |
| 2 | 11223344 | Jane Smith | 1 (IT) | **TRUE** |

**Yang dikirim ke Controller (setelah Backend terjemahkan):**

| User | Sumber | ctrl-A menerima | ctrl-B menerima |
|------|--------|-----------------|-----------------|
| John (ikut dept IT) | department_access | `AABBCCDD,1\|2` | `AABBCCDD,2` |
| Jane (custom) | user_access | `11223344,1\|2\|3` | `11223344,2` |

---

## 5. Frontend — React + Vite

### Halaman Web App

| Halaman | Fitur |
|---------|-------|
| **Login** | Username + password → JWT token `[REV3]` |
| **Dashboard** | Ringkasan statistik, status controller, **🔴 live transaction feed** |
| **User Management** | Daftar semua user (tabel), tambah user, hapus user, upload CSV |
| **→ User Detail** | Klik user → info user, department, **tab User Access** |
| **Department Management** | CRUD department, set default akses pintu per department |
| **Controller Management** | Daftar controller, lihat/edit/push config, status online, **penamaan pintu** `[REV3]` |
| **Door Management** | Daftar pintu, assign ke controller, **beri nama/lokasi di sini** `[REV3]` |
| **Access Logs** | Riwayat tap kartu (nama dari snapshot), filter, export CSV |

### Halaman: User Management (Daftar User)

```
┌─────────────────────────────────────────────────────────────────────┐
│  👤 User Management                        [+ Tambah User] [📤 CSV]│
│                                                                     │
│  🔍 Cari user...                           Filter: [Semua Dept ▼]  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ #   Kartu       Nama           Department    Akses    Aksi   │  │
│  │─────────────────────────────────────────────────────────────── │  │
│  │ 1   AABBCCDD    John Doe       IT            Dept     👁️ 🗑️ │  │
│  │ 2   11223344    Jane Smith     IT            Custom   👁️ 🗑️ │  │
│  │ 3   DEADBEEF    Bob Wilson     HRD           Dept     👁️ 🗑️ │  │
│  │ 4   FF001122    Alice Brown    —             Custom   👁️ 🗑️ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Showing 4 of 80 users                      [◄ 1 2 3 ... 8 ►]     │
└─────────────────────────────────────────────────────────────────────┘
```

### Halaman: User Detail (Klik Salah Satu User)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ◄ Kembali ke User List                                            │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  👤 John Doe                                        [✏️ Edit] │ │
│  │  Kartu: AABBCCDD                                              │ │
│  │  Department: IT                                               │ │
│  │  Sumber Akses: Mengikuti Department                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────┐ ┌──────────────────┐                         │
│  │ 📋 User Access   │ │ 📜 Log Aktivitas │                         │
│  └──────────────────┘ └──────────────────┘                         │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════    │
│  📋 Hak Akses Pintu                                                │
│                                                                     │
│  ┌─ Sumber akses: [● Ikut Department IT] [○ Custom] ─────────┐    │
│  │                                                             │    │
│  │  Controller A — Gedung A                                    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Pintu 1 — Lobby Utama         (dari Dept IT)     │    │    │
│  │  │ ✅ Pintu 2 — Ruang Server        (dari Dept IT)     │    │    │
│  │  │ ☐  Pintu 3 — Ruang Meeting                         │    │    │
│  │  │ ☐  Pintu 4 — Ruang Arsip                           │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                             │    │
│  │  Controller B — Gedung B                                    │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ ☐  Pintu 1 — Lobby B                                │    │    │
│  │  │ ✅ Pintu 2 — Lab Komputer        (dari Dept IT)     │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  [💾 Simpan & Sync ke Controller]                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 🔴 Dashboard — Live Transaction Feed

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Dashboard                                                    │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐   │
│  │ 80      │  │ 3       │  │ 10      │  │ 2 Online        │   │
│  │ Users   │  │ Ctrl    │  │ Doors   │  │ 1 Offline       │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘   │
│                                                                  │
│  🔴 Live Access Feed                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🟢 08:30:05  John Doe     Lobby Utama (ctrl-A)  GRANTED  │  │
│  │ 🔴 08:29:52  Unknown      Lab Komputer (ctrl-B) DENIED   │  │
│  │ 🟢 08:29:30  Jane Smith   Ruang Server (ctrl-A) GRANTED  │  │
│  │ 🟢 08:28:15  Bob Wilson   Lobby B (ctrl-B)      GRANTED  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## `[REV3]` Format File CSV untuk Upload User (Standarisasi)

### Format CSV yang Diterima

```csv
kartu,nama,department,doors
AABBCCDD,John Doe,IT,Lobby Utama|Lab Komputer
11223344,Jane Smith,,Lobby Utama|Ruang Server|Ruang Meeting|Lab Komputer
DEADBEEF,Bob Wilson,HRD,
FF001122,Alice Brown,,Lobby B
```

| Kolom | Wajib | Keterangan |
|-------|-------|------------|
| `kartu` | ✅ | Nomor kartu RFID |
| `nama` | ✅ | Nama pemilik kartu |
| `department` | ❌ | Nama department (kosong = tanpa department) |
| `doors` | ❌ | **Nama pintu** dipisah `\|` (kosong = ikut department) |

### Aturan Validasi (Backend)

| Aturan | Aksi Jika Dilanggar |
|--------|---------------------|
| Header baris pertama harus `kartu,nama,department,doors` | **Tolak seluruh file** |
| Kolom `kartu` kosong | **Tolak baris ini**, laporkan error |
| Kolom `nama` kosong | **Tolak baris ini**, laporkan error |
| Nama pintu di `doors` tidak ditemukan di database | **Tolak baris ini**, laporkan error |
| `kartu` duplikat dalam file | **Tolak baris ini**, laporkan error |
| `nama` mengandung koma | **Tolak seluruh file** (merusak CSV) |

> [!TIP]
> Jika ada baris yang gagal, Backend tetap memproses baris yang valid dan melaporkan daftar baris yang gagal beserta alasannya ke Frontend.

---

## Ringkasan Tech Stack

| Layer | Teknologi | Bahasa |
|-------|-----------|--------|
| Hardware | ESP32 + RFID + Relay (disebut **Controller**) | C++ (Arduino) |
| Broker | EMQX **(+ Auth)** `[REV3]` | - |
| Backend | FastAPI **(+ NTP Server)** `[REV3]` | Python |
| Database | MySQL (**8 tabel**) `[REV3]` | SQL |
| Frontend | React + Vite | JavaScript |
| Controller ↔ MQTT | CSV, **QoS 1**, `users/set` (upsert) `[REV3]` | - |
| API ↔ Frontend | JSON + WebSocket, **JWT Auth** `[REV3]` | - |

---

## Ringkasan Semua Perubahan

| Aspek | v0.1 | Proposal v0.2 (Rev 3) |
|-------|------|------------------------|
| Jumlah ESP32 | 1 unit | **Multi-controller** |
| Nama user di ESP32 | Dikirim | **Tidak dikirim** |
| Penomoran pintu | Tidak ada masalah (1 ctrl) | **door_number lokal, door_id tidak keluar dari Backend** `[REV3]` |
| Config | Hardcoded di main.cpp | **Web app + web server lokal Controller** `[REV3]` |
| Config rollback | Tidak ada | **Auto-rollback jika WiFi/MQTT gagal** `[REV3]` |
| Auth MQTT | Tidak ada | **Username/password per controller** `[REV3]` |
| Auth Web | Tidak ada | **JWT + role admin** `[REV3]` |
| Sync protocol | 1 pesan besar | **Atomik: sync/start → set × N → sync/end + verifikasi count** `[REV3]` |
| Timestamp | `millis()` di ESP32 | **Backend yang menentukan (UTC)** `[REV3]` |
| Topic add user | `access/users/add` | `access/{id}/users/set` **(upsert)** `[REV3]` |
| Log audit | Nama dari JOIN (bisa berubah) | **Snapshot nama saat kejadian (immutable)** `[REV3]` |
| Deteksi offline | Tidak ada | **MQTT LWT + hitung dari last_seen** `[REV3]` |
| Log saat offline | Hilang | **Ring buffer 500 entri di LittleFS** `[REV3]` |
| Upload CSV | `door_id` (angka) | **Nama pintu** `[REV3]` |
| QoS MQTT | Tidak disebutkan | **QoS 1 untuk semua topic kritis** `[REV3]` |
| Database | 0 tabel (LittleFS) | **8 tabel MySQL** `[REV3]` |
| Department | Tidak ada | **Ada**, dengan default akses per dept |
| Halaman web | Tidak ada | **8 halaman** (termasuk Login, User Detail, Dept) |

---

## Known Issues (Dicatat, Belum Diselesaikan di Versi Ini)

| Issue | Keterangan | Target Versi |
|-------|------------|--------------|
| ESP32 tanpa RTC kehilangan waktu saat reboot | Tidak dipermasalahkan karena Backend yang menentukan timestamp | Ditambah RTC module di versi mendatang |
| ACL per-topic di EMQX | Saat ini hanya username/password, belum ada pembatasan per-topic | Pengembangan selanjutnya |
| TLS untuk MQTT | Belum diimplementasikan, trafik masih plaintext di LAN | Pengembangan selanjutnya |
| Audit trail admin | Belum ada pencatatan siapa melakukan perubahan apa | Pengembangan selanjutnya |
| Role viewer | Hanya ada role admin, belum ada role read-only | Pengembangan selanjutnya |
| `wifi_pass` di config/response | Harus dipastikan password tidak dikirim balik | Implementasi di v0.2 |
