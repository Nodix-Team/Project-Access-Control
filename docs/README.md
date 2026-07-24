# 📚 Indeks Dokumentasi

Peta seluruh dokumen, disusun supaya **kelihatan mana yang sedang dipakai untuk v0.3** dan mana yang arsip.
Lihat juga [`../CONTRIBUTING.md`](../CONTRIBUTING.md) untuk aturan branching/commit dan
[`../CHANGELOG.md`](../CHANGELOG.md) untuk riwayat perubahan per rilis.

```
docs/
├── (root)      ← DOKUMEN AKTIF v0.3 — semua yang sedang dikerjakan ada di sini
├── pendukung/  ← lintas versi, tetap dipakai selama v0.3 (panduan uji, backlog, analisis)
└── v0.2/       ← ARSIP rilis v0.2, historis. Jangan diedit, dirujuk saja
```

---

## 🟢 Aktif — v0.3 (root folder ini)

**Mulai dari sini kalau baru bergabung:** baca `KEPUTUSAN_ARSITEKTUR_v0.3.md` bagian "Peta status per
bagian" di paling atas — di situ kelihatan mana yang sudah final, mana yang masih menunggu keputusan siapa.

| Dokumen | Isi | Status |
|---|---|---|
| [`KEPUTUSAN_ARSITEKTUR_v0.3.md`](KEPUTUSAN_ARSITEKTUR_v0.3.md) | **Dokumen kerja utama v0.3.** Kontrak terpadu semua layer (HW → firmware → MQTT → DB → backend → frontend → CI/CD) + 4 checklist keputusan (D/B/F/C) | 🟡 DRAFT |
| [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md) | Kontrak kode status/reason/event 3 lapis (Angka MQTT → Kode DB → Teks UI). Naik ke **v0.3.1** (field `seq` + tabel event) | ✅ **FINAL/APPROVED** |
| [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) | Rencana sprint v0.3 | 🟡 DRAFT |
| [`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) | Spesifikasi arsitektur terintegrasi v0.3 (Rev 2) — fokus firmware/hardware | 🟡 PROPOSAL ⚠️ |
| [`PROPOSAL-RANCANGAN-HARDWARE-V0.3.md`](PROPOSAL-RANCANGAN-HARDWARE-V0.3.md) | Rancangan hardware grade-industri (ESP32-S3 + MCP23017 + W5500 + proteksi) | 🟡 PROPOSAL ⚠️ |
| [`HARDWARE-AUDIT-REVIEW-V0.3.md`](HARDWARE-AUDIT-REVIEW-V0.3.md) | Matriks evaluasi review hardware 18–19 poin | ✅ APPROVED |
| [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid) | ERD v0.3 — 11 tabel (8 lama + `controller_events`, `alarms`, `admin_logs`) | 🟡 USUL |

> ⚠️ **Kalau dua dokumen berbeda, yang berlaku adalah `KEPUTUSAN_ARSITEKTUR_v0.3.md`.**
> Beberapa bagian `ARCHITECTURE-PROPOSAL-V0.3.md` & `PROPOSAL-RANCANGAN-HARDWARE-V0.3.md` sudah
> digantikan oleh keputusan yang lebih baru (mis. alokasi pin, format payload) — masing-masing sudah
> dipasangi banner `[!WARNING]` di baris pertamanya. Daftar koreksi lengkap ada di
> [`KEPUTUSAN_ARSITEKTUR_v0.3.md` §9.2](KEPUTUSAN_ARSITEKTUR_v0.3.md).

**Artefak turunan (di luar folder docs):**
[`../database/migrations/001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql) — DDL delta v0.2 → v0.3 (DRAFT, belum dijalankan)

---

## 🔧 Pendukung — lintas versi, masih dipakai selama v0.3

| Dokumen | Isi | Dipakai di v0.3 untuk |
|---|---|---|
| [`pendukung/VM_TESTING_PLAN.md`](pendukung/VM_TESTING_PLAN.md) | Skema pengujian VirtualBox (Debian) + ESP32 fisik | Dasar lingkungan **staging** (§7.6 keputusan arsitektur) |
| [`pendukung/testing_guide.md`](pendukung/testing_guide.md) | Panduan praktis pengujian & simulator (payload MQTT v0.3.1) | Dasar perluasan `simulate_esp32.py` (§7.2) |
| [`pendukung/BACKLOG_PENGEMBANGAN.md`](pendukung/BACKLOG_PENGEMBANGAN.md) | Ide/temuan yang ditunda, belum masuk roadmap resmi | Sumber sebagian item Sprint 4 & 5 v0.3 |
| [`pendukung/OFFLINE_BUFFER_CAPACITY_ANALYSIS.md`](pendukung/OFFLINE_BUFFER_CAPACITY_ANALYSIS.md) | Analisis kapasitas buffer log offline firmware | Rujukan saat menaikkan `MAX_LOG_LINES` → 5000 |
| [`pendukung/PROJECT_ARCHITECTURE_INDEX.md`](pendukung/PROJECT_ARCHITECTURE_INDEX.md) | Indeks/catatan struktur proyek | Orientasi cepat isi repo |

---

## 📦 Arsip — v0.2 (sudah rilis, tag `v0.2.0`)

Dokumen historis. **Jangan diedit** — dirujuk saja kalau perlu tahu keputusan lama dan alasannya.

| Dokumen | Isi |
|---|---|
| [`v0.2/KEPUTUSAN_ARSITEKTUR_v0.2.md`](v0.2/KEPUTUSAN_ARSITEKTUR_v0.2.md) | Kontrak v0.2 yang dibekukan — **pola yang ditiru dokumen keputusan v0.3** |
| [`v0.2/V0.2_CLOSURE_REPORT.md`](v0.2/V0.2_CLOSURE_REPORT.md) | Perbandingan realisasi v0.2 vs roadmap-nya, per sprint |
| [`v0.2/ROADMAP_v0.2.md`](v0.2/ROADMAP_v0.2.md) | Roadmap v0.2 |
| [`v0.2/architecture_proposal_v0.2.md`](v0.2/architecture_proposal_v0.2.md) | Spesifikasi arsitektur final v0.2 (Rev 3) |
| [`v0.2/architecture_review.md`](v0.2/architecture_review.md) | Review kritis proposal v0.1 → v0.2 |
| [`v0.2/ERD_v0.2.mermaid`](v0.2/ERD_v0.2.mermaid) | ERD 8 tabel — **digantikan** [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid) |
| [`v0.2/PRD_v0.2.md`](v0.2/PRD_v0.2.md) | Product Requirement Document awal |
| [`v0.2/JOBDESK_BACKEND_v0.2.md`](v0.2/JOBDESK_BACKEND_v0.2.md) | Pembagian kerja awal backend |

---

> **Riwayat perapian:**
> - 2026-07-21 — `PRD_v0.2.md`, `KEPUTUSAN_ARSITEKTUR_v0.2.md`, `ERD_v0.2.mermaid`, `JOBDESK_BACKEND_v0.2.md`
>   dikeluarkan dari arsip ZIP `PRD-V2/files.zip` supaya bisa dibaca & di-diff langsung.
> - 2026-07-24 — folder `docs/` dirapikan jadi 3 lapis (aktif v0.3 / pendukung / arsip v0.2) supaya
>   kelihatan dokumen mana yang benar-benar dipakai selama pengembangan v0.3.
