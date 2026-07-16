# Business logic user — resolusi akses (user_access vs department_access)
# door_id TIDAK PERNAH keluar dari sini — hanya door_number lokal yang dikembalikan.
# Query JOIN persis mengikuti blok "Aturan Kritis: Penomoran Pintu" di architecture_proposal_v0.2.md.
from typing import Dict, List, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.controller import Controller
from app.models.department_access import DepartmentAccess
from app.models.door import Door
from app.models.user import User
from app.models.user_access import UserAccess


def _custom_access_stmt(user_id: int):
    return (
        select(Controller.device_id, Door.door_number)
        .select_from(UserAccess)
        .join(Door, Door.id == UserAccess.door_id)
        .join(Controller, Controller.id == Door.controller_id)
        .where(UserAccess.user_id == user_id)
    )


def _department_access_stmt(department_id: int):
    return (
        select(Controller.device_id, Door.door_number)
        .select_from(DepartmentAccess)
        .join(Door, Door.id == DepartmentAccess.door_id)
        .join(Controller, Controller.id == Door.controller_id)
        .where(DepartmentAccess.department_id == department_id)
    )


def _group_by_controller(rows: Sequence[Tuple[str, int]]) -> Dict[str, List[int]]:
    grouped: Dict[str, List[int]] = {}
    for device_id, door_number in rows:
        grouped.setdefault(device_id, []).append(door_number)
    for door_numbers in grouped.values():
        door_numbers.sort()
    return grouped


def resolve_user_access(db: Session, user_id: int) -> Dict[str, List[int]]:
    # PRD 6.5: is_custom_access TRUE -> user_access; FALSE + punya department_id -> department_access; selain itu kosong
    user = db.get(User, user_id)
    if user is None:
        return {}

    if user.is_custom_access:
        rows = db.execute(_custom_access_stmt(user_id)).all()
    elif user.department_id is not None:
        rows = db.execute(_department_access_stmt(user.department_id)).all()
    else:
        return {}

    return _group_by_controller(rows)
