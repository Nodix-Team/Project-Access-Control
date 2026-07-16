# Route CRUD Controller + baca/push config + status online (dihitung, bukan disimpan)
from typing import List, NoReturn

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, literal_column, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database import get_db
from app.models.controller import Controller
from app.schemas.controller import ControllerConfigOut, ControllerConfigUpdate, ControllerOut

# Semua route di sini wajib JWT (dependencies di level router)
router = APIRouter(
    prefix="/api/controllers", tags=["controllers"], dependencies=[Depends(get_current_admin)]
)

# is_online = last_seen > NOW() - INTERVAL (heartbeat_s * 3) SECOND, dihitung ulang tiap query —
# lihat blok "is_online Dihitung, Bukan Disimpan" di architecture_proposal_v0.2.md
_seconds_since_last_seen = func.timestampdiff(
    literal_column("SECOND"), Controller.last_seen, func.now()
)
_is_online_expr = case(
    (Controller.last_seen.is_(None), False),
    (_seconds_since_last_seen < Controller.heartbeat_s * 3, True),
    else_=False,
).label("is_online")


def _to_controller_out(controller: Controller, is_online: bool) -> ControllerOut:
    return ControllerOut(
        id=controller.id,
        device_id=controller.device_id,
        nama=controller.nama,
        lokasi=controller.lokasi,
        ip_mode=controller.ip_mode,
        ip_address=controller.ip_address,
        total_doors=controller.total_doors,
        heartbeat_s=controller.heartbeat_s,
        web_port=controller.web_port,
        last_seen=controller.last_seen,
        created_at=controller.created_at,
        updated_at=controller.updated_at,
        is_online=bool(is_online),
    )


def _to_config_out(controller: Controller) -> ControllerConfigOut:
    return ControllerConfigOut(
        device_id=controller.device_id,
        nama=controller.nama,
        lokasi=controller.lokasi,
        wifi_ssid=controller.wifi_ssid,
        mqtt_broker=controller.mqtt_broker,
        mqtt_port=controller.mqtt_port,
        mqtt_user=controller.mqtt_user,
        total_doors=controller.total_doors,
        heartbeat_s=controller.heartbeat_s,
        ip_mode=controller.ip_mode,
        ip_address=controller.ip_address,
        web_port=controller.web_port,
    )


def _get_controller_or_404(db: Session, controller_id: int) -> Controller:
    controller = db.get(Controller, controller_id)
    if controller is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Controller tidak ditemukan"
        )
    return controller


@router.get("", response_model=List[ControllerOut])
def list_controllers(db: Session = Depends(get_db)) -> List[ControllerOut]:
    rows = db.execute(select(Controller, _is_online_expr).order_by(Controller.id)).all()
    return [_to_controller_out(controller, is_online) for controller, is_online in rows]


@router.get("/{controller_id}/config", response_model=ControllerConfigOut)
def get_controller_config(controller_id: int, db: Session = Depends(get_db)) -> ControllerConfigOut:
    controller = _get_controller_or_404(db, controller_id)
    return _to_config_out(controller)


@router.put("/{controller_id}/config", response_model=ControllerConfigOut)
def update_controller_config(
    controller_id: int, payload: ControllerConfigUpdate, db: Session = Depends(get_db)
) -> ControllerConfigOut:
    controller = _get_controller_or_404(db, controller_id)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(controller, field, value)

    db.commit()
    db.refresh(controller)

    # TODO (Sprint 3): publish config baru ke controller via MQTT topic `access/{device_id}/config/set`
    # (format CSV key,value, QoS 1) lewat backend/app/mqtt/publisher.py yang belum dibuat. Untuk
    # sekarang config HANYA ditulis ke DB — controller fisik tidak menerima update apa pun sampai
    # Sprint 3 (Backend MQTT + Sync Protocol) selesai.

    return _to_config_out(controller)


@router.post("/{controller_id}/sync", response_model=None)
def sync_controller(controller_id: int, db: Session = Depends(get_db)) -> NoReturn:
    # TODO (Sprint 3): implementasi protokol sync atomik (PRD 6.4) — kirim users/sync/start
    # (sync_id) -> users/set x N -> users/sync/end (count) via MQTT, tunggu sync/result (OK/
    # MISMATCH) dari controller. Butuh backend/app/mqtt/ (client, publisher, subscriber,
    # handlers) yang belum dibangun. Untuk sekarang stub 501 supaya kontrak endpoint sudah ada.
    _get_controller_or_404(db, controller_id)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Sync atomik belum diimplementasikan — lihat Sprint 3 (Backend MQTT + Sync Protocol)",
    )
