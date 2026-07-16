# Normalisasi ID kartu — logic IDENTIK dengan UserStorage::normalizeKartu (firmware) dan
# normalize_kartu (tools/simulate_esp32.py), lihat "Aturan Kritis: Normalisasi ID Kartu 10-Digit"
# di docs/architecture_proposal_v0.2.md. Backend wajib menormalkan kartu sebelum simpan ke MySQL
# agar pencocokan log tap dari ESP32 tidak mismatch.


def normalize_kartu(kartu: str) -> str:
    clean = kartu.strip()
    if clean.isdigit() and len(clean) < 10:
        clean = clean.zfill(10)
    return clean
