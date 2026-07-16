# Handler pesan masuk dari controller (log akses, heartbeat, LWT, sync/result, config/response).
# Dipanggil oleh subscriber.py setelah topic diparse jadi (device_id, suffix). Sengaja tanpa
# publish/resolusi akses apa pun di sini - itu bagian langkah 04.3+.
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.database import SessionLocal
from app.models.access_log import AccessLog
from app.models.controller import Controller
from app.models.door import Door
from app.models.user import User
from app.utils.kartu import normalize_kartu

logger = logging.getLogger(__name__)

VALID_REASONS = {"OK", "UNKNOWN_CARD", "NO_ACCESS", "INVALID_DOOR"}


def handle_log(device_id: str, payload: str) -> None:
    parts = payload.split(",")

    # Kontrak target: 5 field (dengan reason). Fallback 4 field selama firmware belum
    # menambah reason - supaya langkah ini bisa dites sekarang dengan simulate_esp32.py.
    if len(parts) == 5:
        kartu_raw, door_number, result, reason, uptime_ms = parts
        reason = reason.strip()
        if reason not in VALID_REASONS:
            logger.warning("reason tak dikenal: %r (device %s)", reason, device_id)
    elif len(parts) == 4:
        kartu_raw, door_number, result, uptime_ms = parts
        reason = None  # firmware belum kirim reason
    else:
        logger.warning("log %s: %d field (harap 4/5) - ditolak", device_id, len(parts))
        return

    kartu = normalize_kartu(kartu_raw.strip())

    db = SessionLocal()
    try:
        controller = db.scalar(select(Controller).where(Controller.device_id == device_id))
        door = None
        if controller:
            door = db.scalar(
                select(Door).where(
                    Door.controller_id == controller.id,
                    Door.door_number == int(door_number),
                )
            )
        user = db.scalar(select(User).where(User.kartu == kartu))

        # Kartu tak dikenal TETAP disimpan (user_id=NULL) - invariant, jangan di-skip.
        db.add(
            AccessLog(
                kartu=kartu,
                user_id=user.uid if user else None,
                user_nama=user.nama if user else None,  # SNAPSHOT saat kejadian
                door_id=door.id if door else None,
                door_nama=door.nama if door else None,  # SNAPSHOT saat kejadian
                controller_id=controller.id if controller else None,
                result=result.strip(),
                reason=reason,
                server_ts=datetime.now(timezone.utc),  # BACKEND sumber waktu, bukan device
                device_uptime_ms=int(uptime_ms),
                is_replayed=False,
            )
        )
        db.commit()
    finally:
        db.close()


def handle_status(device_id: str, payload: str) -> None:
    # Format: {total_doors},{user_count},{free_heap},{uptime_ms}
    total_doors, user_count, free_heap, uptime_ms = payload.split(",")
    db = SessionLocal()
    try:
        controller = db.scalar(select(Controller).where(Controller.device_id == device_id))
        if controller:
            controller.last_seen = datetime.now(timezone.utc)
            db.commit()
        # user_count bisa dibandingkan ke jumlah user ter-resolve device ini -> drift check,
        # ditunda (opsional, bukan scope langkah ini).
    finally:
        db.close()


def handle_lwt(device_id: str, payload: str) -> None:
    # is_online dihitung dari last_seen (routes/controllers.py) - LWT cukup di-log untuk sekarang.
    logger.info("LWT %s -> %s", device_id, payload)


def handle_sync_result(device_id: str, payload: str) -> None:
    pass  # TODO (04.4): protokol sync atomik (OK/MISMATCH)


def handle_config_response(device_id: str, payload: str) -> None:
    pass  # TODO (04.6): forward config/response ke frontend
