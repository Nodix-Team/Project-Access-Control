# Route CRUD User + upload CSV massal
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_admin
from app.database import get_db
from app.models.department import Department
from app.models.door import Door
from app.models.user import User
from app.models.user_access import UserAccess
from app.mqtt.publisher import push_delete, push_user
from app.schemas.user import (
    CsvUploadResponse,
    CsvUploadRowError,
    UserCreate,
    UserListOut,
    UserOut,
    UserUpdate,
)
from app.services.csv_service import CsvFormatError, process_user_csv
from app.services.user_service import resolve_user_access

# Semua route di sini wajib JWT (dependencies di level router)
router = APIRouter(prefix="/api/users", tags=["users"], dependencies=[Depends(get_current_admin)])


def _to_user_out(db: Session, user: User) -> UserOut:
    return UserOut(
        uid=user.uid,
        kartu=user.kartu,
        nama=user.nama,
        department_id=user.department_id,
        is_custom_access=user.is_custom_access,
        created_at=user.created_at,
        updated_at=user.updated_at,
        access=resolve_user_access(db, user.uid),
    )


def _assert_department_exists(db: Session, department_id: Optional[int]) -> None:
    if department_id is not None and db.get(Department, department_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="department_id tidak ditemukan"
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


@router.get("", response_model=UserListOut)
def list_users(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(default=None, description="Cari di kolom kartu atau nama"),
    department_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> UserListOut:
    base_stmt = select(User)
    if search:
        like = f"%{search}%"
        base_stmt = base_stmt.where((User.kartu.ilike(like)) | (User.nama.ilike(like)))
    if department_id is not None:
        base_stmt = base_stmt.where(User.department_id == department_id)

    total = db.scalar(select(func.count()).select_from(base_stmt.subquery())) or 0

    paged_stmt = base_stmt.order_by(User.uid).offset((page - 1) * page_size).limit(page_size)
    users = db.scalars(paged_stmt).all()

    return UserListOut(
        items=[_to_user_out(db, user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{uid}", response_model=UserOut)
def get_user(uid: int, db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, uid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    return _to_user_out(db, user)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    if db.scalar(select(User).where(User.kartu == payload.kartu)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kartu sudah terdaftar")
    _assert_department_exists(db, payload.department_id)

    user = User(
        kartu=payload.kartu,
        nama=payload.nama,
        department_id=payload.department_id,
        is_custom_access=payload.is_custom_access,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kartu sudah terdaftar")
    db.refresh(user)
    push_user(db, user)
    return _to_user_out(db, user)


@router.put("/{uid}", response_model=UserOut)
def update_user(uid: int, payload: UserUpdate, db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, uid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    updates = payload.model_dump(exclude_unset=True)
    if "kartu" in updates and updates["kartu"] != user.kartu:
        if db.scalar(select(User).where(User.kartu == updates["kartu"])) is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kartu sudah terdaftar")
    if "department_id" in updates:
        _assert_department_exists(db, updates["department_id"])

    # door_ids BUKAN kolom di model User (beda dari field lain di sini) - jangan ikut setattr
    # generik di bawah, tangani terpisah sebagai replace penuh user_access (pola sama persis
    # dengan DepartmentUpdate.door_ids di routes/departments.py).
    door_ids = updates.pop("door_ids", None)
    if door_ids is not None:
        door_ids = sorted(set(door_ids))
        _assert_doors_exist(db, door_ids)

    for field, value in updates.items():
        setattr(user, field, value)

    if door_ids is not None:
        db.execute(delete(UserAccess).where(UserAccess.user_id == uid))
        for door_id in door_ids:
            db.add(UserAccess(user_id=uid, door_id=door_id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Kartu sudah terdaftar")
    db.refresh(user)
    push_user(db, user)  # akses bisa berubah (kartu, department_id, is_custom_access, door_ids)
    return _to_user_out(db, user)


@router.delete("/{uid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(uid: int, db: Session = Depends(get_db)) -> None:
    user = db.get(User, uid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")

    # Kumpulkan controller terdampak SEBELUM baris user hilang - resolve_user_access butuh user.uid.
    device_ids = list(resolve_user_access(db, user.uid).keys())
    kartu = user.kartu

    db.delete(user)
    db.commit()
    push_delete(kartu, device_ids)


@router.post("/upload-csv", response_model=CsvUploadResponse)
async def upload_users_csv(
    file: UploadFile = File(...), db: Session = Depends(get_db)
) -> CsvUploadResponse:
    raw = await file.read()
    try:
        content = raw.decode("utf-8-sig")  # utf-8-sig -> BOM dari Excel tidak merusak nama kolom header
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File harus teks UTF-8 (.csv)")

    try:
        result = process_user_csv(db, content)
    except CsvFormatError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return CsvUploadResponse(
        success_count=result.success_count,
        processed_kartu=result.processed_kartu,
        error_count=len(result.errors),
        errors=[
            CsvUploadRowError(row=err.row_number, kartu=err.kartu, reason=err.reason)
            for err in result.errors
        ],
    )
