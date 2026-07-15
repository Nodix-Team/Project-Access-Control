# Test process_user_csv() — satu test per aturan validasi CSV upload user
# Jalankan dari folder backend/: python -m tests.test_csv_service
from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User
from app.models.user_access import UserAccess
from app.services.csv_service import CsvFormatError, process_user_csv

HEADER = "kartu,nama,department,doors"


def _cleanup(db) -> None:
    # Semua kartu test dipakai dengan prefix CSVTEST supaya gampang dibersihkan tanpa
    # menyentuh data seed asli.
    users = db.scalars(select(User).where(User.kartu.like("CSVTEST%"))).all()
    for user in users:
        db.delete(user)
    db.commit()


def test_header_salah_tolak_seluruh_file():
    with SessionLocal() as db:
        _cleanup(db)
        content = "kartu,nama,dept,doors\nCSVTEST01,Test User,,\n"
        try:
            process_user_csv(db, content)
            assert False, "harusnya CsvFormatError"
        except CsvFormatError:
            pass

        # Pastikan tidak ada baris yang sempat masuk DB meski headernya salah
        user = db.scalar(select(User).where(User.kartu == "CSVTEST01"))
        assert user is None, "header salah harus menolak SELURUH file, tidak ada baris yang diproses"


def test_nama_mengandung_koma_tolak_seluruh_file():
    with SessionLocal() as db:
        _cleanup(db)
        # nama dikutip dengan tanda kutip CSV supaya koma di dalamnya tetap 1 kolom valid secara
        # sintaks CSV, tapi tetap dilarang oleh aturan bisnis "nama tidak boleh mengandung koma"
        content = f'{HEADER}\nCSVTEST02,"Doe, John",,\nCSVTEST03,Valid User,,\n'
        try:
            process_user_csv(db, content)
            assert False, "harusnya CsvFormatError"
        except CsvFormatError:
            pass

        # Baris CSVTEST03 valid, tapi karena SATU baris lain melanggar, SELURUH file (termasuk
        # baris valid ini) harus ikut ditolak
        user = db.scalar(select(User).where(User.kartu == "CSVTEST03"))
        assert user is None, "nama mengandung koma harus menolak SELURUH file"


def test_kartu_kosong_tolak_baris():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\n,Tanpa Kartu,,\nCSVTEST04,Valid User,,\n"
        result = process_user_csv(db, content)

        assert result.success_count == 1
        assert result.errors[0].reason == "kartu kosong"
        assert "CSVTEST04" in result.processed_kartu


def test_nama_kosong_tolak_baris():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\nCSVTEST05,,,\nCSVTEST06,Valid User,,\n"
        result = process_user_csv(db, content)

        assert result.success_count == 1
        assert result.errors[0].kartu == "CSVTEST05"
        assert result.errors[0].reason == "nama kosong"


def test_nama_pintu_tidak_ditemukan_tolak_baris():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\nCSVTEST07,Test User,,Pintu Fiktif\nCSVTEST08,Valid User,,Lobby Utama\n"
        result = process_user_csv(db, content)

        assert result.success_count == 1
        assert result.errors[0].kartu == "CSVTEST07"
        assert "Pintu Fiktif" in result.errors[0].reason


def test_department_tidak_ditemukan_tolak_baris():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\nCSVTEST09,Test User,Divisi Fiktif,\nCSVTEST10,Valid User,IT,\n"
        result = process_user_csv(db, content)

        assert result.success_count == 1
        assert result.errors[0].kartu == "CSVTEST09"
        assert "Divisi Fiktif" in result.errors[0].reason


def test_kartu_duplikat_tolak_baris_kedua():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\nCSVTEST11,Nama Pertama,,\nCSVTEST11,Nama Kedua,,\n"
        result = process_user_csv(db, content)

        assert result.success_count == 1
        assert result.errors[0].reason == "kartu duplikat dalam file"

        # Baris pertama yang menang -> nama di DB harus "Nama Pertama", bukan "Nama Kedua"
        user = db.scalar(select(User).where(User.kartu == "CSVTEST11"))
        assert user.nama == "Nama Pertama"


def test_department_kosong_artinya_tanpa_department():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\nCSVTEST12,Test User,,\n"
        process_user_csv(db, content)

        user = db.scalar(select(User).where(User.kartu == "CSVTEST12"))
        assert user.department_id is None


def test_doors_kosong_artinya_ikut_department():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\nCSVTEST13,Test User,IT,\n"
        process_user_csv(db, content)

        user = db.scalar(select(User).where(User.kartu == "CSVTEST13"))
        assert user.department_id is not None
        assert user.is_custom_access is False
        accesses = db.scalars(select(UserAccess).where(UserAccess.user_id == user.uid)).all()
        assert accesses == []


def test_doors_terisi_artinya_custom_access_dan_translate_ke_door_id():
    with SessionLocal() as db:
        _cleanup(db)
        content = f"{HEADER}\nCSVTEST14,Test User,,Lobby Utama|Lab Komputer\n"
        process_user_csv(db, content)

        user = db.scalar(select(User).where(User.kartu == "CSVTEST14"))
        assert user.is_custom_access is True
        accesses = db.scalars(select(UserAccess).where(UserAccess.user_id == user.uid)).all()
        door_ids = sorted(a.door_id for a in accesses)
        assert door_ids == [1, 6], door_ids  # 1=Lobby Utama, 6=Lab Komputer (lihat seed.sql)


if __name__ == "__main__":
    tests = [
        test_header_salah_tolak_seluruh_file,
        test_nama_mengandung_koma_tolak_seluruh_file,
        test_kartu_kosong_tolak_baris,
        test_nama_kosong_tolak_baris,
        test_nama_pintu_tidak_ditemukan_tolak_baris,
        test_department_tidak_ditemukan_tolak_baris,
        test_kartu_duplikat_tolak_baris_kedua,
        test_department_kosong_artinya_tanpa_department,
        test_doors_kosong_artinya_ikut_department,
        test_doors_terisi_artinya_custom_access_dan_translate_ke_door_id,
    ]
    for test in tests:
        test()
        print(test.__name__, "OK")

    with SessionLocal() as db:
        _cleanup(db)
    print("\nSemua test process_user_csv() lulus. DB test dibersihkan.")
