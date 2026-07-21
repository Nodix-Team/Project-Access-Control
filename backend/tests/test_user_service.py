# Test resolve_user_access() — bukti behavior sesuai PRD 6.5 & Aturan Kritis Penomoran Pintu
# Jalankan dari folder backend/: python -m tests.test_user_service
from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User
from app.services.user_service import resolve_user_access


def _get_user_by_kartu(db, kartu: str) -> User:
    user = db.scalar(select(User).where(User.kartu == kartu))
    assert user is not None, f"seed user kartu={kartu} tidak ditemukan, jalankan database/seed.sql dulu"
    return user


def test_custom_access_pakai_user_access():
    # Jane Smith (11223344): is_custom_access = TRUE -> harus ambil dari user_access, bukan department_access
    with SessionLocal() as db:
        jane = _get_user_by_kartu(db, "11223344")
        assert jane.is_custom_access is True
        result = resolve_user_access(db, jane.uid)

    assert result == {"ctrl-A": [1, 2, 3], "ctrl-B": [2]}, result


def test_department_access_dipakai_saat_tidak_custom():
    # John Doe (AABBCCDD): is_custom_access = FALSE, dept IT -> harus ambil dari department_access
    with SessionLocal() as db:
        john = _get_user_by_kartu(db, "AABBCCDD")
        assert john.is_custom_access is False
        assert john.department_id is not None
        result = resolve_user_access(db, john.uid)

    assert result == {"ctrl-A": [1, 2], "ctrl-B": [2]}, result


def test_output_pakai_door_number_bukan_door_id():
    # door_id 6 (Lab Komputer, milik ctrl-B) harus muncul sebagai door_number 2 — kalau fungsi
    # lupa translate, angka 6 (door_id) akan nongol di list ctrl-B dan assert ini gagal.
    with SessionLocal() as db:
        jane = _get_user_by_kartu(db, "11223344")
        result = resolve_user_access(db, jane.uid)

    assert 6 not in result.get("ctrl-B", []), "door_id bocor ke output, seharusnya door_number"
    assert result["ctrl-B"] == [2]


def test_tanpa_custom_dan_tanpa_department_hasil_kosong():
    # User tanpa is_custom_access dan tanpa department_id -> tidak boleh bisa akses pintu manapun
    with SessionLocal() as db:
        temp_user = User(
            kartu="TESTNOACCESS", nama="Test No Access", department_id=None, is_custom_access=False
        )
        db.add(temp_user)
        db.commit()
        db.refresh(temp_user)
        uid = temp_user.uid

        try:
            result = resolve_user_access(db, uid)
            assert result == {}, result
        finally:
            db.delete(temp_user)
            db.commit()


def test_user_tidak_ditemukan_hasil_kosong():
    with SessionLocal() as db:
        result = resolve_user_access(db, 999999)
    assert result == {}


if __name__ == "__main__":
    test_custom_access_pakai_user_access()
    print("test_custom_access_pakai_user_access OK")
    test_department_access_dipakai_saat_tidak_custom()
    print("test_department_access_dipakai_saat_tidak_custom OK")
    test_output_pakai_door_number_bukan_door_id()
    print("test_output_pakai_door_number_bukan_door_id OK")
    test_tanpa_custom_dan_tanpa_department_hasil_kosong()
    print("test_tanpa_custom_dan_tanpa_department_hasil_kosong OK")
    test_user_tidak_ditemukan_hasil_kosong()
    print("test_user_tidak_ditemukan_hasil_kosong OK")
    print("\nSemua test resolve_user_access() lulus.")
