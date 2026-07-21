# 🔐 ESP32 Access Control System

Sistem kontrol akses berbasis RFID menggunakan ESP32 sebagai controller, dengan backend FastAPI, database MySQL, dan web app React.

---

## 🏗️ Arsitektur Sistem

```
┌──────────────┐
│ Controller   │     MQTT (CSV, QoS 1)     ┌──────────┐     ┌──────────────┐     ┌─────────┐
│ (ESP32)      │◄──────────────────────────►│   EMQX   │◄───►│   Backend    │◄───►│  MySQL  │
│ RFID + Relay │                            │ (Broker) │     │  (FastAPI)   │     │ 8 tabel │
└──────────────┘                            └──────────┘     └──────┬───────┘     └─────────┘
                                                                    │
                                                              REST + WebSocket
                                                                    │
                                                             ┌──────┴───────┐
                                                             │   Frontend   │
                                                             │ (React+Vite) │
                                                             └──────────────┘
```

---

## 📦 Struktur Repository

| Folder | Isi | Status |
|--------|-----|--------|
| [`firmware/`](firmware/) | ESP32 Controller — C++ (PlatformIO) | ✅ v0.2.0 (Atomic Sync, Local Web Config, Offline logs, 10-digit pad) |
| [`backend/`](backend/) | FastAPI REST API + MQTT Client | ✅ Selesai (JWT auth, CRUD, MQTT, sync atomik, WebSocket) |
| [`frontend/`](frontend/) | React + Vite Web App | ✅ Terintegrasi ke backend nyata (Sprint 5) |
| [`database/`](database/) | MySQL Schema + Seed Data | ✅ Schema & Auth Setup Ready (Sprint 1) |
| [`docs/`](docs/) | Dokumentasi arsitektur & panduan | ✅ Updated |
| [`tools/`](tools/) | Script utility untuk testing | ✅ Updated |

---

## ✨ Fitur Baru di Firmware v0.2.0
*   **Normalisasi ID Kartu 10-Digit:** ID kartu numerik otomatis dipadatkan menjadi 10 digit dengan angka `0` di depannya (contoh: `123456` -> `0000123456`).
*   **Protokol Sinkronisasi Atomik:** Transaksi sinkronisasi massal menggunakan memori RAM staging (`_stagingUsers`) dan ditransaksikan ke flash LittleFS secara utuh setelah total kecocokan count terverifikasi.
*   **Offline Log Buffer (Ring Buffer FIFO 500):** Log tap kartu saat offline disimpan ke `/logs/offline_buffer.csv`. Saat mendeteksi koneksi MQTT aktif kembali, log di-replay otomatis dengan tanda `,REPLAYED`.
*   **Widescreen Web Config Server (Port 8081):** Portal konfigurasi admin lokal fullscreen dengan *glassmorphism* gelap responsif, diproteksi HTTP Basic Auth (`admin` / `p@ssw0rd`).
*   **Safe Config Rollback:** Otomatis mengembalikan pengaturan WiFi/MQTT ke cadangan terakhir yang aman jika uji koneksi gagal dalam 60 detik setelah reboot.
*   **Serial CLI Escape:** Tombol escape global (`LIST`, `STATUS`, `CANCEL`, `EXIT`) untuk membatalkan proses scan kartu di monitor serial tanpa terkunci.

---

## 🚀 Quick Start

### 1. Firmware (ESP32)
1. Buka folder `firmware/` di VS Code dengan ekstensi **PlatformIO**.
2. Hubungkan ESP32 Anda ke port USB (misal: `COM6`).
3. Tekan **Build** lalu **Upload** melalui panel PlatformIO.

### 2. Database MySQL
```bash
# Buat database lokal
mysql -u root -p -e "CREATE DATABASE access_control CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
# Import schema & seed dummy data
mysql -u root -p access_control < database/schema.sql
mysql -u root -p access_control < database/seed.sql
```

### 3. Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 4. Frontend (React+Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 📋 Dokumentasi Pendukung

- 📚 [Indeks Dokumentasi Lengkap](docs/README.md) — peta semua dokumen (roadmap, arsitektur, panduan testing)
- 🛣️ [Roadmap v0.3 (Sedang Berjalan)](docs/ROADMAP_v0.3.md)
- 📊 [Laporan Penutupan v0.2](docs/V0.2_CLOSURE_REPORT.md)
- 📐 [Architecture Proposal Specification (v0.2.0-rev3)](docs/architecture_proposal_v0.2.md)
- 🧪 [Panduan Praktis Pengujian & Simulator](docs/testing_guide.md)

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Hardware** | ESP32 + RFID RC522 + Relay |
| **Broker** | EMQX (MQTT + Auth Built-in DB) |
| **Backend** | FastAPI (Python 3.10+) |
| **Database** | MySQL 8.0 |
| **Frontend** | React + Vite |

---

## 👥 Kontributor

- **Danas Wara** ([@danskiv](https://github.com/danskiv)) — Firmware, Database, & Backend Architect
- **Rizal Aulia** ([@rizzalaulia](https://github.com/rizzalaulia)) — Reviewer & Frontend Developer

---

## 📄 Lisensi

Private Repository — Hak Cipta Dilindungi Undang-Undang.
