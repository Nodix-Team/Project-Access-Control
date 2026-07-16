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
from app.ws.manager import manager

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

        # Snapshot nilai polos SEBELUM commit - expire_on_commit (default SessionLocal) bikin
        # atribut ORM (log_entry.id, user.nama, door.nama, ...) butuh SELECT ulang kalau diakses
        # SETELAH commit. Broadcast di bawah jadi pakai variabel ini, bukan objek ORM lagi.
        user_nama_snapshot = user.nama if user else None
        door_nama_snapshot = door.nama if door else None
        result_clean = result.strip()
        server_ts = datetime.now(timezone.utc)  # BACKEND sumber waktu, bukan device

        # Kartu tak dikenal TETAP disimpan (user_id=NULL) - invariant, jangan di-skip.
        log_entry = AccessLog(
            kartu=kartu,
            user_id=user.uid if user else None,
            user_nama=user_nama_snapshot,  # SNAPSHOT saat kejadian
            door_id=door.id if door else None,
            door_nama=door_nama_snapshot,  # SNAPSHOT saat kejadian
            controller_id=controller.id if controller else None,
            result=result_clean,
            reason=reason,
            server_ts=server_ts,
            device_uptime_ms=int(uptime_ms),
            is_replayed=False,
        )
        db.add(log_entry)
        db.flush()  # populate log_entry.id sebelum commit, untuk payload broadcast
        log_id = log_entry.id
        db.commit()

        manager.broadcast_threadsafe(
            {
                "id": log_id,
                "kartu": kartu,
                "user_nama": user_nama_snapshot,
                "door_nama": door_nama_snapshot,
                "controller": device_id,
                "result": result_clean,
                "reason": reason,
                # server_ts sudah timezone-aware (UTC) -> isoformat() keluar "...+00:00", bukan
                # "...Z". Ganti manual supaya sesuai kontrak frontend (UTC ISO8601 + akhiran Z).
                "server_ts": server_ts.isoformat().replace("+00:00", "Z"),
            }
        )
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
    # Import lokal: sync_service butuh app.mqtt.client (untuk publish), sedangkan client.py ->
    # subscriber.py -> handlers.py sudah memuat modul ini duluan - import di level modul di sini
    # akan membentuk lingkaran (client -> ... -> handlers -> sync_service -> client).
    from app.services import sync_service

    sync_service.on_sync_result(device_id, payload)


def handle_config_response(device_id: str, payload: str) -> None:
    pass  # TODO (04.6): forward config/response ke frontend
