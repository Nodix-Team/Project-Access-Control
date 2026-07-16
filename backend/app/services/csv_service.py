# Business logic validasi + parse CSV upload user
# Format: kartu,nama,department,doors — doors dipisah '|', berisi NAMA pintu (bukan door_id).
# Aturan validasi persis blok "Format File CSV untuk Upload User" di architecture_proposal_v0.2.md.
import csv
import io
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.door import Door
from app.models.user import User
from app.models.user_access import UserAccess
from app.utils.kartu import normalize_kartu

EXPECTED_HEADER = ["kartu", "nama", "department", "doors"]


class CsvFormatError(Exception):
    # Dilempar kalau SELURUH file harus ditolak (header salah, atau ada nama mengandung koma)
    pass


@dataclass
class CsvRowError:
    row_number: int  # nomor baris fisik di file (baris 1 = header, baris 2 = data pertama)
    kartu: str
    reason: str


@dataclass
class CsvUploadResult:
    success_count: int = 0
    processed_kartu: List[str] = field(default_factory=list)
    errors: List[CsvRowError] = field(default_factory=list)


def _parse_rows(content: str) -> List[Dict[str, str]]:
    reader = csv.DictReader(io.StringIO(content))
    header = reader.fieldnames or []
    if header != EXPECTED_HEADER:
        raise CsvFormatError(
            "Header CSV harus persis 'kartu,nama,department,doors', ditemukan: '"
            + ",".join(header)
            + "'"
        )
    return list(reader)


def process_user_csv(db: Session, content: str) -> CsvUploadResult:
    rows = _parse_rows(content)

    # nama mengandung koma -> tolak SELURUH file (dicek dulu, sebelum baris manapun disentuh DB)
    for row_number, row in enumerate(rows, start=2):
        nama = (row.get("nama") or "").strip()
        if "," in nama:
            raise CsvFormatError(
                f"Baris {row_number}: kolom nama mengandung koma ('{nama}') — seluruh file ditolak"
            )

    doors_by_nama = {door.nama: door for door in db.scalars(select(Door)).all() if door.nama}
    departments_by_nama = {dept.nama: dept for dept in db.scalars(select(Department)).all()}

    result = CsvUploadResult()
    seen_kartu: Set[str] = set()

    for row_number, row in enumerate(rows, start=2):
        # Normalisasi SEBELUM dedup/lookup — "123456" & "0000123456" harus dianggap kartu yang sama
        kartu = normalize_kartu(row.get("kartu") or "")
        nama = (row.get("nama") or "").strip()
        department_nama = (row.get("department") or "").strip()
        doors_raw = (row.get("doors") or "").strip()

        if not kartu:
            result.errors.append(CsvRowError(row_number, kartu, "kartu kosong"))
            continue
        if not nama:
            result.errors.append(CsvRowError(row_number, kartu, "nama kosong"))
            continue
        if kartu in seen_kartu:
            result.errors.append(CsvRowError(row_number, kartu, "kartu duplikat dalam file"))
            continue

        department_id: Optional[int] = None
        if department_nama:
            department = departments_by_nama.get(department_nama)
            if department is None:
                result.errors.append(
                    CsvRowError(row_number, kartu, f"department '{department_nama}' tidak ditemukan")
                )
                continue
            department_id = department.id

        door_ids: List[int] = []
        if doors_raw:
            door_names = [name.strip() for name in doors_raw.split("|") if name.strip()]
            missing = [name for name in door_names if name not in doors_by_nama]
            if missing:
                result.errors.append(
                    CsvRowError(
                        row_number, kartu, f"nama pintu tidak ditemukan: {', '.join(missing)}"
                    )
                )
                continue
            door_ids = [doors_by_nama[name].id for name in door_names]

        # doors kosong = ikut department (is_custom_access False); doors terisi = custom access
        is_custom_access = len(door_ids) > 0

        user = db.scalar(select(User).where(User.kartu == kartu))
        if user is None:
            user = User(kartu=kartu)
            db.add(user)

        user.nama = nama
        user.department_id = department_id
        user.is_custom_access = is_custom_access
        db.flush()  # pastikan user.uid ada (untuk user baru) sebelum insert user_access

        # Replace penuh user_access — konsisten baik saat set custom access baru maupun saat
        # beralih balik ke "ikut department" (doors kosong -> baris lama dibersihkan)
        db.execute(delete(UserAccess).where(UserAccess.user_id == user.uid))
        for door_id in door_ids:
            db.add(UserAccess(user_id=user.uid, door_id=door_id))

        seen_kartu.add(kartu)
        result.success_count += 1
        result.processed_kartu.append(kartu)

    db.commit()
    return result
