# 📋 Backlog & Catatan Pengembangan (Versi Selanjutnya)

> **Status file:** draft lokal, belum di-commit. Simpan dulu di sini setiap kali menemukan
> bug/isu/ide peningkatan yang **tidak bisa langsung dikerjakan** saat itu juga (di luar scope
> sprint/PR yang sedang jalan). Jangan buru-buru menilai prioritas satu-satu — kumpulkan dulu.
>
> Kalau daftar sudah cukup banyak, baru lakukan **sesi triase**: baca semua entri, beri label
> prioritas (P0/P1/P2/Nice-to-have), lalu pindahkan yang disepakati ke `v0.2/ROADMAP_v0.2.md` (atau
> roadmap versi berikutnya) sebagai sprint/checklist baru.

---

## Cara menambah entri baru

Salin format ini di bawah section kategori yang sesuai:

```md
### <judul singkat temuan>
- **Sumber:** <file/commit/laporan/chat tempat ini ditemukan>
- **Ditemukan saat:** <sprint/PR/tanggal>
- **Catatan:** <apa masalahnya / apa idenya, kenapa belum langsung dikerjakan>
- **Prioritas:** _(belum dinilai)_
```

Kalau kategori yang cocok belum ada, buat section `##` baru.

---

## Ide/Isu Baru (belum dikategorikan)

> Tambahkan entri baru di sini dulu kalau belum yakin masuk kategori mana. Pindahkan ke section
> yang sesuai saat sempat merapikan.

### Proposal: CRUD Controller dinamis lewat Web Admin (tambah/hapus controller)
- **Sumber:** Catatan lisan dari @danskiv (chat), rujukan draf `docs/proposal_crud_controllers.md` — **file belum ada di repo saat catatan ini ditulis, perlu dicek/ditarik dulu sebelum dibaca lebih lanjut**
- **Ditemukan saat:** 2026-07-17, saat Sprint 3 (`feature/backend-mqtt`) masih berjalan, Sprint 2 (`feature/backend-core`) sudah merge
- **Catatan:** Usulan menambahkan `POST`/`DELETE` controller via UI, supaya admin bisa daftar/hapus controller (mis. gedung/pintu baru, ganti ESP32) tanpa query SQL manual. Dampak per layer menurut pengusul:
  - DB (Sprint 1): tambah `ON DELETE CASCADE` di FK `doors.controller_id`
  - Backend (Sprint 2): skema `ControllerCreate` + route POST/DELETE; POST otomatis generate baris `doors` sejumlah `total_doors`
  - MQTT/Sync (Sprint 3): diklaim tanpa perubahan protokol, karena EMQX auth via MySQL — controller baru langsung dikenali begitu connect
  - Firmware (Sprint 4): diklaim nol dampak
  - Frontend (Sprint 5): tombol + modal CRUD saja
  - **Belum diverifikasi independen** — klaim "tanpa perubahan protokol" dan "nol dampak firmware" di atas berasal dari draf pengusul, belum dicek sendiri terhadap `v0.2/architecture_proposal_v0.2.md` (mis. apakah EMQX ACL per-controller butuh provisioning manual atau benar-benar otomatis via MySQL auth).
- **Keputusan terbuka (ditanyakan pengusul ke Rizal):** kejar masuk v0.2 sekarang (di tengah Sprint 3), atau tunda jadi minor release v0.2.1 setelah v0.2 core multi-controller rilis dulu?
- **Prioritas:** _(belum dinilai — juga belum ada keputusan scope v0.2 vs v0.2.1)_

### Firmware: WiFi vs Ethernet (W5500) — mode tunggal atau dual/redundant
- **Sumber:** Chat WhatsApp antara @Danas Elkom & @Rizzal-AR, 2026-07-17
- **Ditemukan saat:** Diskusi bebas soal arah firmware ke depan, di luar sprint yang sedang berjalan
- **Catatan:** Ide awal: matikan WiFi, ganti modul Ethernet W5500 (alasan hemat memory ESP32). Berkembang jadi opsi lain: WiFi tetap dipertahankan + tambah Ethernet, sehingga controller bisa pakai salah satu (menyesuaikan area — kalau tidak memungkinkan tarik kabel LAN, tetap bisa WiFi) atau keduanya sekaligus (redundant/failover).

  Potensi masalah yang sudah teridentifikasi: kalau access point WiFi mati, ESP32 berisiko scanning/reconnect terus-menerus tanpa henti. Usulan sementara: throttle reconnect jadi tiap 30 menit sekali. Disepakati ini baru solusi kasar — "mestine ono cara seng luwih efektif" (harusnya ada cara yang lebih efektif), perlu digali lebih lanjut sebelum diimplementasikan.
- **Pertanyaan terbuka:** WiFi-only vs Ethernet-only vs dual/redundant — belum diputuskan; mekanisme reconnect yang lebih efisien dari sekadar interval tetap juga belum ditentukan.
- **Prioritas:** _(belum dinilai)_

### Auto-create department saat CSV upload berisi nama department belum terdaftar
- **Sumber:** Chat WhatsApp dengan @Danas Elkom, 2026-07-17 (diskusi CSV upload backend-core)
- **Ditemukan saat:** Sprint 4–5 (progress sekarang), menyangkut kode Sprint 2 (`backend-core`) yang sudah lama merged
- **Catatan:** Perilaku **saat ini** (terverifikasi langsung di `backend/app/services/csv_service.py:86-94`): kalau CSV berisi nama department yang belum ada di DB, baris tersebut **ditolak** (error `"department 'X' tidak ditemukan"`), bukan diabaikan atau dibuat otomatis. Baris lain yang valid di file yang sama tetap diproses normal — konsisten dengan cara sistem menolak nama pintu yang tidak ditemukan (baris 99-104).

  Usulan @Danas: kalau nama department di CSV belum ada, sistem otomatis membuat department baru (default tanpa hak akses pintu / `department_access` kosong); user tetap terimpor & terikat ke department baru itu; admin baru mengatur akses pintunya manual lewat menu Department Management.

  **Kenapa ditunda, bukan langsung dikerjakan:**
  1. Tidak tercantum di scope v0.2 manapun (bukan di `v0.2/architecture_proposal_v0.2.md`, bukan di aturan validasi CSV yang sudah disepakati) — kalau dimasukkan sekarang jadi scope creep tanpa approval bersama.
  2. Perubahan ini secara teknis masuk wilayah Sprint 2 (`csv_service.py`) yang sudah lama merged, sementara progress sekarang sudah Sprint 4 menuju 5 — mundur ke sprint yang sudah closed berisiko bikin siklus kerja tidak pernah benar-benar tuntas.
  3. Butuh desain lebih matang dulu: pencocokan nama department **saat ini exact-match, case-sensitive, tanpa normalisasi** (beda dengan kartu yang sudah dinormalisasi via `normalize_kartu`; dikonfirmasi di kode — key dict `departments_by_nama` pakai `dept.nama` mentah). Kalau auto-create dinyalakan tanpa normalisasi nama dulu, typo kecil ("IT" vs "I.T" vs "it ") bisa menghasilkan department duplikat berantakan di DB — kelas bug yang mirip persis dengan kasus normalisasi kartu Jane Smith yang baru ditemukan & diperbaiki di Sprint 3.
- **Prioritas:** _(belum dinilai — kandidat v0.3; sengaja tidak masuk v0.2 untuk hindari scope creep & mundur ke sprint yang sudah closed)_

---

## Riwayat Triase

> Isi setelah sesi prioritisasi dilakukan: tanggal, siapa yang triase, dan ringkasan hasil
> (item mana yang naik jadi sprint/roadmap, mana yang di-drop, mana yang tetap di-backlog).

_(belum ada sesi triase)_
