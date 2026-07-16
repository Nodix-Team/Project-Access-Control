# Model tabel `department_access` — akses default per department (tabel jembatan department <-> door).
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.door import Door


class DepartmentAccess(Base):
    __tablename__ = "department_access"
    __table_args__ = (UniqueConstraint("department_id", "door_id", name="uk_dept_door"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id", ondelete="CASCADE"), nullable=False
    )
    door_id: Mapped[int] = mapped_column(ForeignKey("doors.id", ondelete="CASCADE"), nullable=False)

    department: Mapped["Department"] = relationship(back_populates="department_accesses")
    door: Mapped["Door"] = relationship(back_populates="department_accesses")
