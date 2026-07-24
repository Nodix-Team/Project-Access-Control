# 📝 DRAFT PROPOSAL: Roadmap Pengembangan v0.3

> [!IMPORTANT]
> Dokumen ini adalah **DRAFT / PROPOSAL USULAN** pengembangan untuk versi 0.3. Rencana ini **belum bersifat final** dan masih memerlukan review, diskusi, masukan, serta persetujuan dari seluruh anggota tim (terutama Rizal/Peng) sebelum disahkan menjadi roadmap resmi.

> Roadmap ini dirancang berdasarkan [`V0.2_CLOSURE_REPORT.md`](v0.2/V0.2_CLOSURE_REPORT.md) (perbandingan realisasi v0.2 vs
> roadmap-nya), [`BACKLOG_PENGEMBANGAN.md`](pendukung/BACKLOG_PENGEMBANGAN.md) (usulan yang sengaja ditunda dari v0.2),
> dan temuan audit kode langsung selama v0.2 (keamanan, testing, kesiapan hardware fisik).
> Aturan branching, commit message, dan proses PR **mengikuti [`CONTRIBUTING.md`](../CONTRIBUTING.md) yang sudah ada — tidak berubah.**
> Setiap milestone = 1 feature branch dari `dev`. Setelah selesai, merge via PR ke `dev`, minta review, **jangan merge sendiri**.

---

## Prasyarat: v0.2 Harus Ditutup Resmi Dulu

Sebelum Sprint 1 di bawah dimulai, 5 langkah administratif di [`V0.2_CLOSURE_REPORT.md`](v0.2/V0.2_CLOSURE_REPORT.md#tindakan-penutupan-yang-disarankan) harus selesai dulu (perbaiki `README.md`, update `CHANGELOG.md`, merge `dev`→`main`, tag `v0.2.0`). Tidak ada kode baru di langkah ini — murni administratif, tapi penting supaya `v0.3` punya titik awal yang jelas (bercabang dari `main` yang benar-benar berisi rilis v0.2, bukan dari `dev` yang belum pernah resmi dirilis).

---

## Overview

Beda dari v0.2 (5 sprint linear yang saling menunggu), v0.3 punya **3 kategori pekerjaan yang sifatnya beda**:

```
KATEGORI A — Software, berurutan (saling bergantung)
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Sprint 1 │ ──►  │ Sprint 2 │ ──►  │ Sprint 4 │ ──►  │ Sprint 5 │
│  CI/CD   │      │ Keamanan │      │ Backend  │      │  Fitur   │
│ + Test   │      │          │      │ Ops      │      │  Baru    │
└──────────┘      └──────────┘      └──────────┘      └──────────┘

KATEGORI B — Firmware fisik, mulai paralel (procurement hardware makan waktu)
┌──────────┐
│ Sprint 3 │  ◄── mulai procurement (beli RFID reader, relay, dst) SEJAK Sprint 1 jalan,
│ Firmware │      supaya part sudah di tangan saat giliran coding-nya tiba
│  Fisik   │
└──────────┘

KATEGORI C — Produk fisik, track terpisah (bukan branch/PR kode, butuh vendor luar)
┌──────────┐
│ Sprint 6 │  ◄── berjalan independen, tidak menghalangi/dihalangi sprint kode manapun
│  Produk  │
│  Fisik   │
└──────────┘

Semua kategori bermuara ke:
┌──────────┐
│ Sprint 7 │  Integrasi & Rilis v0.3.0
└──────────┘
```

---

## Sprint 1 — CI/CD &amp; Infrastruktur Testing

**Branch:** `feature/ci-cd-testing`
**Estimasi:** ~4 hari
**Folder:** `.github/workflows/`, `backend/tests/`, `frontend/src/**/*.test.ts`, `firmware/test/`

Ini sengaja jadi **sprint pertama**, bukan terakhir — supaya setiap sprint kode setelahnya (2, 3, 4, 5) langsung bisa memakai jaring pengaman ini alih-alih menambahnya belakangan.

### Checklist

**Backend:**
- [ ] `backend/requirements-dev.txt` — pisahkan dependency test (`pytest`, `httpx`, dst) dari `requirements.txt` produksi
- [ ] `backend/pytest.ini` + `backend/tests/conftest.py` — fixture database test (SQLite in-memory atau MySQL service container), supaya test tidak lagi bergantung DB pengembangan yang sudah di-seed manual
- [ ] Refactor `test_user_service.py`, `test_csv_service.py`, `test_models.py` yang sudah ada dari script manual (`python -m tests.x`) ke gaya pytest (`def test_x(): assert ...`)
- [ ] Tambah test baru untuk fungsi yang belum tercakup: `normalize_kartu()`, `_group_by_controller()`, helper validasi (`_assert_doors_exist` dkk), `_is_online_expr`, `handle_config_response()`

**Frontend:**
- [ ] Install `vitest` (+ `@testing-library/react` untuk test level komponen kalau dibutuhkan nanti), tambah script `"test": "vitest"` di `package.json`
- [ ] `frontend/vitest.config.ts`
- [ ] Test untuk `utils/kartu.ts`, `utils/format.ts`
- [ ] Ekstrak `accessToDoorIds()` (saat ini nempel di `UserDetail.tsx`) dan `toCsv()` (nempel di `AccessLogs.tsx`) ke file util terpisah, baru ditest

**Firmware:**
- [ ] Tambah `[env:native]` di `platformio.ini` + folder `firmware/test/` (konvensi Unity/PlatformIO)
- [ ] Test pertama: `AccessControl::checkAccess()` — kandidat paling bersih (nol ketergantungan hardware)
- [ ] Test `UserStorage::findByKartu()`, `normalizeKartu()`, `ConfigManager::setDefaults()`

**CI:**
- [ ] `.github/workflows/backend-ci.yml` — jalan pytest, filter `paths: backend/**`
- [ ] `.github/workflows/frontend-ci.yml` — `tsc --noEmit`, `npm run build`, `npx oxlint`, `vitest run`, filter `paths: frontend/**`
- [ ] `.github/workflows/firmware-ci.yml` — `pio test -e native`, filter `paths: firmware/**`
- [ ] Aktifkan **required status checks** di Settings → Branches untuk `dev` (PR tidak bisa di-merge kalau ada check merah)

### Deliverable
✅ Setiap PR baru otomatis diverifikasi CI sebelum bisa direview/merge
✅ Minimal 1 test otomatis per layer (backend/frontend/firmware) sebagai fondasi awal

---

## Sprint 2 — Keamanan &amp; Hardening

**Branch:** `feature/security-hardening`
**Estimasi:** ~4 hari
**Folder:** `backend/app/`, `backend/app/mqtt/`, `tools/setup_emqx_auth.py`

### Checklist

**Backend:**
- [ ] Validasi `JWT_SECRET_KEY` wajib diisi &amp; cukup panjang saat startup (gagal boot kalau kosong/lemah, bukan diam-diam jalan)
- [ ] Refresh token — supaya sesi tidak hard-expire tiap 1 jam
- [ ] Rate limiting di `POST /api/auth/login` (mis. `slowapi`)
- [ ] RBAC minimal 2 role (`admin` penuh vs `viewer`/`operator` read-only) — perlu keputusan bersama role apa saja yang relevan
- [ ] HTTPS — minimal via reverse proxy (nginx/Caddy) dengan TLS, bukan langsung expose uvicorn HTTP polos

**MQTT:**
- [ ] Aktifkan TLS di EMQX (port 8883), update backend + firmware pakai koneksi TLS
- [ ] ACL per-topic sungguhan di `tools/setup_emqx_auth.py` (saat ini cuma auth username/password, `ctrl-A` secara teori masih bisa publish ke topic `ctrl-B`)
- [ ] Implementasi LWT (`will_set()`) di publisher backend supaya deteksi offline instan, tidak cuma andalkan timeout heartbeat

### Deliverable
✅ Backend tidak bisa jalan dengan JWT secret lemah/kosong
✅ Login terlindung dari brute-force dasar
✅ Semua trafik backend↔frontend dan backend↔MQTT terenkripsi
✅ Minimal 2 role akses berbeda

---

## Sprint 3 — Firmware Fisik: RFID, Relay &amp; Reliabilitas

**Branch:** `feature/firmware-hardware`
**Estimasi:** ~7 hari (paling tidak pasti — bergantung ketersediaan hardware &amp; hasil keputusan desain)
**Folder:** `firmware/`

⚠️ **Mulai procurement hardware (beli modul RFID, relay, dst) sejak Sprint 1 berjalan** — supaya part sudah di tangan saat giliran sprint ini, bukan baru dipesan setelah sprint 1-2 selesai.

### Keputusan desain yang harus diambil DULU (sebelum coding dimulai)

- [ ] **Fail-safe vs fail-secure** — kalau listrik padam, pintu harus otomatis terbuka (fail-safe, wajib di banyak jalur evakuasi kebakaran) atau tetap terkunci (fail-secure)? Ini bukan keputusan teknis semata, kemungkinan perlu cek kode bangunan/regulasi lokasi pemasangan.
- [ ] Pilihan pembaca RFID: 125kHz (EM4100, lebih murah, lebih gampang diduplikasi) vs 13.56MHz (MIFARE, lebih aman) — pengaruh ke jarak baca &amp; kompatibilitas kartu yang sudah beredar (kalau ada)

### Checklist

**RFID &amp; Aktuator:**
- [ ] Integrasi driver pembaca RFID sungguhan (RC522/PN532, sesuai keputusan di atas), gantikan `SerialSim` sebagai sumber input utama (tetap pertahankan `SerialSim` untuk mode debug/testing tanpa hardware)
- [ ] Kontrol relay/solenoid pintu — `AccessControl::checkAccess()` yang `granted` memicu `digitalWrite()` sungguhan, bukan cuma `Serial.println`
- [ ] Buzzer/LED feedback (opsional, sesuai roadmap v0.2 yang belum sempat dikerjakan)

**Keandalan:**
- [ ] Watchdog timer — device restart otomatis kalau hang, bukan diam total
- [ ] OTA update (`ArduinoOTA` atau setara) — supaya update firmware tidak wajib colok USB fisik per unit
- [ ] Flash encryption/secure boot — kredensial WiFi/MQTT di `config.json` saat ini plaintext, siapa pun yang pegang device bisa ekstrak
- [ ] Kurangi pemakaian `String` Arduino di jalur panas (`MqttManager.cpp` paling berat, 59 pemakaian) — ganti buffer tetap/`std::string` di bagian yang dipanggil sering, supaya tidak fragmentasi heap kalau device nyala berbulan-bulan
- [ ] RTC atau NTP time sync — timestamp `REPLAYED` saat ini cuma estimasi dari `uptime_ms`

**Perbaikan dari v0.2 (item yang sempat dikerjakan lalu di-rollback):**
- [ ] `DEVICE_ID` default firmware (`esp32-ac-001`) tidak cocok controller manapun di seed data — perlu keputusan: daftarkan device_id sungguhan (butuh endpoint `POST /api/controllers` baru, lihat Sprint 4) atau firmware pakai `device_id` yang sudah ada (`ctrl-A`/`ctrl-B`). **Perbaikan ini sempat diterapkan &amp; diverifikasi live saat pengujian v0.2** (device jadi `ctrl-B`, `is_online: true`, Full Sync 49 user berhasil) tapi di-rollback atas permintaan sebelum sempat di-PR — tinggal diterapkan ulang begitu keputusan device_id final diambil.

**Backlog dari v0.2 (dipindah dari `BACKLOG_PENGEMBANGAN.md`):**
- [ ] **WiFi vs Ethernet (W5500)** — evaluasi mode tunggal WiFi-only, Ethernet-only, atau dual/redundant. Termasuk selesaikan masalah reconnect WiFi yang belum tuntas didesain di v0.2 (usulan sementara: throttle reconnect 30 menit — perlu dicek apakah ada pendekatan yang lebih baik, misal exponential backoff)

### Deliverable
✅ Device bisa membaca kartu RFID fisik sungguhan &amp; membuka pintu fisik sungguhan — ini yang bikin project ini benar-benar jadi "access control", bukan simulator
✅ Firmware bisa di-update tanpa colok USB fisik ke tiap unit
✅ Device tahan nyala lama tanpa restart manual

---

## Sprint 4 — Backend: Operasional &amp; Refactor

**Branch:** `feature/backend-ops`
**Estimasi:** ~4 hari
**Folder:** `backend/`, `database/migrations/`

### Checklist

- [ ] Setup Alembic — migrasi skema DB bertahap &amp; ter-versi, bukan lagi SQL manual (`database/migrations/` saat ini cuma berisi rencana, belum ada isinya)
- [ ] Script backup/restore MySQL + dokumentasi disaster recovery dasar
- [ ] `backend/Dockerfile` — kemas aplikasi FastAPI sendiri jadi image, bukan cuma pakai image pihak ketiga untuk MySQL/EMQX
- [ ] Refactor helper validasi yang terduplikasi (`_assert_doors_exist` ada 2 salinan nyaris identik di `routes/users.py` dan `routes/doors.py`) jadi satu fungsi shared
- [ ] Tambah field `error_code` (string pendek, mis. `DUPLICATE_KARTU`) di response error `HTTPException`, berdampingan dengan `detail` yang sudah ada — supaya frontend/log bisa pegang identitas error yang stabil, tidak bergantung teks bahasa
- [ ] Logging terstruktur (JSON log) + endpoint metrics dasar (mis. `/metrics` format Prometheus) — fondasi monitoring, belum perlu dashboard penuh dulu
- [ ] **Backlog dari v0.2:** `POST`/`DELETE /api/controllers` — CRUD controller dinamis lewat admin (saat ini controller cuma bisa ditambah lewat SQL manual). **Klaim di backlog bahwa ini "nol dampak firmware" dan "tanpa perubahan protokol" perlu diverifikasi ulang saat implementasi**, terutama soal provisioning EMQX auth untuk controller baru — apakah benar otomatis lewat auth berbasis MySQL, atau perlu langkah manual tambahan

### Deliverable
✅ Perubahan skema DB bisa di-rollback, tidak lagi manual SQL sekali jalan
✅ Ada jalur backup/restore yang terdokumentasi
✅ Admin bisa daftar/hapus controller lewat UI, tidak perlu akses SQL langsung

---

## Sprint 5 — Fitur Baru &amp; Perbaikan Backlog v0.2

**Branch:** `feature/v0.3-enhancements`
**Estimasi:** ~4 hari
**Folder:** `backend/app/services/csv_service.py`, `frontend/src/pages/Logs/`

### Checklist

- [ ] **Backlog:** Auto-create department saat CSV upload berisi nama department yang belum terdaftar — **dengan syarat**: normalisasi nama department dulu (exact-match case-sensitive saat ini rawan duplikat department mirip-mirip, mis. "IT" vs "I.T" vs "it ", persis kelas bug yang sama dengan normalisasi kartu Jane Smith di v0.2)
- [ ] Export CSV di Access Logs mencakup seluruh rentang tanggal terfilter (fetch semua halaman sebelum export), bukan cuma halaman yang sedang tampil — batasan yang sudah dicatat sejak Sprint 5 v0.2
- [ ] `POST /api/controllers/{id}/config/request` + konsumen frontend untuk `config/response` — item opsional yang sempat ditunda 2 sprint berturut-turut (v0.2 Sprint 3), putuskan apakah memang masih dibutuhkan atau di-drop permanen dari roadmap

### Deliverable
✅ CSV upload lebih toleran terhadap department baru tanpa bikin data kotor
✅ Export CSV benar-benar mencerminkan seluruh data terfilter, bukan cuma yang tampil di layar

---

## Sprint 6 — Produk Fisik (Track Terpisah, Berjalan Paralel)

**Bukan branch/PR kode** — ini keputusan desain hardware &amp; proses procurement/sertifikasi yang melibatkan pihak di luar repository ini. Dicatat di sini supaya tidak hilang dari radar, tapi **tidak menghalangi maupun dihalangi** sprint 1-5 di atas.

### Checklist

- [ ] Desain enclosure — IP rating (tahan debu/air sesuai lokasi pasang), tahan vandal
- [ ] Spesifikasi PoE dan/atau battery backup — supaya perilaku fail-safe/fail-secure (keputusan Sprint 3) tetap terjaga saat listrik padam
- [ ] BOM (Bill of Materials) &amp; estimasi biaya produksi per unit
- [ ] Riset kebutuhan sertifikasi (FCC/CE/RoHS untuk perangkat berradio WiFi; standar access control fisik seperti UL 294/EN 60839 kalau menyangkut jalur evakuasi) — tahap awal cukup riset regulasi mana yang berlaku di target pasar, belum perlu submit sertifikasi
- [ ] Draf manual instalasi &amp; panduan technician lapangan

### Deliverable
✅ Ada gambaran jelas biaya &amp; kelayakan produksi sebelum commit ke manufaktur skala besar

---

## Sprint 7 — Integrasi &amp; Rilis v0.3

**Branch:** `dev` (merge semua feature branch)
**Estimasi:** ~2 hari

### Checklist

- [ ] Merge semua feature branch v0.3 ke `dev`
- [ ] Test end-to-end penuh dengan CI hijau di semua layer (bukan cuma manual seperti v0.2 — ini bedanya, Sprint 1 v0.3 sudah menyediakan otomasinya)
- [ ] Test end-to-end fisik: kartu RFID sungguhan → relay membuka pintu sungguhan → log muncul di dashboard
- [ ] Update `CHANGELOG.md` untuk v0.3.0
- [ ] Update `README.md`
- [ ] Merge `dev` → `main`
- [ ] Tag release: `git tag -a v0.3.0 -m "Release v0.3.0"`
- [ ] Push: `git push origin main && git push origin v0.3.0`

### Deliverable
✅ **v0.3.0 Released** — sistem access control dengan hardware fisik fungsional, CI/CD aktif, dan keamanan production-grade dasar

---

## Pembagian Kerja (usulan, sesuaikan bersama)

| Sprint | @danskiv | @rizzalaulia |
|--------|----------|--------------|
| 1. CI/CD + Testing | Review | ✅ Lead |
| 2. Keamanan | ✅ Berdua | ✅ Berdua |
| 3. Firmware Fisik | ✅ Lead | Review |
| 4. Backend Ops | Review | ✅ Lead |
| 5. Fitur Baru | ✅ Berdua | ✅ Berdua |
| 6. Produk Fisik | ✅ Lead (procurement/hardware) | Review |
| 7. Integrasi &amp; Rilis | ✅ Berdua | ✅ Berdua |

---

## Branch Map (Referensi)

```
main ──────────────────────────────────────────────────────────► v0.3.0
  │
  └── dev (bercabang dari main SETELAH v0.2.0 resmi di-tag)
        ├── feature/ci-cd-testing ──────── Sprint 1 ──► merge ke dev
        ├── feature/security-hardening ─── Sprint 2 ──► merge ke dev
        ├── feature/firmware-hardware ──── Sprint 3 ──► merge ke dev (mulai paralel dgn Sprint 1)
        ├── feature/backend-ops ────────── Sprint 4 ──► merge ke dev
        ├── feature/v0.3-enhancements ──── Sprint 5 ──► merge ke dev
        │        (Sprint 6 — track terpisah, non-kode, tidak ada branch)
        └── (integration testing) ──────── Sprint 7 ──► merge ke main + tag v0.3.0
```
