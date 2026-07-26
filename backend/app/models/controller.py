# Model tabel `controllers` — data unit ESP32 (kredensial MQTT, config, status via last_seen).
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, Integer, SmallInteger, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.door import Door


class Controller(Base):
    __tablename__ = "controllers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)  # "ctrl-A", "ctrl-B"
    nama: Mapped[Optional[str]] = mapped_column(String(100))
    lokasi: Mapped[Optional[str]] = mapped_column(String(100))
    wifi_ssid: Mapped[Optional[str]] = mapped_column(String(50))
    mqtt_broker: Mapped[Optional[str]] = mapped_column(String(50))
    mqtt_port: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("1883"))
    mqtt_user: Mapped[Optional[str]] = mapped_column(String(50))
    total_doors: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("4"))
    heartbeat_s: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("30"))
    ip_mode: Mapped[Optional[str]] = mapped_column(
        Enum("dhcp", "static", name="controller_ip_mode"), server_default=text("'dhcp'")
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(15))
    web_port: Mapped[Optional[int]] = mapped_column(Integer, server_default=text("8081"))
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # v0.3.0 Sync & State Snapshot Fields
    sync_state: Mapped[str] = mapped_column(
        Enum("UNKNOWN", "IN_SYNC", "SYNC_PENDING", "SYNCING", "SYNC_ERROR_ATTENTION_REQUIRED", name="sync_state_enum"),
        nullable=False,
        default="UNKNOWN"
    )
    sync_fail_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_sync_error: Mapped[Optional[str]] = mapped_column(String(100))
    config_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    link_state: Mapped[str] = mapped_column(
        Enum("ONLINE", "OFFLINE", "UNKNOWN", name="link_state_enum"),
        nullable=False,
        default="UNKNOWN"
    )
    link_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    fw_version: Mapped[Optional[str]] = mapped_column(String(20))
    uptime_s: Mapped[Optional[int]] = mapped_column(Integer)
    rssi: Mapped[Optional[int]] = mapped_column(SmallInteger)
    free_heap: Mapped[Optional[int]] = mapped_column(Integer)
    total_users_reported: Mapped[Optional[int]] = mapped_column(Integer)
    tamper_state: Mapped[str] = mapped_column(
        Enum("OK", "TAMPER", "UNKNOWN", name="tamper_state_enum"),
        nullable=False,
        default="UNKNOWN"
    )
    fire_state: Mapped[str] = mapped_column(
        Enum("OK", "FIRE", "UNKNOWN", name="fire_state_enum"),
        nullable=False,
        default="UNKNOWN"
    )
    power_state: Mapped[str] = mapped_column(
        Enum("POWER_NORMAL", "POWER_LOW", "UNKNOWN", name="power_state_enum"),
        nullable=False,
        default="UNKNOWN"
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    doors: Mapped[List["Door"]] = relationship(back_populates="controller")
