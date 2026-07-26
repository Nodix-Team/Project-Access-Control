# Model tabel `controller_events` — kejadian NON-akses (TAMPER, FIRE, POWER, AUX, SYNC, SYSTEM).
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, Index, Integer, String, func
from sqlalchemy.dialects.mysql import DATETIME as MySQLDateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ControllerEvent(Base):
    __tablename__ = "controller_events"
    __table_args__ = (
        Index("idx_ev_ctrl_ts", "controller_id", "server_ts"),
        Index("idx_ev_type_ts", "event_type", "server_ts"),
        Index("idx_ev_sev_ts", "severity", "server_ts"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    controller_id: Mapped[Optional[int]] = mapped_column(Integer)
    device_id: Mapped[str] = mapped_column(String(50), nullable=False)
    event_type: Mapped[str] = mapped_column(
        Enum("TAMPER", "FIRE", "POWER", "AUX", "SYNC", "SYSTEM", name="event_type_enum"),
        nullable=False
    )
    event_code: Mapped[str] = mapped_column(String(40), nullable=False)
    severity: Mapped[str] = mapped_column(
        Enum("INFO", "WARNING", "ALARM", name="event_severity_enum"),
        nullable=False,
        default="INFO"
    )
    door_number: Mapped[Optional[int]] = mapped_column(Integer)
    detail: Mapped[Optional[str]] = mapped_column(String(255))
    server_ts: Mapped[datetime] = mapped_column(MySQLDateTime(fsp=3), nullable=False)
    device_ts: Mapped[Optional[datetime]] = mapped_column(MySQLDateTime(fsp=3))
    is_replayed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
