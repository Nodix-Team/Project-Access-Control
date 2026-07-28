# Business logic sync atomik ke controller (sync/start -> users/set x N -> sync/end -> sync/result).
# sync/result datang lewat handler MQTT (thread paho), sedangkan POST /sync menunggu di thread
# request FastAPI - dijembatani dengan threading.Event per sync_id (bukan asyncio, app ini sync).
import threading
import uuid
from typing import Dict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.controller import Controller
from app.models.user import User
from app.mqtt import client as mqtt_client
from app.services.user_service import resolve_user_access

_pending: Dict[str, dict] = {}  # sync_id -> {"event": Event, "result": Optional[tuple]}


def _publish(topic: str, payload: str, qos: int = 1) -> None:
    mqtt_client.client.publish(topic, payload, qos=qos)


def run_full_sync(db: Session, controller: Controller, max_retry: int = 2) -> dict:
    device_id = controller.device_id
    sync_id = ""
    count = 0
    status_final = "TIMEOUT"

    for _attempt in range(max_retry + 1):
        sync_id = uuid.uuid4().hex
        ev = threading.Event()
        _pending[sync_id] = {"event": ev, "result": None}

        _publish(f"access/{device_id}/users/sync/start", sync_id)

        # Kirim setiap user yang PUNYA akses di controller ini (device_id ini)
        count = 0
        for user in db.scalars(select(User)).all():
            doors = resolve_user_access(db, user.uid).get(device_id)
            if doors:
                payload = f"{user.kartu}," + "|".join(str(d) for d in doors)
                _publish(f"access/{device_id}/users/set", payload)
                count += 1

        _publish(f"access/{device_id}/users/sync/end", f"{sync_id},{count}")

        got = ev.wait(timeout=30)  # tunggu sync/result dari handler (thread paho)
        info = _pending.pop(sync_id, {})
        result = info.get("result")

        if not got or result is None:
            status_final = "TIMEOUT"
        elif result[0] == "OK":
            return {"sync_id": sync_id, "status": "OK", "count": count}
        else:
            status_final = "MISMATCH"  # controller pertahankan daftar lama - pintu tetap jalan

        # belum OK -> lanjut ke percobaan berikutnya (sync_id baru)

    return {"sync_id": sync_id, "status": "SYNC_FAILED", "last": status_final, "count": count}


def on_sync_result(device_id: str, payload: str) -> None:
    # Dipanggil dari handlers.py (thread paho). sync_id yang sudah di-pop (timeout/attempt lain)
    # sengaja diabaikan - hasil telat tidak boleh menimpa attempt yang sudah selesai/berikutnya.
    sync_id, *rest = payload.split(",")
    if sync_id in _pending:
        _pending[sync_id]["result"] = tuple(rest)  # ("OK", "N") atau ("MISMATCH", "n")
        _pending[sync_id]["event"].set()
