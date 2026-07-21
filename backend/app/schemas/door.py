# Schema request/response untuk endpoint door
from typing import Optional

from pydantic import BaseModel, Field


class DoorCreate(BaseModel):
    controller_id: int
    door_number: int = Field(..., ge=1)
    nama: Optional[str] = Field(default=None, max_length=100)
    lokasi: Optional[str] = Field(default=None, max_length=100)


class DoorUpdate(BaseModel):
    # Semua field opsional -> partial update (exclude_unset)
    controller_id: Optional[int] = None
    door_number: Optional[int] = Field(default=None, ge=1)
    nama: Optional[str] = Field(default=None, max_length=100)
    lokasi: Optional[str] = Field(default=None, max_length=100)


class DoorOut(BaseModel):
    id: int
    controller_id: int
    door_number: int
    nama: Optional[str]
    lokasi: Optional[str]
