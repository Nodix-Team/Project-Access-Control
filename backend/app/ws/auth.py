# Validasi token untuk koneksi WebSocket. Browser tidak bisa mengirim header Authorization saat
# handshake WS, jadi token lewat query param ?token=. AUTH_ENABLED masih False (config.py) - kalau
# nanti diaktifkan, /ws/live-feed langsung terproteksi tanpa ubah endpoint apa pun. WS yang lupa
# diautentikasi = seluruh log akses gedung bocor ke siapa saja yang tahu URL-nya.
from fastapi import WebSocket
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import decode_access_token
from app.config import settings
from app.models.admin import Admin


def is_ws_authorized(ws: WebSocket, db: Session) -> bool:
    if not settings.AUTH_ENABLED:
        return True

    token = ws.query_params.get("token")
    if not token:
        return False

    try:
        payload = decode_access_token(token)
    except JWTError:
        return False

    username = payload.get("sub")
    if username is None:
        return False

    return db.scalar(select(Admin).where(Admin.username == username)) is not None
