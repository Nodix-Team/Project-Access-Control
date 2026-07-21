# Model tabel `user_access` — akses custom per user (dipakai jika is_custom_access = TRUE).
# Tabel jembatan user <-> door, lihat PRD 6.5 (logika resolusi hak akses).
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.door import Door
    from app.models.user import User


class UserAccess(Base):
    __tablename__ = "user_access"
    __table_args__ = (UniqueConstraint("user_id", "door_id", name="uk_user_door"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.uid", ondelete="CASCADE"), nullable=False
    )
    door_id: Mapped[int] = mapped_column(ForeignKey("doors.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="accesses")
    door: Mapped["Door"] = relationship(back_populates="user_accesses")
