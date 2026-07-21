# Model tabel `admins` — akun admin untuk login web app (autentikasi JWT).
# Berdiri sendiri tanpa relasi ke tabel lain (lihat docs/ERD_v0.2.md).
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)  # bcrypt hash
    role: Mapped[str] = mapped_column(
        Enum("admin", name="admin_role"), server_default=text("'admin'")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
