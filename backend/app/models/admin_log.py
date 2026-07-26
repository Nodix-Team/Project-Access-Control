# Model tabel `admin_logs` — jejak audit aksi admin (RELAY_TEST, DOOR_CONFIG_UPDATE, dst).
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import BigInteger, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.dialects.mysql import DATETIME as MySQLDateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.admin import Admin


class AdminLog(Base):
    __tablename__ = "admin_logs"
    __table_args__ = (
        Index("idx_admlog_ts", "server_ts"),
        Index("idx_admlog_aksi_ts", "aksi", "server_ts"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    admin_id: Mapped[Optional[int]] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"))
    admin_username: Mapped[Optional[str]] = mapped_column(String(50))
    aksi: Mapped[str] = mapped_column(String(50), nullable=False)
    target: Mapped[Optional[str]] = mapped_column(String(100))
    detail: Mapped[Optional[dict]] = mapped_column(JSON)
    server_ts: Mapped[datetime] = mapped_column(MySQLDateTime(fsp=3), nullable=False)

    admin: Mapped[Optional["Admin"]] = relationship(viewonly=True)
