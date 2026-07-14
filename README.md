# 🔐 Access Control System

Sistem kontrol akses berbasis RFID menggunakan ESP32 sebagai controller, dengan backend FastAPI, database MySQL, dan web app React.

## Arsitektur

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

## Struktur Repository

| Folder | Isi | Status |
|--------|-----|--------|
| [`firmware/`](firmware/) | ESP32 Controller — C++ (PlatformIO) | ✅ v0.1 |
| [`backend/`](backend/) | FastAPI REST API + MQTT Client | 🔲 Belum |
| [`frontend/`](frontend/) | React + Vite Web App | 🔲 Belum |
| [`database/`](database/) | MySQL Schema + Seed Data | ✅ Schema ready |
| [`docs/`](docs/) | Dokumentasi arsitektur & panduan | ✅ |
| [`tools/`](tools/) | Script utility untuk testing | ✅ |

## Quick Start

### 1. Firmware (ESP32)
```bash
# Buka firmware/ di PlatformIO → Build → Upload
```

### 2. Database
```bash
mysql -u root -p -e "CREATE DATABASE access_control CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p access_control < database/schema.sql
mysql -u root -p access_control < database/seed.sql
```

### 3. Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 4. Frontend
```bash
cd frontend
npm install && npm run dev
```

## Dokumentasi

- 📋 [Architecture Proposal v0.2 (Rev 3)](docs/architecture_proposal_v0.2.md)
- 📝 [Architecture Review](docs/architecture_review.md)
- 🧪 [Testing Guide](docs/testing_guide.md)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Hardware | ESP32 + RFID RC522 + Relay |
| Broker | EMQX (MQTT + Auth) |
| Backend | FastAPI (Python) |
| Database | MySQL 8.0 |
| Frontend | React + Vite |

## Contributors

- [@danskiv](https://github.com/danskiv) — Firmware, Backend
- [@rizzalaulia](https://github.com/rizzalaulia) — Review, Frontend

## License

Private Repository
