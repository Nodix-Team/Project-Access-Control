# 🏗️ Arsitektur Access Control System — Proposal v0.2 (Revisi Final)

## Gambaran Umum (Multi-Controller)

```
┌──────────────┐
│ Controller A │──── Pintu 1, 2, 3, 4 (Lokal: 1-4)
│ (ESP32)      │                          ┌──────────┐      ┌──────────────┐      ┌─────────┐
└──────┬───────┘                          │          │      │              │      │         │
       │          MQTT (CSV)              │   EMQX   │◄────►│   Backend    │◄────►│  MySQL  │
┌──────┴───────┐◄────────────────────────►│ (Broker) │      │  (FastAPI)   │      │         │
│ Controller B │                          │          │      │              │      │         │
│ (ESP32)      │                          └──────────┘      └──────┬───────┘      └─────────┘
└──────┬───────┘                                                   │
       │──── Pintu 1, 2 (Lokal: 1-2)                       REST API + WebSocket
                                                                   │
┌──────────────┐                                            ┌──────┴───────┐
│ Controller C │──── Pintu 1, 2                             │   Frontend   │
│ (ESP32)      │                                            │ (React+Vite) │
└──────────────┘                                            └──────────────┘
```

> [!IMPORTANT]
> **Aturan Penomoran Pintu (Memperbaiki Bug P0-1):**
> Controller (ESP32) **hanya** mengenal penomoran pintu lokal (1 sampai 4). 
> Backend **wajib** menerjemahkan ID pintu dari database menjadi nomor pintu lokal sebelum mem-publish pesan ke MQTT. ID global dari tabel `doors` tidak boleh bocor sampai ke Controller.

---

## 1. Controller (ESP32 — Firmware C++)

### Apa yang Disimpan di Controller?
Controller hanya menyimpan data minimal: **Nomor kartu** dan **Daftar Pintu (Lokal)**. Nama user TIDAK disimpan di Controller, melainkan hanya di database.

### MQTT Topics & Protokol (Direvisi)

| Fungsi | Topic | Arah | Payload CSV (Contoh) |
|--------|-------|------|----------------------|
| **Upsert user** | `access/{id}/users/set` | Svr → Ctrl | `AABBCCDD,1\|3` (Ganti total akses kartu ini) |
| Hapus user | `access/{id}/users/delete` | Svr → Ctrl | `AABBCCDD` |
| Sync start | `access/{id}/users/sync/start` | Svr → Ctrl | `sync_id_123` |
| Sync end | `access/{id}/users/sync/end` | Svr → Ctrl | `sync_id_123,80` (jumlah data) |
| Sync result | `access/{id}/sync/result` | Ctrl → Svr | `sync_id_123,OK,80` atau `MISMATCH` |
| Push config | `access/{id}/config/set` | Svr → Ctrl | `heartbeat_s,60` |
| Request config| `access/{id}/config/request` | Svr → Ctrl | *(kosong)* |
| Kirim config | `access/{id}/config/response`| Ctrl → Svr | `ctrl-A,4,REDMI,10.212.228.153,1883,60` |
| Log akses | `access/{id}/logs` | Ctrl → Svr | `AABBCCDD,2,GRANTED,UNKNOWN_CARD` |
| Status (LWT) | `access/{id}/status/lwt` | Ctrl → Svr | `online` / `offline` (otomatis oleh broker) |

> [!TIP]
> **Sinkronisasi Aman (Atomic Swap):** Saat `sync/start`, ESP32 membuat daftar baru di RAM tanpa menghapus yang lama. Jika di `sync/end` jumlah datanya cocok, barulah daftar lama ditimpa (atomic swap). Jika gagal, daftar baru dibuang dan pintu tetap berfungsi pakai daftar lama. 

### Local Web Server (Portal Config Darurat)
Selain dikontrol via MQTT, ESP32 memiliki **Web Server Lokal** (misal diakses via `192.168.x.x:8081`). Jika admin salah melakukan *push config* via web app (misal salah IP broker) yang membuat ESP32 offline, admin bisa langsung mengakses IP ESP32 lewat browser untuk memperbaiki config IP Address (Static/DHCP) dan WiFi/MQTT secara manual.

### Log Offline (Ring Buffer)
Jika WiFi terputus, ESP32 akan terus melayani akses kartu dan menyimpan log riwayatnya ke dalam **LittleFS (Ring Buffer, maks 500 log)**. Saat terhubung kembali, semua log yang tertahan akan dikirim sekaligus agar sistem audit di database tetap utuh.

---

## 2. EMQX Broker

- **Autentikasi (V0.2)**: Menggunakan **Username & Password MQTT** per-controller untuk mengamankan jalur komunikasi.
- Fitur ACL dan TLS ditunda untuk pengembangan selanjutnya.
- Menggunakan fitur **Last Will & Testament (LWT)**: Broker akan otomatis mem-publish status `offline` jika controller terputus.

---

## 3. Backend — FastAPI (Python)

- **Timestamp Otoritatif**: Karena ESP32 tidak memiliki RTC pada versi ini, ESP32 bisa kehilangan waktu saat reboot tanpa internet (NTP). Oleh karena itu, **Backend yang menentukan timestamp** saat pesan log diterima, dicatat sebagai `server_ts`.
- **Autentikasi API**: Menggunakan **Login + JWT Session**. Pada rilis ini hanya ada satu role yaitu `Admin` (Full Access).
- **Format CSV Ketat**: Standar format CSV dari upload Web App diseragamkan. Jika tidak sesuai format, Backend akan langsung menolak file tersebut (tidak dikirim ke database/controller).

---

## 4. Database — MySQL (7 Tabel)

### Desain Tabel (Schema)

```sql
-- ═══════════════════════════════════════════
-- HARDWARE & ORGANISASI
-- ═══════════════════════════════════════════

CREATE TABLE controllers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    device_id   VARCHAR(50) NOT NULL UNIQUE,
    nama        VARCHAR(100),
    lokasi      VARCHAR(100),
    wifi_ssid   VARCHAR(50),
    mqtt_broker VARCHAR(50),
    mqtt_port   INT DEFAULT 1883,
    total_doors INT DEFAULT 4,
    heartbeat_s INT DEFAULT 30,
    last_seen   DATETIME, -- is_online tidak disimpan, dihitung berdasarkan last_seen / LWT
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE doors (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    controller_id   INT NOT NULL,
    door_number     INT NOT NULL,               -- nomor pintu lokal di controller (1-4)
    nama            VARCHAR(100),               -- "Ruang Server", "Lobby"
    lokasi          VARCHAR(100),
    FOREIGN KEY (controller_id) REFERENCES controllers(id),
    UNIQUE KEY (controller_id, door_number)
);

CREATE TABLE departments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nama        VARCHAR(100) NOT NULL UNIQUE,
    deskripsi   VARCHAR(255),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

CREATE TABLE access_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    kartu           VARCHAR(20) NOT NULL,
    user_id         INT NULL,
    user_nama       VARCHAR(100) NULL,           -- SNAPSHOT saat kejadian
    door_id         INT NULL,
    door_nama       VARCHAR(100) NULL,           -- SNAPSHOT saat kejadian
    controller_id   INT NULL,
    result          ENUM('GRANTED', 'DENIED') NOT NULL,
    reason          VARCHAR(50) NULL,            -- UNKNOWN_CARD, OK, NO_ACCESS
    is_replayed     BOOLEAN DEFAULT FALSE,       -- TRUE jika ini log lama kiriman offline buffer
    server_ts       DATETIME NOT NULL,           -- Otoritatif (waktu saat server terima log)
    device_uptime_ms BIGINT NULL,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE SET NULL,
    FOREIGN KEY (controller_id) REFERENCES controllers(id) ON DELETE SET NULL,
    INDEX idx_ts (server_ts),
    INDEX idx_kartu_ts (kartu, server_ts)
);
```

> [!NOTE]
> Pada tabel `access_logs`, **nama user dan nama pintu di-snapshot (disalin mati)**. Ini memastikan jika kartu di-assign ke orang lain di masa depan, riwayat lama tetap atas nama orang yang lama. Ini syarat mutlak untuk keabsahan audit keamanan.

---

## 5. Frontend — React + Vite

Terdapat **Login Page** (hanya Admin). Web app memiliki fitur utama:
1. **Dashboard**: Ringkasan data & **🔴 Live Transaction Feed** (WebSocket).
2. **User Management**: Daftar tabel user. Upload CSV di menu ini harus menggunakan **nama pintu**, bukan ID pintu.
3. **User Detail**: Halaman khusus untuk tiap user (klik dari tabel). Di sini admin bisa set **User Access** (toggle antara "Ikut Department" atau "Custom Override").
4. **Department Management**: Buat department dan atur default akses pintu untuk dept tersebut.
5. **Controller & Door Management**: Kelola ESP32, ubah nama pintu, dan push config dari Web.
6. **Access Logs**: Laporan riwayat tap kartu.

---

## 6. Pentahapan Implementasi (Roadmap)

Agar pengembangan tidak saling bertabrakan, project dieksekusi secara bertahap:

| Versi | Target Utama | Deskripsi |
|-------|--------------|-----------|
| **v0.1** | Prototype | Hardware bekerja dengan Serial Simulator. (Selesai ✅) |
| **v0.2** | Hardware Final | Integrasi hardware fisik RFID + Relay doorlock. Satu controller dulu, memastikan koneksi MQTT & offline ring buffer bekerja sempurna. |
| **v0.3** | Backend Data | Setup FastAPI, MySQL, JWT Login. Log tersimpan permanen di database. API CRUD selesai dibuat. |
| **v0.4** | Multi-Controller | Modifikasi arsitektur topic MQTT untuk multi-controller, atomic swap sync, dan LWT diintegrasikan sepenuhnya. |
| **v0.5** | Dashboard & Web | Pembuatan antarmuka React + Vite, WebSocket Live Feed, dan fitur admin lengkap (Push config, Dept, dll). |
