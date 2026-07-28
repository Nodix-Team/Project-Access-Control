# Fixture pytest bersama untuk seluruh test backend.
#
# CATATAN (Sprint 1 CI/CD — temuan C-a & C-b dari KEPUTUSAN §7.0):
#   - conftest LAMA menyeret skema + seed saat IMPORT modul, di atas file SQLite tetap. Itu rapuh
#     untuk CI (tidak ada isolasi, urutan test berpengaruh, sisa file bisa terbawa) dan yang lebih
#     penting: SQLite TIDAK menegakkan ENUM, CHECK constraint, maupun func.timestampdiff() —
#     tepat hal-hal yang justru ingin kita uji di v0.3.
#   - conftest BARU ini: (1) URL database dibaca dari env TEST_DATABASE_URL, jadi CI bisa
#     mengarahkannya ke MySQL service container (mysql:8.0), sedangkan lokal boleh SQLite untuk
#     iterasi cepat; (2) skema & seed dibangun lewat FIXTURE ber-scope session, bukan saat import.
#
#   Penegakan CHECK/ENUM/timestampdiff yang sesungguhnya divalidasi terpisah oleh workflow db-ci.yml
#   (menjalankan schema.sql + migrasi 001 di atas MySQL sungguhan). conftest ini menyiapkan DB untuk
#   test service/model layer, bukan untuk menguji DDL mentah.
import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.database
from app.database import Base

# Default SQLite (cepat, untuk iterasi lokal). CI meng-override lewat env ke MySQL supaya
# ENUM/CHECK/timestampdiff benar-benar dijalankan engine sungguhan.
#   contoh CI: TEST_DATABASE_URL="mysql+pymysql://root:root@127.0.0.1:3306/access_control_test"
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test.db")

_IS_SQLITE = TEST_DATABASE_URL.startswith("sqlite")
_engine_kwargs = {"connect_args": {"check_same_thread": False}} if _IS_SQLITE else {"pool_pre_ping": True}

engine = create_engine(TEST_DATABASE_URL, **_engine_kwargs)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Arahkan SessionLocal aplikasi ke engine test. Test lama meng-import `from app.database import
# SessionLocal` lalu memakainya langsung — override di sini menjaga mereka tetap jalan tanpa diubah.
app.database.SessionLocal = TestingSessionLocal
app.database.engine = engine


def _seed(db) -> None:
    # Data seed minimum yang diandalkan test_user_service & test_csv_service. Sengaja dipisah jadi
    # fungsi supaya gampang dibaca; nilai-nilainya HARUS cocok dengan ekspektasi di test itu
    # (mis. Jane Smith kartu 11223344 custom-access ke pintu 1,2,3 lokal ctrl-A + pintu 2 ctrl-B).
    from app.models.controller import Controller
    from app.models.department import Department
    from app.models.department_access import DepartmentAccess
    from app.models.door import Door
    from app.models.user import User
    from app.models.user_access import UserAccess

    db.add_all([
        Controller(id=1, device_id="ctrl-A", nama="Controller Gedung A", lokasi="Gedung A Lantai 1",
                   wifi_ssid="OFFICE_WIFI", mqtt_broker="192.168.1.100", mqtt_user="ctrl-A", total_doors=4),
        Controller(id=2, device_id="ctrl-B", nama="Controller Gedung B", lokasi="Gedung B Lantai 1",
                   wifi_ssid="OFFICE_WIFI", mqtt_broker="192.168.1.100", mqtt_user="ctrl-B", total_doors=4),
    ])
    db.commit()

    db.add_all([
        Door(id=1, controller_id=1, door_number=1, nama="Lobby Utama", lokasi="Gedung A - Lantai 1"),
        Door(id=2, controller_id=1, door_number=2, nama="Ruang Server", lokasi="Gedung A - Lantai 1"),
        Door(id=3, controller_id=1, door_number=3, nama="Ruang Meeting", lokasi="Gedung A - Lantai 2"),
        Door(id=4, controller_id=1, door_number=4, nama="Ruang Arsip", lokasi="Gedung A - Lantai 2"),
        Door(id=5, controller_id=2, door_number=1, nama="Lobby B", lokasi="Gedung B - Lantai 1"),
        Door(id=6, controller_id=2, door_number=2, nama="Lab Komputer", lokasi="Gedung B - Lantai 1"),
        Door(id=7, controller_id=2, door_number=3, nama="Ruang Workshop", lokasi="Gedung B - Lantai 2"),
        Door(id=8, controller_id=2, door_number=4, nama="Gudang", lokasi="Gedung B - Lantai 2"),
    ])
    db.commit()

    db.add_all([
        Department(id=1, nama="IT", deskripsi="Divisi Teknologi Informasi"),
        Department(id=2, nama="HRD", deskripsi="Human Resource Development"),
        Department(id=3, nama="Security", deskripsi="Tim Keamanan"),
    ])
    db.commit()

    db.add_all([
        DepartmentAccess(department_id=1, door_id=1), DepartmentAccess(department_id=1, door_id=2),
        DepartmentAccess(department_id=1, door_id=6), DepartmentAccess(department_id=2, door_id=1),
        DepartmentAccess(department_id=2, door_id=3), DepartmentAccess(department_id=3, door_id=1),
        DepartmentAccess(department_id=3, door_id=2), DepartmentAccess(department_id=3, door_id=3),
        DepartmentAccess(department_id=3, door_id=4),
    ])
    db.commit()

    db.add_all([
        User(uid=1, kartu="AABBCCDD", nama="John Doe", department_id=1, is_custom_access=False),
        User(uid=2, kartu="11223344", nama="Jane Smith", department_id=1, is_custom_access=True),
        User(uid=3, kartu="DEADBEEF", nama="Bob Wilson", department_id=2, is_custom_access=False),
        User(uid=4, kartu="FF001122", nama="Alice Brown", department_id=None, is_custom_access=True),
        User(uid=5, kartu="CAFEBABE", nama="Charlie Lee", department_id=3, is_custom_access=False),
    ])
    db.commit()

    db.add_all([
        UserAccess(user_id=2, door_id=1), UserAccess(user_id=2, door_id=2),
        UserAccess(user_id=2, door_id=3), UserAccess(user_id=2, door_id=6),
        UserAccess(user_id=4, door_id=5),
    ])
    db.commit()


@pytest.fixture(scope="session", autouse=True)
def database():
    # Bangun skema dari model, seed sekali di awal sesi, bersihkan di akhir. autouse -> semua test
    # otomatis dapat DB ter-seed tanpa harus meminta fixture ini secara eksplisit.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        _seed(db)
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    if _IS_SQLITE and os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except OSError:
            pass


@pytest.fixture
def db_session():
    # Session per-test untuk test yang ingin query langsung. Ditutup otomatis setelah test selesai.
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
