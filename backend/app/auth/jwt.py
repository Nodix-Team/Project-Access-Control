# Utility pembuatan & verifikasi JWT token (python-jose), secret/algorithm/expire dari config
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import jwt

from app.config import settings


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    # Melempar jose.JWTError jika token invalid, signature salah, atau sudah kadaluarsa
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
