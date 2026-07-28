#!/usr/bin/env python3
"""Pengecek konsistensi kontrak kode lintas-layer (Sprint 1 CI/CD — KEPUTUSAN §7.1 W5 / §7.2c).

CONTRACT-CODES-V0.3.md adalah SATU-SATUNYA sumber kebenaran untuk pemetaan angka -> kode DB
(STATUS, REASON, dan nanti EVENT). Angka yang sama harus dipakai firmware, backend, dan frontend.
Kalau salah satu melenceng, satu kejadian bisa tercatat beda arti di tiap layer.

Script ini:
  1. Mem-PARSE tabel STATUS & REASON dari dokumen markdown (sumber kebenaran).
  2. Kalau backend/app/mqtt/codes.py ADA  -> impor & bandingkan.
  3. Kalau frontend/src/constants/codes.ts ADA -> parse & bandingkan.
  4. Untuk layer yang FILE-nya belum dibuat (codes.py/codes.ts baru lahir di Sprint 3/5),
     cetak "PENDING" dan JANGAN gagal — supaya CI Sprint 1 tetap hijau, tapi tidak berbohong:
     yang belum ada ditandai eksplisit, bukan diam-diam dilewati.

Exit code: 0 = konsisten atau pending; 1 = ADA layer yang melenceng dari dokumen.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOC = ROOT / "docs" / "CONTRACT-CODES-V0.3.md"
BACKEND_CODES = ROOT / "backend" / "app" / "mqtt" / "codes.py"
FRONTEND_CODES = ROOT / "frontend" / "src" / "constants" / "codes.ts"

# Baris tabel: | `<angka>` | `<KODE>` | ... — kita ambil kolom 1 (angka) & kolom 2 (kode DB).
_ROW = re.compile(r"^\|\s*`?(\d+)`?\s*\|\s*`?([A-Z_]+)`?\s*\|")


def parse_doc_table(md: str, header: str) -> dict[int, str]:
    """Ambil pemetaan {angka: KODE} dari tabel di bawah heading `header`."""
    lines = md.splitlines()
    out: dict[int, str] = {}
    in_section = False
    for line in lines:
        if line.strip().startswith("## "):
            in_section = header in line
            continue
        if in_section:
            m = _ROW.match(line)
            if m:
                out[int(m.group(1))] = m.group(2)
    return out


def load_backend_codes() -> dict[str, dict[int, str]] | None:
    if not BACKEND_CODES.exists():
        return None
    sys.path.insert(0, str(ROOT / "backend"))
    try:
        from app.mqtt import codes  # type: ignore  # noqa: E402
    except Exception as exc:  # pragma: no cover - dilaporkan sebagai mismatch
        print(f"  backend codes.py ADA tapi gagal diimpor: {exc}")
        return {}
    return {
        "STATUS": dict(getattr(codes, "STATUS_CODES", {})),
        "REASON": dict(getattr(codes, "REASON_CODES", {})),
    }


def parse_ts_record(ts: str, var: str) -> dict[int, str]:
    """Parse `export const STATUS_CODES: Record<number,string> = { 0: "UNKNOWN", ... }`."""
    m = re.search(var + r"\s*[:=][^{]*\{([^}]*)\}", ts, re.DOTALL)
    if not m:
        return {}
    body = m.group(1)
    out: dict[int, str] = {}
    for num, code in re.findall(r"(\d+)\s*:\s*[\"']([A-Z_]+)[\"']", body):
        out[int(num)] = code
    return out


def load_frontend_codes() -> dict[str, dict[int, str]] | None:
    if not FRONTEND_CODES.exists():
        return None
    ts = FRONTEND_CODES.read_text(encoding="utf-8")
    return {
        "STATUS": parse_ts_record(ts, "STATUS_CODES"),
        "REASON": parse_ts_record(ts, "REASON_CODES"),
    }


def compare(layer: str, table: str, expected: dict[int, str], actual: dict[int, str]) -> bool:
    if expected == actual:
        print(f"  OK   {layer} {table} ({len(actual)} kode) cocok dengan dokumen")
        return True
    print(f"  FAIL {layer} {table} MELENCENG dari dokumen:")
    for num in sorted(set(expected) | set(actual)):
        exp = expected.get(num, "—")
        act = actual.get(num, "—")
        if exp != act:
            print(f"       angka {num}: dokumen={exp!r}  {layer}={act!r}")
    return False


def main() -> int:
    if not DOC.exists():
        print(f"FATAL: {DOC} tidak ditemukan")
        return 1

    md = DOC.read_text(encoding="utf-8")
    doc_status = parse_doc_table(md, "Tabel STATUS")
    doc_reason = parse_doc_table(md, "Tabel REASON")
    print(f"Sumber kebenaran (dokumen): STATUS={len(doc_status)} kode, REASON={len(doc_reason)} kode")
    if not doc_status or not doc_reason:
        print("FATAL: gagal mem-parse tabel STATUS/REASON dari dokumen (format berubah?)")
        return 1

    ok = True
    for layer, loader in (("backend", load_backend_codes), ("frontend", load_frontend_codes)):
        codes = loader()
        if codes is None:
            print(f"  PENDING {layer}: file kode belum dibuat (Sprint 3/5) — dilewati, bukan gagal")
            continue
        ok &= compare(layer, "STATUS", doc_status, codes.get("STATUS", {}))
        ok &= compare(layer, "REASON", doc_reason, codes.get("REASON", {}))

    print("HASIL:", "KONSISTEN" if ok else "ADA YANG MELENCENG")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
