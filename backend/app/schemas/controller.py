# Schema request/response untuk endpoint controller
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ControllerOut(BaseModel):
    id: int
    device_id: str
    nama: Optional[str]
    lokasi: Optional[str]
    ip_mode: Optional[str]
    ip_address: Optional[str]
    total_doors: Optional[int]
    heartbeat_s: Optional[int]
    web_port: Optional[int]
    last_seen: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    is_online: bool  # dihitung tiap query dari last_seen, TIDAK disimpan di DB (lihat routes/controllers.py)


class ControllerConfigOut(BaseModel):
    device_id: str
    nama: Optional[str]
    lokasi: Optional[str]
    wifi_ssid: Optional[str]
    mqtt_broker: Optional[str]
    mqtt_port: Optional[int]
    mqtt_user: Optional[str]
    total_doors: Optional[int]
    heartbeat_s: Optional[int]
    ip_mode: Optional[str]
    ip_address: Optional[str]
    web_port: Optional[int]


class ControllerConfigUpdate(BaseModel):
    # Semua field opsional -> partial update (exclude_unset). Sengaja TIDAK ada field wifi_pass —
    # kolom itu memang tidak pernah disimpan di DB (lihat database/schema.sql), konsisten dengan
    # PRD: config/response tidak boleh membocorkan wifi_pass.
    nama: Optional[str] = Field(default=None, max_length=100)
    lokasi: Optional[str] = Field(default=None, max_length=100)
    wifi_ssid: Optional[str] = Field(default=None, max_length=50)
    mqtt_broker: Optional[str] = Field(default=None, max_length=50)
    mqtt_port: Optional[int] = None
    mqtt_user: Optional[str] = Field(default=None, max_length=50)
    total_doors: Optional[int] = None
    heartbeat_s: Optional[int] = None
    ip_mode: Optional[Literal["dhcp", "static"]] = None
    ip_address: Optional[str] = Field(default=None, max_length=15)
    web_port: Optional[int] = None
