# Dockerfile aplikasi FastAPI — dipakai sebagai BAHAN ARTEFAK RILIS (KEPUTUSAN §7.6b),
# BUKAN pemicu deploy otomatis. CD v0.3 berhenti di "menghasilkan artefak"; pemasangan ke
# server tetap manual & terdokumentasi (§7.1b). Image ini di-build oleh release.yml saat tag v*.
#
# Build:  docker build -t access-control-backend:dev backend/
# Run:    docker run --env-file backend/.env -p 8000:8000 access-control-backend:dev
FROM python:3.13-slim

# Tidak menulis .pyc & output langsung ter-flush (log kelihatan real-time di container).
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependency dulu (layer cache): requirements jarang berubah dibanding kode.
# requirements.txt saja — dependency test/dev tidak ikut ke image produksi.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Baru salin kode aplikasi.
COPY app ./app

EXPOSE 8000

# Healthcheck memakai endpoint /health yang sudah ada (main.py) — mengembalikan status MQTT juga.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
