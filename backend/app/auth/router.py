# Endpoint autentikasi — POST /api/auth/login, GET /api/auth/me (contoh route terproteksi)
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.auth.jwt import create_access_token
from app.database import get_db
from app.models.admin import Admin
from app.schemas.auth import AdminOut, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    admin = db.scalar(select(Admin).where(Admin.username == payload.username))
    if admin is None or not bcrypt.checkpw(
        payload.password.encode("utf-8"), admin.password.encode("utf-8")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
        )

    access_token = create_access_token(data={"sub": admin.username, "role": admin.role})
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=AdminOut)
def get_me(current_admin: Admin = Depends(get_current_admin)) -> Admin:
    # Contoh route terproteksi: wajib JWT header, dependency get_current_admin yang memverifikasi
    return current_admin
