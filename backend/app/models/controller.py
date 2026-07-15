# Model tabel `controllers` — data unit ESP32 (kredensial MQTT, config, status via last_seen).
# is_online sengaja tidak disimpan sebagai kolom — dihitung saat query dari last_seen + MQTT LWT.
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, Integer, String, func, text
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
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # controllers -> doors (1:N). Tanpa ON DELETE eksplisit di schema.sql -> default RESTRICT
    # (controller tidak bisa dihapus selama masih punya doors terdaftar).
    doors: Mapped[List["Door"]] = relationship(back_populates="controller")
