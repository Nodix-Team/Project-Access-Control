# Route GET logs + filter (kartu, controller, door, tanggal, result, is_replayed)
# Nama diambil dari kolom snapshot (user_nama, door_nama) di access_logs — TIDAK PERNAH JOIN ke
# users/doors, karena kartu bisa di-assign ulang ke orang lain dan riwayat harus tetap utuh
# (lihat blok "Mengapa Log Menyimpan Snapshot Nama" di architecture_proposal_v0.2.md).
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database import get_db
from app.models.access_log import AccessLog
from app.schemas.log import AccessLogListOut, AccessLogOut

# Semua route di sini wajib JWT (dependencies di level router)
router = APIRouter(prefix="/api/logs", tags=["logs"], dependencies=[Depends(get_current_admin)])


@router.get("", response_model=AccessLogListOut)
def list_logs(
    db: Session = Depends(get_db),
    kartu: Optional[str] = Query(default=None),
    controller_id: Optional[int] = Query(default=None),
    door_id: Optional[int] = Query(default=None),
    result: Optional[Literal["GRANTED", "DENIED"]] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None, description="server_ts >= date_from"),
    date_to: Optional[datetime] = Query(default=None, description="server_ts <= date_to"),
    is_replayed: Optional[bool] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
) -> AccessLogListOut:
    # SELECT AccessLog murni, tanpa .join() apa pun — nama ambil dari kolom snapshot bawaannya sendiri
    base_stmt = select(AccessLog)
    if kartu:
        base_stmt = base_stmt.where(AccessLog.kartu == kartu)  # ditopang idx_kartu_ts
    if controller_id is not None:
        base_stmt = base_stmt.where(AccessLog.controller_id == controller_id)  # ditopang idx_ctrl_ts
    if door_id is not None:
        base_stmt = base_stmt.where(AccessLog.door_id == door_id)
    if result is not None:
        base_stmt = base_stmt.where(AccessLog.result == result)
    if date_from is not None:
        base_stmt = base_stmt.where(AccessLog.server_ts >= date_from)  # ditopang idx_ts
    if date_to is not None:
        base_stmt = base_stmt.where(AccessLog.server_ts <= date_to)
    if is_replayed is not None:
        base_stmt = base_stmt.where(AccessLog.is_replayed == is_replayed)

    total = db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0

    # server_ts DESC (log terbaru dulu) -> kombinasi WHERE + ORDER BY ini yang dirancang untuk
    # dilayani idx_ts / idx_kartu_ts / idx_ctrl_ts (composite index, server_ts jadi kolom kedua)
    paged_stmt = (
        base_stmt.order_by(AccessLog.server_ts.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    logs = db.scalars(paged_stmt).all()

    return AccessLogListOut(
        items=[AccessLogOut.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
    )
