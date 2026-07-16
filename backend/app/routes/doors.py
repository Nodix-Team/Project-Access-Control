# Route CRUD Pintu — assign ke controller, beri nama/lokasi
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database import get_db
from app.models.controller import Controller
from app.models.door import Door
from app.schemas.door import DoorCreate, DoorOut, DoorUpdate

# Semua route di sini wajib JWT (dependencies di level router)
router = APIRouter(prefix="/api/doors", tags=["doors"], dependencies=[Depends(get_current_admin)])


def _to_door_out(door: Door) -> DoorOut:
    return DoorOut(
        id=door.id,
        controller_id=door.controller_id,
        door_number=door.door_number,
        nama=door.nama,
        lokasi=door.lokasi,
    )


def _assert_controller_exists(db: Session, controller_id: int) -> None:
    if db.get(Controller, controller_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="controller_id tidak ditemukan"
        )


def _assert_door_number_unique(
    db: Session, controller_id: int, door_number: int, exclude_door_id: Optional[int] = None
) -> None:
    # UNIQUE(controller_id, door_number) — door_number cuma unik DALAM satu controller,
    # bukan lintas controller (dua controller boleh sama-sama punya "door_number 1")
    stmt = select(Door).where(Door.controller_id == controller_id, Door.door_number == door_number)
    if exclude_door_id is not None:
        stmt = stmt.where(Door.id != exclude_door_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"door_number {door_number} sudah dipakai di controller ini",
        )


@router.get("", response_model=List[DoorOut])
def list_doors(
    db: Session = Depends(get_db), controller_id: Optional[int] = None
) -> List[DoorOut]:
    stmt = select(Door).order_by(Door.controller_id, Door.door_number)
    if controller_id is not None:
        stmt = stmt.where(Door.controller_id == controller_id)
    doors = db.scalars(stmt).all()
    return [_to_door_out(door) for door in doors]


@router.post("", response_model=DoorOut, status_code=status.HTTP_201_CREATED)
def create_door(payload: DoorCreate, db: Session = Depends(get_db)) -> DoorOut:
    _assert_controller_exists(db, payload.controller_id)
    _assert_door_number_unique(db, payload.controller_id, payload.door_number)

    door = Door(
        controller_id=payload.controller_id,
        door_number=payload.door_number,
        nama=payload.nama,
        lokasi=payload.lokasi,
    )
    db.add(door)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"door_number {payload.door_number} sudah dipakai di controller ini",
        )
    db.refresh(door)
    return _to_door_out(door)


@router.put("/{door_id}", response_model=DoorOut)
def update_door(door_id: int, payload: DoorUpdate, db: Session = Depends(get_db)) -> DoorOut:
    door = db.get(Door, door_id)
    if door is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Door tidak ditemukan")

    updates = payload.model_dump(exclude_unset=True)

    new_controller_id = updates.get("controller_id", door.controller_id)
    new_door_number = updates.get("door_number", door.door_number)
    if "controller_id" in updates:
        _assert_controller_exists(db, new_controller_id)
    if "controller_id" in updates or "door_number" in updates:
        _assert_door_number_unique(db, new_controller_id, new_door_number, exclude_door_id=door_id)

    for field, value in updates.items():
        setattr(door, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"door_number {new_door_number} sudah dipakai di controller ini",
        )
    db.refresh(door)
    return _to_door_out(door)


@router.delete("/{door_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_door(door_id: int, db: Session = Depends(get_db)) -> None:
    door = db.get(Door, door_id)
    if door is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Door tidak ditemukan")

    # doors -> department_access / user_access sudah ON DELETE CASCADE (lihat app/models/door.py)
    db.delete(door)
    db.commit()
