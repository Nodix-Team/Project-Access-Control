import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import app.database
from app.database import Base
from app.models.controller import Controller
from app.models.door import Door
from app.models.department import Department
from app.models.department_access import DepartmentAccess
from app.models.user import User
from app.models.user_access import UserAccess

DB_FILE = "test.db"

# Remove old test DB if exists
if os.path.exists(DB_FILE):
    try:
        os.remove(DB_FILE)
    except Exception:
        pass

# 1. Create SQLite engine and tables at import time (before tests are loaded)
engine = create_engine(f"sqlite:///{DB_FILE}", connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)

# 2. Create sessionmaker
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Override SessionLocal at import time
app.database.SessionLocal = TestingSessionLocal

# 4. Seed development data
db = TestingSessionLocal()
try:
    # Seed Controllers
    c1 = Controller(id=1, device_id="ctrl-A", nama="Controller Gedung A", lokasi="Gedung A Lantai 1", wifi_ssid="OFFICE_WIFI", mqtt_broker="192.168.1.100", mqtt_user="ctrl-A", total_doors=4)
    c2 = Controller(id=2, device_id="ctrl-B", nama="Controller Gedung B", lokasi="Gedung B Lantai 1", wifi_ssid="OFFICE_WIFI", mqtt_broker="192.168.1.100", mqtt_user="ctrl-B", total_doors=4)
    db.add_all([c1, c2])
    db.commit()

    # Seed Doors
    d1 = Door(id=1, controller_id=1, door_number=1, nama="Lobby Utama", lokasi="Gedung A - Lantai 1")
    d2 = Door(id=2, controller_id=1, door_number=2, nama="Ruang Server", lokasi="Gedung A - Lantai 1")
    d3 = Door(id=3, controller_id=1, door_number=3, nama="Ruang Meeting", lokasi="Gedung A - Lantai 2")
    d4 = Door(id=4, controller_id=1, door_number=4, nama="Ruang Arsip", lokasi="Gedung A - Lantai 2")
    d5 = Door(id=5, controller_id=2, door_number=1, nama="Lobby B", lokasi="Gedung B - Lantai 1")
    d6 = Door(id=6, controller_id=2, door_number=2, nama="Lab Komputer", lokasi="Gedung B - Lantai 1")
    d7 = Door(id=7, controller_id=2, door_number=3, nama="Ruang Workshop", lokasi="Gedung B - Lantai 2")
    d8 = Door(id=8, controller_id=2, door_number=4, nama="Gudang", lokasi="Gedung B - Lantai 2")
    db.add_all([d1, d2, d3, d4, d5, d6, d7, d8])
    db.commit()

    # Seed Departments
    dept1 = Department(id=1, nama="IT", deskripsi="Divisi Teknologi Informasi")
    dept2 = Department(id=2, nama="HRD", deskripsi="Human Resource Development")
    dept3 = Department(id=3, nama="Security", deskripsi="Tim Keamanan")
    db.add_all([dept1, dept2, dept3])
    db.commit()

    # Seed Department Access
    da1 = DepartmentAccess(department_id=1, door_id=1)
    da2 = DepartmentAccess(department_id=1, door_id=2)
    da3 = DepartmentAccess(department_id=1, door_id=6)
    da4 = DepartmentAccess(department_id=2, door_id=1)
    da5 = DepartmentAccess(department_id=2, door_id=3)
    da6 = DepartmentAccess(department_id=3, door_id=1)
    da7 = DepartmentAccess(department_id=3, door_id=2)
    da8 = DepartmentAccess(department_id=3, door_id=3)
    da9 = DepartmentAccess(department_id=3, door_id=4)
    db.add_all([da1, da2, da3, da4, da5, da6, da7, da8, da9])
    db.commit()

    # Seed Users (matching expected values in test_user_service.py)
    u1 = User(uid=1, kartu="AABBCCDD", nama="John Doe", department_id=1, is_custom_access=False)
    u2 = User(uid=2, kartu="11223344", nama="Jane Smith", department_id=1, is_custom_access=True)
    u3 = User(uid=3, kartu="DEADBEEF", nama="Bob Wilson", department_id=2, is_custom_access=False)
    u4 = User(uid=4, kartu="FF001122", nama="Alice Brown", department_id=None, is_custom_access=True)
    u5 = User(uid=5, kartu="CAFEBABE", nama="Charlie Lee", department_id=3, is_custom_access=False)
    db.add_all([u1, u2, u3, u4, u5])
    db.commit()

    # Seed User Access
    ua1 = UserAccess(user_id=2, door_id=1)
    ua2 = UserAccess(user_id=2, door_id=2)
    ua3 = UserAccess(user_id=2, door_id=3)
    ua4 = UserAccess(user_id=2, door_id=6)
    ua5 = UserAccess(user_id=4, door_id=5)
    db.add_all([ua1, ua2, ua3, ua4, ua5])
    db.commit()
finally:
    db.close()

@pytest.fixture(scope="session", autouse=True)
def cleanup_after_session():
    yield
    # Clean up test DB after session
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception:
            pass
