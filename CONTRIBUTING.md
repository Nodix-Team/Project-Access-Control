# 🤝 Contributing — Access Control System

## Struktur Repository

```
Project-Access-Control/
├── firmware/       ← ESP32 Controller (C++, PlatformIO)
├── backend/        ← FastAPI REST API + MQTT (Python)
├── frontend/       ← React + Vite Web App (JavaScript)
├── database/       ← MySQL Schema & Migrations (SQL)
├── docs/           ← Dokumentasi arsitektur, panduan, roadmap, PRD
└── tools/          ← Script utility untuk testing/development
```

## Branching Strategy

```
main ──────────────────────────────► (production-ready, protected)
  │
  └── dev ─────────────────────────► (integration branch)
        │
        ├── feature/nama-fitur ────► feature branch
        ├── fix/nama-bug ──────────► bugfix branch
        └── docs/nama-doc ─────────► documentation branch
```

### Aturan

1. **Jangan push langsung ke `main`** — `main` hanya menerima merge dari `dev`
2. **Semua development di branch `dev`** atau feature branch
3. **Setiap fitur baru = 1 branch** dari `dev`
4. **Pull Request (PR) wajib** untuk merge ke `dev`
5. **Minta review** sebelum merge

### Workflow

```bash
# 1. Pastikan dev terbaru
git checkout dev
git pull origin dev

# 2. Buat feature branch
git checkout -b feature/nama-fitur

# 3. Kerjakan, commit secara berkala
git add .
git commit -m "feat: deskripsi perubahan"

# 4. Push dan buat PR
git push origin feature/nama-fitur
# Buat Pull Request di GitHub: feature/nama-fitur → dev
```

## Commit Message Convention

Format: `<type>: <description>`

| Type | Kapan Dipakai |
|------|--------------|
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `docs` | Perubahan dokumentasi |
| `refactor` | Refactoring kode (tidak ubah fitur) |
| `test` | Menambah/memperbaiki test |
| `chore` | Maintenance (update deps, config, dll) |

Contoh:
```
feat: tambah JWT authentication di backend
fix: perbaiki sync protocol timeout
docs: update MQTT topic contract
refactor: pisahkan MQTT handler dari main
```

## Setup Development

### Firmware (ESP32)
```bash
# Buka firmware/ di PlatformIO
# Build & upload via PlatformIO
```

### Backend (Python)
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
cp .env.example .env        # Edit konfigurasi
uvicorn app.main:app --reload
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### Database (MySQL)
```bash
mysql -u root -p -e "CREATE DATABASE access_control CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
mysql -u root -p access_control < database/schema.sql
mysql -u root -p access_control < database/seed.sql   # data dummy
```

## Referensi

- [Indeks Dokumentasi Lengkap](docs/README.md) — peta semua dokumen di `docs/`
- [Architecture Proposal v0.2 (Rev 3)](docs/architecture_proposal_v0.2.md)
- [Architecture Review](docs/architecture_review.md)
- [Testing Guide](docs/testing_guide.md)
- [Roadmap v0.3](docs/ROADMAP_v0.3.md)
