# Schema request/response untuk endpoint user
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.utils.kartu import normalize_kartu


class UserCreate(BaseModel):
    kartu: str = Field(..., min_length=1, max_length=20)
    nama: str = Field(..., min_length=1, max_length=100)
    department_id: Optional[int] = None
    is_custom_access: bool = False

    @field_validator("kartu")
    @classmethod
    def _normalize_kartu(cls, value: str) -> str:
        return normalize_kartu(value)


class UserUpdate(BaseModel):
    # Semua field opsional -> hanya field yang dikirim yang di-update (lihat exclude_unset di routes/users.py)
    kartu: Optional[str] = Field(default=None, min_length=1, max_length=20)
    nama: Optional[str] = Field(default=None, min_length=1, max_length=100)
    department_id: Optional[int] = None
    is_custom_access: Optional[bool] = None
    # Daftar door_id akses custom - kalau dikirim, REPLACE PENUH user_access lama (pola sama
    # persis dengan DepartmentUpdate.door_ids). Cuma relevan kalau is_custom_access=True, tapi
    # tidak dipaksa harus dikirim bersamaan - caller (frontend) yang atur kombinasinya.
    door_ids: Optional[List[int]] = None

    @field_validator("kartu")
    @classmethod
    def _normalize_kartu(cls, value: Optional[str]) -> Optional[str]:
        return normalize_kartu(value) if value is not None else value


class UserOut(BaseModel):
    uid: int
    kartu: str
    nama: str
    department_id: Optional[int]
    is_custom_access: bool
    created_at: datetime
    updated_at: datetime
    access: Dict[str, List[int]] = Field(default_factory=dict)  # hasil resolve_user_access()


class UserListOut(BaseModel):
    items: List[UserOut]
    total: int
    page: int
    page_size: int


class CsvUploadRowError(BaseModel):
    row: int  # nomor baris fisik di file CSV (baris 1 = header)
    kartu: str
    reason: str


class CsvUploadResponse(BaseModel):
    success_count: int
    processed_kartu: List[str]
    error_count: int
    errors: List[CsvUploadRowError]
