# Schema request/response untuk endpoint department
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class DepartmentCreate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=100)
    deskripsi: Optional[str] = Field(default=None, max_length=255)


class DepartmentUpdate(BaseModel):
    nama: str = Field(..., min_length=1, max_length=100)
    deskripsi: Optional[str] = Field(default=None, max_length=255)
    door_ids: List[int] = Field(default_factory=list)  # replace penuh department_access


class DepartmentOut(BaseModel):
    id: int
    nama: str
    deskripsi: Optional[str]
    created_at: datetime
    updated_at: datetime
    user_count: int
    door_ids: List[int]  # default akses saat ini (door_id, bukan door_number — lihat penjelasan routes)
