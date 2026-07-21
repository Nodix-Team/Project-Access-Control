# Script verifikasi: import semua model SQLAlchemy + jalankan query SELECT sederhana ke DB nyata.
# Jalankan dari folder backend/: python -m tests.test_models
from sqlalchemy import func, select
from sqlalchemy.orm import configure_mappers

from app.database import SessionLocal
from app.models import (
    AccessLog,
    Admin,
    Controller,
    Department,
    DepartmentAccess,
    Door,
    User,
    UserAccess,
)

MODELS = [Admin, Controller, Door, Department, DepartmentAccess, User, UserAccess, AccessLog]


def test_import_and_configure_mappers():
    # Semua model harus ter-import & relationship()-nya berhasil di-resolve tanpa error
    configure_mappers()


def test_select_each_table():
    # SELECT COUNT(*) sederhana ke tiap tabel untuk memastikan koneksi + mapping kolom benar
    with SessionLocal() as db:
        for model in MODELS:
            count = db.scalar(select(func.count()).select_from(model))
            print(f"{model.__tablename__:20s} -> {count} baris")


if __name__ == "__main__":
    test_import_and_configure_mappers()
    print("Import & mapper configuration OK\n")
    test_select_each_table()
    print("\nSemua query SELECT berhasil dijalankan.")
