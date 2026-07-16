# Publish perubahan user (CRUD via REST) ke controller lewat MQTT.
# door_id TIDAK PERNAH keluar dari sini - payload disusun dari resolve_user_access() yang
# sudah menerjemahkan ke door_number lokal (lihat user_service.py). nama juga tidak pernah dikirim.
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.controller import Controller
from app.models.user import User
from app.mqtt import client as mqtt_client
from app.services.user_service import resolve_user_access

logger = logging.getLogger(__name__)


def publish(topic: str, payload: str, qos: int = 1) -> None:
    # Broker offline -> publish paho gagal/queue diam-diam. Route REST tetap harus balas
    # sukses untuk operasi DB-nya, jadi di sini cukup log warning, jangan lempar exception.
    if not mqtt_client.is_connected():
        logger.warning("MQTT tidak terhubung - publish ke %s kemungkinan tidak sampai: %r", topic, payload)
    try:
        mqtt_client.client.publish(topic, payload, qos=qos)
    except Exception:
        logger.exception("Gagal publish ke %s", topic)


def push_user(db: Session, user: User) -> None:
    by_ctrl = resolve_user_access(db, user.uid)  # {device_id: [door_number]}
    all_devices = [c.device_id for c in db.scalars(select(Controller)).all()]

    # Publish ke SEMUA controller, bukan cuma yang ada di hasil resolve. Kalau hanya iterasi
    # hasil resolve, controller yang aksesnya BARU DICABUT tidak dikirimi apa-apa -> kartu
    # tetap nyangkut di flash-nya -> akses tidak pernah benar-benar tercabut.
    for device_id in all_devices:
        doors = by_ctrl.get(device_id)
        if doors:
            payload = f"{user.kartu}," + "|".join(str(d) for d in doors)
            publish(f"access/{device_id}/users/set", payload)
        else:
            publish(f"access/{device_id}/users/delete", user.kartu)


def push_delete(kartu: str, device_ids) -> None:
    for device_id in device_ids:
        publish(f"access/{device_id}/users/delete", kartu)  # idempoten di controller
