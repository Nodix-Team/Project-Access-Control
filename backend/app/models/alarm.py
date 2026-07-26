# Model tabel `alarms` — antrian alarm aktif & status acknowledge admin (§4.2).
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.mysql import DATETIME as MySQLDateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.admin import Admin


class Alarm(Base):
    __tablename__ = "alarms"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uk_alarm_source"),
        Index("idx_alarm_open", "acked_at", "raised_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(
        Enum("ACCESS_LOG", "CONTROLLER_EVENT", name="alarm_source_enum"),
        nullable=False
    )
    source_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    controller_id: Mapped[Optional[int]] = mapped_column(Integer)
    device_id: Mapped[str] = mapped_column(String(50), nullable=False)
    door_number: Mapped[Optional[int]] = mapped_column(Integer)
    alarm_code: Mapped[str] = mapped_column(String(40), nullable=False)
    raised_at: Mapped[datetime] = mapped_column(MySQLDateTime(fsp=3), nullable=False)
    cleared_at: Mapped[Optional[datetime]] = mapped_column(MySQLDateTime(fsp=3))
    acked_at: Mapped[Optional[datetime]] = mapped_column(MySQLDateTime(fsp=3))
    acked_by: Mapped[Optional[int]] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"))
    ack_note: Mapped[Optional[str]] = mapped_column(String(255))

    admin: Mapped[Optional["Admin"]] = relationship(viewonly=True)
