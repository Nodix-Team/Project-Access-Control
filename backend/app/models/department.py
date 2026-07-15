# Model tabel `departments` — grup user untuk akses default (lihat department_access.py).
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.department_access import DepartmentAccess
    from app.models.user import User


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)  # "IT", "HRD", "Security"
    deskripsi: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # departments -> department_access (1:N, ON DELETE CASCADE di schema.sql)
    department_accesses: Mapped[List["DepartmentAccess"]] = relationship(
        back_populates="department", cascade="all, delete-orphan", passive_deletes=True
    )
    # departments -> users (1:N, ON DELETE SET NULL di schema.sql)
    users: Mapped[List["User"]] = relationship(back_populates="department", passive_deletes=True)
