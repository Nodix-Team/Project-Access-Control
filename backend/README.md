# Backend — FastAPI

Access Control API v0.2 — REST API untuk manajemen user, department, controller, pintu, dan log akses. MQTT (sinkronisasi ke controller ESP32) belum diimplementasikan di sini — lihat [ROADMAP_v0.2.md](../docs/v0.2/ROADMAP_v0.2.md) Sprint 3.

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows (cmd/PowerShell)
# source venv/Scripts/activate  # Git Bash

pip install -r requirements.txt
cp .env.example .env         # lalu edit .env, isi nilai asli (JANGAN commit .env!)
```

### Isi `.env`

| Variabel | Keterangan |
|----------|------------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Koneksi MySQL. Kalau pakai Docker lokal, cek port yang dipetakan ke host (bisa bukan `3306` default kalau port itu sudah dipakai container lain). |
| `JWT_SECRET_KEY` | String acak untuk menandatangani token — generate sendiri, bukan dari mana pun. Contoh: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | Default `HS256`, tidak perlu diubah kecuali ada alasan khusus. |
| `JWT_EXPIRE_MINUTES` | Umur token JWT dalam menit. |
| `MQTT_HOST`, `MQTT_PORT`, `MQTT_USERNAME`, `MQTT_PASSWORD` | Kredensial broker EMQX. Belum dipakai di kode (Sprint 3), tapi sudah disiapkan di config. |

Database harus sudah berisi schema + seed (`database/schema.sql`, `database/seed.sql` — lihat [database/README.md](../database/README.md)) sebelum backend dijalankan.

### Jalankan

```bash
uvicorn app.main:app --reload
```

Buka `http://localhost:8000/health` (harus `{"status":"ok"}`) dan `http://localhost:8000/docs` (Swagger UI).

> **Catatan soal Swagger `/docs`:** tombol "Authorize" tidak bisa dipakai untuk endpoint terproteksi — skema `OAuth2PasswordBearer` di FastAPI membuat Swagger mengirim form-urlencoded ke `/api/auth/login`, padahal endpoint ini menerima JSON. Untuk uji manual endpoint terproteksi: login dulu lewat "Try it out" di `POST /api/auth/login` (JSON, tidak butuh Authorize), salin `access_token` dari respons, lalu panggil endpoint lain via `curl -H "Authorization: Bearer <token>"` atau lewat DevTools Console (`fetch(..., {headers: {Authorization: "Bearer <token>"}})`).

## Test

```bash
python -m tests.test_models         # import semua model + SELECT ke tiap tabel
python -m tests.test_user_service   # resolve_user_access() — custom vs department, door_number bukan door_id
python -m tests.test_csv_service    # upload CSV — satu test per aturan validasi
```

Semua test berjalan langsung ke database nyata (bukan mock/DB in-memory) — pastikan `.env` mengarah ke database yang boleh ditulisi, dan container MySQL sedang jalan.

## Tech Stack
- **Framework:** FastAPI
- **Database:** MySQL (SQLAlchemy 2.0, driver PyMySQL)
- **Auth:** JWT (python-jose) + bcrypt (verifikasi password langsung, bukan lewat passlib — lihat catatan di `app/auth/router.py`)
- **MQTT Client:** aiomqtt (disiapkan di config, belum dipakai — Sprint 3)

## Struktur Folder
```
backend/
├── app/
│   ├── main.py            # entrypoint FastAPI, daftar semua router
│   ├── config.py          # Settings (pydantic-settings), baca .env
│   ├── database.py        # engine, SessionLocal, Base, get_db()
│   ├── auth/               # JWT: create/verify token, login, dependency proteksi route
│   ├── models/              # SQLAlchemy models, 1 file per tabel — persis schema.sql
│   ├── schemas/             # Pydantic request/response schema per resource
│   ├── routes/              # endpoint REST per resource
│   └── services/            # business logic (resolusi akses, parsing CSV)
├── tests/
├── requirements.txt
└── .env.example
```

## Daftar Endpoint

Semua endpoint di bawah **wajib header `Authorization: Bearer <token>`**, kecuali yang ditandai publik.

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/api/auth/login` | **Publik.** Login (`username`, `password`) → JWT token |
| GET | `/api/auth/me` | Info admin dari token saat ini |
| GET | `/api/users` | List user (filter `search`, `department_id`; pagination `page`/`page_size`) |
| POST | `/api/users` | Buat user baru |
| PUT | `/api/users/{uid}` | Edit user (partial update) |
| DELETE | `/api/users/{uid}` | Hapus user |
| POST | `/api/users/upload-csv` | Upload CSV massal (`kartu,nama,department,doors`), lihat [tools/sample_users.csv](../tools/sample_users.csv) |
| GET | `/api/departments` | List department + jumlah user + `door_id` akses default |
| POST | `/api/departments` | Buat department |
| PUT | `/api/departments/{id}` | Edit + replace penuh akses default (`door_ids`) |
| DELETE | `/api/departments/{id}` | Hapus (cascade ke `department_access`, `users.department_id` jadi `NULL`) |
| GET | `/api/controllers` | List controller + `is_online` (dihitung dari `last_seen`, bukan kolom tersimpan) |
| GET | `/api/controllers/{id}/config` | Baca config controller |
| PUT | `/api/controllers/{id}/config` | Update config **di DB saja** — publish MQTT ke controller fisik: Sprint 3 |
| POST | `/api/controllers/{id}/sync` | **Stub 501** — sync atomik: Sprint 3 |
| GET | `/api/doors` | List pintu (filter opsional `controller_id`) |
| POST | `/api/doors` | Tambah pintu (`UNIQUE(controller_id, door_number)`) |
| PUT | `/api/doors/{id}` | Edit pintu |
| DELETE | `/api/doors/{id}` | Hapus pintu |
| GET | `/api/logs` | Baca `access_logs` (filter `kartu`, `controller_id`, `door_id`, `result`, `date_from`, `date_to`, `is_replayed`; pagination) — baris ditulis nanti oleh MQTT handler (Sprint 3) |
| GET | `/health` | **Publik.** Healthcheck |

Detail request/response tiap endpoint: lihat Swagger UI di `/docs` (skema request/response otomatis dari `app/schemas/`).
