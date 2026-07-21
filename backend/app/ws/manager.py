# Manajer koneksi WebSocket live feed. Log masuk diproses di thread paho (sync), sedangkan
# koneksi WS dikelola event loop asyncio FastAPI - menyeberang thread lewat
# asyncio.run_coroutine_threadsafe (loop utama disimpan saat lifespan startup, lihat main.py).
import asyncio
from typing import Optional, Set

from fastapi import WebSocket


class LiveFeedManager:
    def __init__(self) -> None:
        self._conns: Set[WebSocket] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._conns.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._conns.discard(ws)

    async def _broadcast(self, message: dict) -> None:
        dead = []
        for ws in list(self._conns):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    def broadcast_threadsafe(self, message: dict) -> None:
        # Dipanggil dari thread paho (handlers.py::handle_log). Jadwalkan ke event loop utama -
        # fire-and-forget (tidak menunggu hasil), supaya thread paho tidak pernah terblokir oleh
        # kirim WebSocket yang lambat/gagal.
        if self._loop is not None:
            asyncio.run_coroutine_threadsafe(self._broadcast(message), self._loop)


manager = LiveFeedManager()
