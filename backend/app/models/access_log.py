# Model tabel `access_logs` — log akses IMMUTABLE dengan snapshot user_nama & door_nama.
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.dialects.mysql import DATETIME as MySQLDateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.door import Door
    from app.models.user import User


class AccessLog(Base):
    __tablename__ = "access_logs"
    __table_args__ = (
        Index("idx_ts", "server_ts"),
        Index("idx_kartu_ts", "kartu", "server_ts"),
        Index("idx_ctrl_ts", "controller_id", "server_ts"),
        Index("idx_result_ts", "result", "server_ts"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    kartu: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Bisa NULL untuk REX / alarm
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.uid", ondelete="SET NULL"))
    user_nama: Mapped[Optional[str]] = mapped_column(String(100))  # SNAPSHOT saat kejadian
    door_id: Mapped[Optional[int]] = mapped_column(ForeignKey("doors.id", ondelete="SET NULL"))
    door_number: Mapped[Optional[int]] = mapped_column(Integer)    # SNAPSHOT nomor pintu lokal
    door_nama: Mapped[Optional[str]] = mapped_column(String(100))  # SNAPSHOT saat kejadian
    controller_id: Mapped[Optional[int]] = mapped_column(Integer)
    device_id: Mapped[Optional[str]] = mapped_column(String(50))    # SNAPSHOT device_id
    result: Mapped[str] = mapped_column(Enum("GRANTED", "DENIED", "ALARM", name="access_result"), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(50))
    server_ts: Mapped[datetime] = mapped_column(MySQLDateTime(fsp=3), nullable=False)  # UTC backend
    device_ts: Mapped[Optional[datetime]] = mapped_column(MySQLDateTime(fsp=3))       # RTC controller
    seq_id: Mapped[Optional[int]] = mapped_column(BigInteger)                         # 32-bit uint sequence ID
    device_uptime_ms: Mapped[Optional[int]] = mapped_column(BigInteger)
    is_replayed: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[Optional["User"]] = relationship(viewonly=True)
    door: Mapped[Optional["Door"]] = relationship(viewonly=True)
