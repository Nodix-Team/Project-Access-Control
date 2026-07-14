# Backend — FastAPI

## Setup (Belum Diimplementasi)

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
cp .env.example .env     # Edit konfigurasi
uvicorn app.main:app --reload
```

## Tech Stack
- **Framework:** FastAPI
- **Database:** MySQL (SQLAlchemy)
- **MQTT Client:** aiomqtt
- **Auth:** JWT (python-jose + bcrypt)

## Struktur Folder
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI entrypoint
│   ├── config.py          # Settings / env
│   ├── auth/              # JWT authentication
│   ├── models/            # SQLAlchemy models
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   └── mqtt/              # MQTT client handler
├── tests/
├── requirements.txt
└── .env.example
```
