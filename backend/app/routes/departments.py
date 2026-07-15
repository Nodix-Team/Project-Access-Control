# Route CRUD Department + set default akses (department_access)
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database import get_db
from app.models.department import Department
from app.models.department_access import DepartmentAccess
from app.models.door import Door
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate

# Semua route di sini wajib JWT (dependencies di level router)
router = APIRouter(
    prefix="/api/departments", tags=["departments"], dependencies=[Depends(get_current_admin)]
)


def _to_department_out(db: Session, department: Department) -> DepartmentOut:
    user_count = (
        db.scalar(select(func.count()).select_from(User).where(User.department_id == department.id))
        or 0
    )
    door_ids = db.scalars(
        select(DepartmentAccess.door_id).where(DepartmentAccess.department_id == department.id)
    ).all()
    return DepartmentOut(
        id=department.id,
        nama=department.nama,
        deskripsi=department.deskripsi,
        created_at=department.created_at,
        updated_at=department.updated_at,
        user_count=user_count,
        door_ids=sorted(door_ids),
    )


def _assert_doors_exist(db: Session, door_ids: List[int]) -> None:
    if not door_ids:
        return
    found = set(db.scalars(select(Door.id).where(Door.id.in_(door_ids))).all())
    missing = set(door_ids) - found
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"door_id tidak ditemukan: {sorted(missing)}",
        )


@router.get("", response_model=List[DepartmentOut])
def list_departments(db: Session = Depends(get_db)) -> List[DepartmentOut]:
    departments = db.scalars(select(Department).order_by(Department.id)).all()
    return [_to_department_out(db, department) for department in departments]


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)) -> DepartmentOut:
    if db.scalar(select(Department).where(Department.nama == payload.nama)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Nama department sudah dipakai"
        )

    department = Department(nama=payload.nama, deskripsi=payload.deskripsi)
    db.add(department)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Nama department sudah dipakai"
        )
    db.refresh(department)
    return _to_department_out(db, department)


@router.put("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)
) -> DepartmentOut:
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department tidak ditemukan"
        )

    if payload.nama != department.nama:
        if db.scalar(select(Department).where(Department.nama == payload.nama)) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Nama department sudah dipakai"
            )

    door_ids = sorted(set(payload.door_ids))
    _assert_doors_exist(db, door_ids)

    department.nama = payload.nama
    department.deskripsi = payload.deskripsi

    # Replace penuh: hapus semua department_access lama milik department ini, ganti total dengan yang baru
    db.execute(delete(DepartmentAccess).where(DepartmentAccess.department_id == department_id))
    for door_id in door_ids:
        db.add(DepartmentAccess(department_id=department_id, door_id=door_id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Nama department sudah dipakai"
        )
    db.refresh(department)
    return _to_department_out(db, department)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(department_id: int, db: Session = Depends(get_db)) -> None:
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department tidak ditemukan"
        )

    # ON DELETE CASCADE (department_access) & ON DELETE SET NULL (users.department_id) ditangani DB,
    # lihat passive_deletes=True di app/models/department.py
    db.delete(department)
    db.commit()
