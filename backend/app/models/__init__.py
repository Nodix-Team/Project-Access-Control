# Paket model SQLAlchemy — 1 file per tabel, sesuai docs/ERD_v0.2.md
# Import semua model di sini agar relationship() antar file ter-resolve saat mapper configure.
from app.models.access_log import AccessLog
from app.models.admin import Admin
from app.models.controller import Controller
from app.models.department import Department
from app.models.department_access import DepartmentAccess
from app.models.door import Door
from app.models.user import User
from app.models.user_access import UserAccess

__all__ = [
    "AccessLog",
    "Admin",
    "Controller",
    "Department",
    "DepartmentAccess",
    "Door",
    "User",
    "UserAccess",
]
