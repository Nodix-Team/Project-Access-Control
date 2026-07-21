# Model tabel `access_logs` — log akses IMMUTABLE dengan snapshot user_nama & door_nama.
# Riwayat tidak boleh berubah meski user/door dimodifikasi atau dihapus kemudian (lihat ERD_v0.2.md).
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
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    kartu: Mapped[str] = mapped_column(String(20), nullable=False)
    # ON DELETE SET NULL -> log tetap ada walau user dihapus, snapshot user_nama tetap terbaca.
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.uid", ondelete="SET NULL"))
    user_nama: Mapped[Optional[str]] = mapped_column(String(100))  # SNAPSHOT saat kejadian
    # ON DELETE SET NULL -> log tetap ada walau door dihapus, snapshot door_nama tetap terbaca.
    door_id: Mapped[Optional[int]] = mapped_column(ForeignKey("doors.id", ondelete="SET NULL"))
    door_nama: Mapped[Optional[str]] = mapped_column(String(100))  # SNAPSHOT saat kejadian
    # Sengaja BUKAN foreign key (lihat ERD_v0.2.md) -> log tetap tercatat walau controller dihapus.
    controller_id: Mapped[Optional[int]] = mapped_column(Integer)
    result: Mapped[str] = mapped_column(Enum("GRANTED", "DENIED", "ALARM", name="access_result"), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(50))  # e.g., 'Valid Access', 'Door Forced Open'
    server_ts: Mapped[datetime] = mapped_column(MySQLDateTime(fsp=3), nullable=False)  # otoritatif, dari backend
    device_uptime_ms: Mapped[Optional[int]] = mapped_column(BigInteger)  # hanya untuk diagnosa
    is_replayed: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationship SATU ARAH saja (log -> user / log -> door), tanpa back_populates ke User/Door.
    # Ini disengaja: User dan Door tidak punya koleksi balik ke AccessLog, supaya penghapusan
    # user/door lewat ORM tidak pernah mencoba meng-cascade/menyentuh baris log immutable ini.
    # Penghapusan tetap aman karena FK di DB memakai ON DELETE SET NULL (bukan CASCADE).
    user: Mapped[Optional["User"]] = relationship(viewonly=True)
    door: Mapped[Optional["Door"]] = relationship(viewonly=True)
