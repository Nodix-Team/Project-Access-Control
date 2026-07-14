# 🏗️ Arsitektur Access Control System — Proposal v0.2 (Revisi)

## Gambaran Umum (Multi-Controller)

```
┌──────────────┐
│ Controller A │──── Pintu 1, 2, 3, 4
│ (ESP32)      │                          ┌──────────┐      ┌──────────────┐      ┌─────────┐
└──────┬───────┘                          │          │      │              │      │         │
       │          MQTT (CSV)              │   EMQX   │◄────►│   Backend    │◄────►│  MySQL  │
┌──────┴───────┐◄────────────────────────►│ (Broker) │      │  (FastAPI)   │      │         │
│ Controller B │                          │          │      │              │      │         │
│ (ESP32)      │                          └──────────┘      └──────┬───────┘      └─────────┘
└──────┬───────┘                                                   │
       │──── Pintu 5, 6, 7, 8                              REST API + WebSocket
                                                                   │
┌──────────────┐                                            ┌──────┴───────┐
│ Controller C │──── Pintu 9, 10                            │   Frontend   │
│ (ESP32)      │                                            │ (React+Vite) │
└──────────────┘                                            └──────────────┘
```

> [!IMPORTANT]
> **Perubahan dari versi sebelumnya:**
> 1. ESP32 sekarang disebut **"Controller"**
> 2. **Nama user TIDAK dikirim ke Controller** — Controller hanya perlu tahu `kartu` + `doors`
> 3. **Config bisa di-push** dari web app ke Controller (bukan hanya dibaca)
> 4. Arsitektur mendukung **banyak Controller**, masing-masing mengelola pintu berbeda

---

## 1. Controller (ESP32 — Firmware C++)

### Apa yang Disimpan di Controller?

Controller hanya menyimpan data **seminimal mungkin** untuk membuat keputusan akses:

| Data | Contoh | Keterangan |
|------|--------|------------|
| Nomor kartu | `AABBCCDD` | Untuk mencocokkan saat tap |
| Daftar pintu | `1\|3` | Pintu mana yang boleh diakses |

**Nama user TIDAK disimpan di Controller.** Nama hanya ada di database MySQL, dipakai untuk tampilan di web app. Ini membuat:
- Payload MQTT **lebih ringan** (hemat ~40% per user)
- Memori flash ESP32 **lebih hemat**
- Tidak perlu sync nama jika admin mengedit nama di web

### Format Data yang Dikirim ke Controller (CSV)

```
Lama:  AABBCCDD,John Doe,1|3    (23 byte)
Baru:  AABBCCDD,1|3             (12 byte)  ← hampir setengahnya!
```

### MQTT Topics (Multi-Controller)

Setiap controller punya **device_id** unik. Topic MQTT sekarang menyertakan `{device_id}`:

| Fungsi | Topic | Arah | Payload CSV |
|--------|-------|------|-------------|
| Tambah user | `access/{device_id}/users/add` | Server → Controller | `AABBCCDD,1\|3` |
| Hapus user | `access/{device_id}/users/delete` | Server → Controller | `AABBCCDD` |
| Mulai sync | `access/{device_id}/users/sync/start` | Server → Controller | *(kosong)* |
| Selesai sync | `access/{device_id}/users/sync/end` | Server → Controller | *(kosong)* |
| **Push config** | `access/{device_id}/config/set` | Server → Controller | *(lihat bawah)* |
| **Baca config** | `access/{device_id}/config/request` | Server → Controller | *(kosong)* |
| Response config | `access/{device_id}/config/response` | Controller → Server | *(lihat bawah)* |
| Log akses | `access/{device_id}/logs` | Controller → Server | `AABBCCDD,2,GRANTED,1720000000` |
| Status/Heartbeat | `access/{device_id}/status` | Controller → Server | `4,80,247000,1720000000` |

> [!NOTE]
> Dengan `{device_id}` di topic, Backend bisa mengirim perintah ke **controller tertentu** saja. Contoh:
> - `access/ctrl-gedungA/users/add` → hanya Controller Gedung A yang terima
> - `access/ctrl-gedungB/config/set` → hanya Controller Gedung B yang terima

### Contoh — Menghapus User

```
Lama:  topic: access/users/delete       payload: "1"          (pakai uid)
Baru:  topic: access/ctrl-A/users/delete payload: "AABBCCDD"   (pakai nomor kartu)
```

Mengapa pakai **nomor kartu** bukan uid? Karena uid itu urusan database (MySQL). Controller tidak perlu tahu uid. Nomor kartu sudah unik dan Controller memang mencocokkan berdasarkan nomor kartu.

---

## 2. EMQX Broker (Tetap, Tidak Berubah)

---

## 3. Backend — FastAPI (Python)

### REST API Endpoints (Direvisi)

```
┌─────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                            │
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────────────────────┐  │
│  │  MQTT Client      │    │  REST API                         │  │
│  │  (aiomqtt)        │    │                                   │  │
│  │                   │    │  --- User Management ---          │  │
│  │  Subscribe:       │    │  GET    /api/users                │  │
│  │  - access/+/logs  │    │  POST   /api/users                │  │
│  │  - access/+/status│    │  PUT    /api/users/{uid}          │  │
│  │  - access/+/config│    │  DELETE /api/users/{uid}          │  │
│  │    /response      │    │  POST   /api/users/upload-csv     │  │
│  │                   │    │                                   │  │
│  │  Publish:         │    │  --- Controller Management ---    │  │
│  │  - access/{id}/*  │    │  GET    /api/controllers          │  │
│  │                   │    │  POST   /api/controllers          │  │
│  │                   │    │  PUT    /api/controllers/{id}     │  │
│  │                   │    │  POST   /api/controllers/{id}/sync│  │
│  │                   │    │  GET    /api/controllers/{id}/config │
│  │                   │    │  PUT    /api/controllers/{id}/config │
│  │                   │    │                                   │  │
│  │                   │    │  --- Logs & Dashboard ---         │  │
│  │                   │    │  GET    /api/logs                 │  │
│  │                   │    │  WS     /ws/live-feed             │  │
│  └──────────────────┘    └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Alur Kerja — Admin Menambah User via Web

```
Admin isi form: kartu=AABBCCDD, nama=John Doe, doors=[Pintu 1 (ctrl-A), Pintu 6 (ctrl-B)]
        │
        ▼
Frontend kirim POST /api/users
        │
        ▼
Backend:
  ├── Simpan ke MySQL (uid=1, kartu=AABBCCDD, nama=John Doe)
  │   + Simpan relasi: user 1 → door 1 (ctrl-A), door 6 (ctrl-B)
  │
  ├── Publish MQTT ke ctrl-A:
  │   topic: access/ctrl-A/users/add
  │   payload: "AABBCCDD,1"              ← hanya pintu milik ctrl-A
  │
  └── Publish MQTT ke ctrl-B:
      topic: access/ctrl-B/users/add
      payload: "AABBCCDD,6"              ← hanya pintu milik ctrl-B
```

> [!TIP]
> Backend secara otomatis menentukan controller mana yang perlu dikirim data, berdasarkan pintu yang dipilih admin. Admin tidak perlu tahu ada berapa controller.

### Alur Kerja — Admin Push Config ke Controller

```
Admin buka halaman "Device Config", ubah heartbeat Controller A dari 30 → 60 detik
        │
        ▼
Frontend kirim PUT /api/controllers/ctrl-A/config
body: { "heartbeat_s": 60 }
        │
        ▼
Backend:
  ├── Update di MySQL (tabel controllers)
  │
  └── Publish MQTT:
      topic: access/ctrl-A/config/set
      payload: "heartbeat_s,60"           ← Controller A terima & terapkan
        │
        ▼
Controller A update config-nya di LittleFS, kirim response:
      topic: access/ctrl-A/config/response
      payload: "ctrl-A,4,REDMI,10.212.228.153,1883,60"
        │
        ▼
Backend terima → update last_seen di MySQL → teruskan ke Frontend
```

### Config yang Bisa Di-Push ke Controller

| Parameter | Contoh | Keterangan |
|-----------|--------|------------|
| `wifi_ssid` | `REDMI` | Nama WiFi |
| `wifi_pass` | `Danas123` | Password WiFi |
| `mqtt_broker` | `10.212.228.153` | IP broker MQTT |
| `mqtt_port` | `1883` | Port broker |
| `heartbeat_s` | `30` | Interval heartbeat (detik) |
| `total_doors` | `4` | Jumlah pintu yang dikelola |

> [!WARNING]
> Jika admin mengubah `wifi_ssid` atau `mqtt_broker`, Controller akan kehilangan koneksi setelah restart. Pastikan nilai baru sudah benar sebelum push!

---

## 4. Database — MySQL (Direvisi: Multi-Controller + Department)

### Desain Tabel (Schema) — 7 Tabel

```sql
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
    total_doors INT DEFAULT 4,
    heartbeat_s INT DEFAULT 30,
    is_online   BOOLEAN DEFAULT FALSE,
    last_seen   DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Pintu (setiap pintu fisik)
CREATE TABLE doors (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    controller_id   INT NOT NULL,
    door_number     INT NOT NULL,               -- nomor pintu di controller (1-4)
    nama            VARCHAR(100),               -- "Ruang Server", "Lobby"
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

-- Tabel Default Akses Department (pintu-pintu yang bisa diakses oleh department ini)
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
    kartu           VARCHAR(20) NOT NULL UNIQUE,
    nama            VARCHAR(100) NOT NULL,
    department_id   INT DEFAULT NULL,           -- NULL = tidak masuk department manapun
    is_custom_access BOOLEAN DEFAULT FALSE,     -- TRUE = pakai custom, FALSE = ikut department
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
-- LOG
-- ═══════════════════════════════════════════

-- Tabel Log Akses (Riwayat tap kartu)
CREATE TABLE access_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    kartu           VARCHAR(20) NOT NULL,
    door_id         INT,
    controller_id   INT,
    result          ENUM('GRANTED', 'DENIED') NOT NULL,
    timestamp       DATETIME NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE SET NULL,
    FOREIGN KEY (controller_id) REFERENCES controllers(id) ON DELETE SET NULL
);
```

### Logika Penentuan Hak Akses User

Backend menggunakan logika berikut untuk menentukan **pintu mana saja** yang boleh diakses user:

```
User punya custom access (is_custom_access = TRUE)?
  │
  ├── YA  → Pakai data dari tabel user_access
  │         (Admin sudah set khusus untuk user ini)
  │
  └── TIDAK → User punya department?
                │
                ├── YA  → Pakai data dari tabel department_access
                │         (Ikut default akses department-nya)
                │
                └── TIDAK → Tidak bisa akses pintu manapun
```

> [!IMPORTANT]
> **Flag `is_custom_access`** sangat penting:
> - `FALSE` (default) → User ikut akses department-nya. Jika admin mengubah akses department, otomatis semua user di department itu ikut berubah.
> - `TRUE` → User punya daftar pintu sendiri di `user_access`. Perubahan di department **tidak berpengaruh** ke user ini.
> - Jika user **tidak punya department** DAN `is_custom_access = FALSE` → user tidak bisa masuk pintu manapun.

### Contoh Skenario

**Tabel `departments`:**

| id | nama | deskripsi |
|----|------|-----------|
| 1 | IT | Divisi Teknologi Informasi |
| 2 | HRD | Human Resource Development |
| 3 | Security | Tim Keamanan |

**Tabel `department_access` (default akses per department):**

| department_id | door_id | Artinya |
|---------------|---------|----------|
| 1 (IT) | 1 | IT boleh Lobby Utama |
| 1 (IT) | 2 | IT boleh Ruang Server |
| 1 (IT) | 6 | IT boleh Lab Komputer |
| 2 (HRD) | 1 | HRD boleh Lobby Utama |
| 2 (HRD) | 3 | HRD boleh Ruang Meeting |
| 3 (Security) | 1 | Security boleh Lobby Utama |
| 3 (Security) | 2 | Security boleh Ruang Server |
| 3 (Security) | 3 | Security boleh Ruang Meeting |
| 3 (Security) | 4 | Security boleh Ruang Arsip |
| 3 (Security) | 5 | Security boleh Lobby B |
| 3 (Security) | 6 | Security boleh Lab Komputer |

**Tabel `users`:**

| uid | kartu | nama | department_id | is_custom_access |
|-----|-------|------|---------------|------------------|
| 1 | AABBCCDD | John Doe | 1 (IT) | FALSE |
| 2 | 11223344 | Jane Smith | 1 (IT) | **TRUE** |
| 3 | DEADBEEF | Bob Wilson | 2 (HRD) | FALSE |
| 4 | FF001122 | Alice Brown | NULL | **TRUE** |

**Tabel `user_access` (hanya untuk user dengan is_custom_access = TRUE):**

| user_id | door_id | Artinya |
|---------|---------|----------|
| 2 (Jane) | 1 | Jane custom: Lobby Utama |
| 2 (Jane) | 2 | Jane custom: Ruang Server |
| 2 (Jane) | 3 | Jane custom: Ruang Meeting |
| 2 (Jane) | 6 | Jane custom: Lab Komputer |
| 4 (Alice) | 5 | Alice custom: Lobby B |

**Hasil akses masing-masing user:**

| User | Sumber Akses | Pintu yang Bisa Diakses |
|------|-------------|-------------------------|
| John Doe | Ikut Dept IT (default) | Lobby Utama, Ruang Server, Lab Komputer |
| Jane Smith | Custom (override) | Lobby Utama, Ruang Server, **Ruang Meeting**, Lab Komputer |
| Bob Wilson | Ikut Dept HRD (default) | Lobby Utama, Ruang Meeting |
| Alice Brown | Custom (tanpa dept) | Lobby B |

---

## 5. Frontend — React + Vite

### Halaman Web App

| Halaman | Fitur |
|---------|-------|
| **Dashboard** | Ringkasan statistik, status controller, **🔴 live transaction feed** |
| **User Management** | Daftar semua user (tabel), tambah user, hapus user, upload CSV |
| **→ User Detail** | Klik user di tabel → halaman detail: info user, department, **tab User Access** |
| **Department Management** | CRUD department, set default akses pintu per department |
| **Controller Management** | Daftar controller, lihat/edit/push config, status online |
| **Door Management** | Daftar pintu, assign ke controller, beri nama/lokasi |
| **Access Logs** | Riwayat tap kartu, filter, export CSV |

---

### Halaman: User Management (Daftar User)

Halaman ini menampilkan **daftar semua user** dalam bentuk tabel. Tidak menampilkan detail akses pintu.

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

- Kolom **Akses** menunjukkan: `Dept` (ikut department) atau `Custom` (override sendiri)
- Klik 👁️ atau klik baris → masuk ke **User Detail**
- [+ Tambah User] → form tambah user baru (kartu, nama, pilih department)
- [📤 CSV] → upload file CSV untuk bulk import

---

### Halaman: User Detail (Klik Salah Satu User)

Setelah klik user dari daftar, masuk ke halaman detail user tersebut.

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

**Cara kerja toggle sumber akses:**
- **"Ikut Department"** → Checkbox pintu dikunci/disabled, mengikuti `department_access`. Admin tidak bisa mengubah satu per satu.
- **"Custom"** → Checkbox pintu terbuka, admin bebas centang/uncentang pintu mana saja. Data disimpan ke `user_access`, flag `is_custom_access = TRUE`.
- Tombol **"Simpan & Sync"** → Simpan ke MySQL + publish ke Controller terkait via MQTT.

---

### Halaman: Department Management

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏢 Department Management                       [+ Tambah Dept]    │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ #   Nama        Deskripsi               Jml User   Aksi      │  │
│  │──────────────────────────────────────────────────────────────  │  │
│  │ 1   IT          Divisi Teknologi Info   25         👁️ ✏️ 🗑️ │  │
│  │ 2   HRD         Human Resource Dev.     18         👁️ ✏️ 🗑️ │  │
│  │ 3   Security    Tim Keamanan            10         👁️ ✏️ 🗑️ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ═══════════════════════════════════════════════════════════════    │
│  Klik department → Set Default Akses Pintu:                        │
│                                                                     │
│  🏢 Department: IT                                                  │
│                                                                     │
│  Controller A — Gedung A                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✅ Pintu 1 — Lobby Utama                                    │   │
│  │ ✅ Pintu 2 — Ruang Server                                   │   │
│  │ ☐  Pintu 3 — Ruang Meeting                                  │   │
│  │ ☐  Pintu 4 — Ruang Arsip                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Controller B — Gedung B                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☐  Pintu 1 — Lobby B                                        │   │
│  │ ✅ Pintu 2 — Lab Komputer                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [💾 Simpan]  [🔄 Sync Semua User IT ke Controller]                │
└─────────────────────────────────────────────────────────────────────┘
```

> [!WARNING]
> Saat admin mengubah default akses department lalu klik "Sync Semua User", Backend akan:
> 1. Cari semua user di department tersebut yang `is_custom_access = FALSE`
> 2. Kirim update ke Controller terkait via MQTT
> 3. User yang sudah di-custom (`is_custom_access = TRUE`) **tidak terpengaruh**

---

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

> [!NOTE]
> Nama user dan nama pintu ditampilkan di web walaupun Controller hanya mengirim nomor kartu dan nomor pintu. Backend mencocokkan dari database sebelum meneruskan ke Frontend via WebSocket.

---

## Format File CSV untuk Upload User

```csv
kartu,nama,doors
AABBCCDD,John Doe,1|6
11223344,Jane Smith,1|2|5
DEADBEEF,Bob Wilson,5
```

Kolom `doors` berisi **ID pintu dari database** (bukan door_number di controller). Backend yang akan menentukan controller mana yang perlu dikirim.

---

## Ringkasan Tech Stack

| Layer | Teknologi | Bahasa |
|-------|-----------|--------|
| Hardware | ESP32 + RFID + Relay (disebut **Controller**) | C++ (Arduino) |
| Broker | EMQX | - |
| Backend | FastAPI | Python |
| Database | MySQL (**7 tabel**) | SQL |
| Frontend | React + Vite | JavaScript |
| Controller ↔ MQTT | Format CSV (tanpa nama user) | - |
| API ↔ Frontend | Format JSON + WebSocket | - |

---

## Ringkasan Perubahan dari Versi Sebelumnya

| Aspek | v0.1 | Proposal v0.2 |
|-------|------|---------------|
| Jumlah ESP32 | 1 unit | **Multi-controller** |
| Nama user di ESP32 | Dikirim | **Tidak dikirim** (hanya di database) |
| Config | Hardcoded di main.cpp | **Bisa baca & push** dari web app |
| Hapus user | Pakai uid | Pakai **nomor kartu** |
| MQTT topic | `access/users/add` | `access/{device_id}/users/add` |
| Database | 0 tabel (LittleFS) | **7 tabel MySQL** |
| Department | Tidak ada | **Ada**, dengan default akses per dept |
| Hak akses user | Flat (langsung per user) | **Berlapis** (dept default → custom override) |
| Halaman web | Tidak ada | **7 halaman** (termasuk User Detail & Dept) |
