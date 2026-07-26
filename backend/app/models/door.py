# Model tabel `doors` — pintu, terhubung ke controller lewat door_number LOKAL (bukan doors.id).
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
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
    controller_id: Mapped[int] = mapped_column(ForeignKey("controllers.id"), nullable=False)
    door_number: Mapped[int] = mapped_column(Integer, nullable=False)  # nomor pintu lokal (1-N)
    nama: Mapped[Optional[str]] = mapped_column(String(100))
    lokasi: Mapped[Optional[str]] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    open_timeout_s: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    held_timeout_s: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    alarm_duration_s: Mapped[int] = mapped_column(Integer, nullable=False, default=30)

    controller: Mapped["Controller"] = relationship(back_populates="doors")

    department_accesses: Mapped[List["DepartmentAccess"]] = relationship(
        back_populates="door", cascade="all, delete-orphan", passive_deletes=True
    )
    user_accesses: Mapped[List["UserAccess"]] = relationship(
        back_populates="door", cascade="all, delete-orphan", passive_deletes=True
    )
