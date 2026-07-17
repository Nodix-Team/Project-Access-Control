# Dependency FastAPI untuk proteksi route — wajib JWT header di semua route kecuali login
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.database import get_db
from app.models.admin import Admin

security_scheme = HTTPBearer()


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme), db: Session = Depends(get_db)
) -> Admin:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau kadaluarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise credentials_exception

    username = payload.get("sub")
    if username is None:
        raise credentials_exception

    admin = db.scalar(select(Admin).where(Admin.username == username))
    if admin is None:
        raise credentials_exception

    return admin
