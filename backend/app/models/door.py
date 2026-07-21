# Model tabel `doors` — pintu, terhubung ke controller lewat door_number LOKAL (bukan doors.id).
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.controller import Controller
    from app.models.department_access import DepartmentAccess
    from app.models.user_access import UserAccess


class Door(Base):
    __tablename__ = "doors"
    __table_args__ = (UniqueConstraint("controller_id", "door_number", name="uk_ctrl_door"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Tanpa ON DELETE eksplisit di schema.sql -> default RESTRICT.
    controller_id: Mapped[int] = mapped_column(ForeignKey("controllers.id"), nullable=False)
    door_number: Mapped[int] = mapped_column(Integer, nullable=False)  # nomor pintu lokal (1-N)
    nama: Mapped[Optional[str]] = mapped_column(String(100))
    lokasi: Mapped[Optional[str]] = mapped_column(String(100))

    controller: Mapped["Controller"] = relationship(back_populates="doors")

    # doors -> department_access (1:N, ON DELETE CASCADE di schema.sql)
    department_accesses: Mapped[List["DepartmentAccess"]] = relationship(
        back_populates="door", cascade="all, delete-orphan", passive_deletes=True
    )
    # doors -> user_access (1:N, ON DELETE CASCADE di schema.sql)
    user_accesses: Mapped[List["UserAccess"]] = relationship(
        back_populates="door", cascade="all, delete-orphan", passive_deletes=True
    )

    # Sengaja TIDAK ada relationship ke AccessLog di sini (lihat access_log.py) —
    # access_logs bersifat immutable, tidak boleh ikut ter-cascade lewat penghapusan door.
