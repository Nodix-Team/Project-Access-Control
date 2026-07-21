# Schema request/response untuk endpoint access logs
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class AccessLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kartu: str
    user_id: Optional[int]
    user_nama: Optional[str]  # SNAPSHOT saat kejadian, bukan hasil JOIN ke users
    door_id: Optional[int]
    door_nama: Optional[str]  # SNAPSHOT saat kejadian, bukan hasil JOIN ke doors
    controller_id: Optional[int]
    result: str
    reason: Optional[str]
    server_ts: datetime
    device_uptime_ms: Optional[int]
    is_replayed: bool
    created_at: datetime


class AccessLogListOut(BaseModel):
    items: List[AccessLogOut]
    total: int
    page: int
    page_size: int
