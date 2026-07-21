# 📚 Indeks Dokumentasi

Peta seluruh dokumen di folder ini, dikelompokkan per kategori. Lihat juga [`../CONTRIBUTING.md`](../CONTRIBUTING.md) untuk aturan branching/commit dan [`../CHANGELOG.md`](../CHANGELOG.md) untuk riwayat perubahan per rilis.

## Roadmap &amp; Status Rilis

| Dokumen | Isi |
|---|---|
| [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) | Rencana pengembangan v0.3 — **mulai di sini** kalau mau tahu apa yang sedang/akan dikerjakan |
| [`V0.2_CLOSURE_REPORT.md`](V0.2_CLOSURE_REPORT.md) | Perbandingan realisasi v0.2 vs roadmap-nya, per sprint — dasar penyusunan roadmap v0.3 |
| [`ROADMAP_v0.2.md`](ROADMAP_v0.2.md) | Roadmap v0.2 (historis, sudah rilis — lihat tag `v0.2.0`) |
| [`BACKLOG_PENGEMBANGAN.md`](BACKLOG_PENGEMBANGAN.md) | Ide/temuan yang sengaja ditunda dari sprint berjalan, belum semua masuk roadmap resmi |

## Arsitektur &amp; Keputusan Desain (asal-usul v0.2)

| Dokumen | Isi |
|---|---|
| [`PRD_v0.2.md`](PRD_v0.2.md) | Product Requirement Document awal — tujuan, ukuran keberhasilan, cakupan |
| [`KEPUTUSAN_ARSITEKTUR_v0.2.md`](KEPUTUSAN_ARSITEKTUR_v0.2.md) | Rekonsiliasi proposal vs review jadi satu kontrak yang dibekukan (penomoran pintu, keamanan MQTT, protokol sync, dst) |
| [`architecture_proposal_v0.2.md`](architecture_proposal_v0.2.md) | Spesifikasi arsitektur final (Rev 3), rujukan utama implementasi |
| [`architecture_review.md`](architecture_review.md) | Review kritis terhadap proposal v0.1 → v0.2 |
| [`ERD_v0.2.mermaid`](ERD_v0.2.mermaid) | Diagram ER 8 tabel (sumber `database/schema.sql`) |
| [`JOBDESK_BACKEND_v0.2.md`](JOBDESK_BACKEND_v0.2.md) | Pembagian kerja awal backend |

## Panduan Operasional &amp; Pengujian

| Dokumen | Isi |
|---|---|
| [`testing_guide.md`](testing_guide.md) | Panduan praktis pengujian &amp; simulator |
| [`VM_TESTING_PLAN.md`](VM_TESTING_PLAN.md) | Skema pengujian di VirtualBox (Debian) + ESP32 fisik |
| [`OFFLINE_BUFFER_CAPACITY_ANALYSIS.md`](OFFLINE_BUFFER_CAPACITY_ANALYSIS.md) | Analisis kapasitas buffer log offline firmware |

---

> Riwayat: `PRD_v0.2.md`, `KEPUTUSAN_ARSITEKTUR_v0.2.md`, `ERD_v0.2.mermaid`, dan `JOBDESK_BACKEND_v0.2.md`
> sebelumnya tersimpan sebagai `PRD-V2/files.zip` (arsip ZIP, tidak bisa di-diff/dicari) — dipindah ke sini
> 2026-07-21 saat perapian repo menjelang v0.3 supaya bisa dibaca &amp; di-diff langsung seperti dokumen lain.
