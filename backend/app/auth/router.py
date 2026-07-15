# Endpoint autentikasi — POST /api/auth/login
# TODO: implementasi login (verifikasi username/password admin, return JWT token)
from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])
