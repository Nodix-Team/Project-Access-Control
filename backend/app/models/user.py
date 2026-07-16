# Model tabel `users` — pemegang kartu RFID. PK bernama `uid` (bukan `id`), sesuai schema.sql.
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.user_access import UserAccess


class User(Base):
    __tablename__ = "users"

    uid: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kartu: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    nama: Mapped[str] = mapped_column(String(100), nullable=False)
    department_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL")
    )
    is_custom_access: Mapped[bool] = mapped_column(Boolean, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    department: Mapped[Optional["Department"]] = relationship(back_populates="users")

    # users -> user_access (1:N, ON DELETE CASCADE di schema.sql) — logika resolusi akses
    # custom (is_custom_access = TRUE) dibaca dari sini, lihat PRD 6.5.
    accesses: Mapped[List["UserAccess"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

    # Sengaja TIDAK ada relationship ke AccessLog di sini (lihat access_log.py) —
    # access_logs bersifat immutable, tidak boleh ikut ter-cascade lewat penghapusan user.
