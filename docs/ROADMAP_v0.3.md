# 🛣️ Roadmap Pengembangan v0.3

> [!IMPORTANT]
> **Revisi 25 Juli 2026 — ditulis ulang total.** Versi sebelumnya disusun sebelum audit
> database/backend/frontend/CI-CD dilakukan, sehingga tidak menyebut mayoritas pekerjaan yang
> sudah diputuskan di [`KEPUTUSAN_ARSITEKTUR_v0.3.md`](KEPUTUSAN_ARSITEKTUR_v0.3.md) (✅ di-ACK & di-merge
> via PR #61, 25 Jul 2026). Roadmap ini disusun **berbasis isi dokumen keputusan tersebut**, bukan
> spekulasi baru — tiap item mereferensikan bagian (`§`) yang menjadi sumbernya.
>
> Aturan branching, commit message, dan proses PR **mengikuti [`CONTRIBUTING.md`](../CONTRIBUTING.md)** —
> tidak berubah. Setiap milestone = 1 feature branch dari `dev`. Merge via PR, minta review, **jangan
> merge sendiri**.

---

## Prasyarat: firmware & hardware harus menutup 2 blocker dulu

Dua item ini **memblokir semua sprint kode** (backend, frontend, database) karena keduanya menentukan
bentuk data yang mengalir lewat MQTT:

| # | Item | Rujukan | Kenapa memblokir |
|---|---|---|---|
| 1 | **Wiegand → `card_id` mapping** — format `%010lu` sudah diputuskan (§2.1), tinggal diimplementasi & diverifikasi di firmware sungguhan | §2.1 | Kalau format kartu firmware tidak cocok `normalize_kartu()` backend, **semua kartu terdaftar tidak match** |
| 2 | **Konflik alokasi pin** — solusi sudah final (`GPIO33/40/47/48/EN`, `GPIO1` digital), tinggal diterapkan ke PCB/skematik | §1.1 | Tanpa ini, firmware fisik tidak bisa dites di board sungguhan |

Selama dua ini belum selesai di sisi firmware, **backend/frontend/database tetap bisa jalan penuh**
memakai `tools/simulate_esp32.py` (diperluas sesuai §7.2) — pola yang sama seperti v0.2.

---

## Overview — 4 track paralel

```
TRACK A — Database & Backend (berurutan, saling bergantung)
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Sprint 1 │──►│ Sprint 2 │──►│ Sprint 3 │──►│ Sprint 4 │
│ CI/CD +  │   │ Skema DB │   │ Backend  │   │ Backend  │
│  Test    │   │ + Migrasi│   │ Handler  │   │ Endpoint │
└──────────┘   └──────────┘   │  MQTT    │   │ + Alarm  │
                               └──────────┘   └──────────┘

TRACK B — Frontend (mulai setelah Sprint 3 backend punya endpoint dasar)
┌──────────┐
│ Sprint 5 │  Tipe, alarm UI, config pintu, RBAC (§6)
│ Frontend │
└──────────┘

TRACK C — Firmware fisik (paralel sejak awal, procurement dari Sprint 1)
┌──────────┐
│ Sprint 6 │  RFID, relay, watchdog, OTA, seq/NVS, MCFA lokal (§2)
│ Firmware │
└──────────┘

TRACK D — Keamanan (paralel, bisa mulai kapan saja setelah Sprint 1)
┌──────────┐
│ Sprint 7 │  RBAC, JWT, MQTT ACL (§5.5)
│ Keamanan │
└──────────┘

Semua bermuara ke:
┌──────────┐
│ Sprint 8 │  Integrasi & Rilis v0.3.0
└──────────┘
```

> **Beda dari draft lama:** sprint lama menaruh "Backend Ops" & "Fitur Baru" belakangan seolah opsional.
> Draft ini menaruh **skema DB & handler MQTT lebih dulu** karena hampir semua fitur v0.3 (alarm, config
> per-pintu, sync) bergantung padanya — lihat matriks dampak §8 KEPUTUSAN: 9 dari 11 fitur besar
> menyentuh backend & frontend sekaligus.

---

## Sprint 1 — CI/CD & Infrastruktur Testing

**Branch:** `feature/ci-cd-testing` · **Rujukan:** §7.0–7.2 KEPUTUSAN

### Kondisi terkini (✅ sudah ada, jangan dikerjakan ulang)
- `backend/pytest.ini`, `backend/requirements-dev.txt`, `backend/tests/{conftest,test_models,test_user_service,test_csv_service}.py`
- `frontend` sudah punya `oxlint`

### Checklist
**Backend:**
- [ ] **Pindahkan test DB dari SQLite ke MySQL service container** (temuan C-a) — `conftest.py`
  sekarang membangun skema dari `Base.metadata.create_all()`, bukan dari `schema.sql`. Ini bikin
  CHECK constraint, `ENUM`, dan `func.timestampdiff()` (`_is_online_expr`) **tidak pernah teruji**
- [ ] Rapikan `conftest.py` jadi fixture pytest standar, bukan seed saat import (temuan C-b)
- [ ] `backend/Dockerfile` — dibuat sebagai bahan artefak rilis (§7.6b), **bukan** pemicu deploy otomatis

**Frontend:**
- [ ] Install `vitest`, tambah script `"test": "vitest"`, buat `vitest.config.ts`
- [ ] Ekstrak `toCsv()` dari `AccessLogs.tsx` dan `accessToDoorIds()` dari `UserDetail.tsx` ke util
      terpisah dulu (prasyarat supaya bisa ditest) — lihat §6.6
- [ ] Test `utils/kartu.ts`, `utils/format.ts`

**Firmware:**
- [ ] Tambah `[env:esp32s3_16mb]` di `platformio.ini` — **`platformio.ini` sekarang masih `[env:esp32dev]`
      ESP32 klasik** (temuan C-c), tidak sesuai target v0.3
- [ ] Tambah `[env:native]` + folder `firmware/test/`
- [ ] Door state machine **wajib ditulis sebagai kelas tanpa `digitalWrite`/`millis` langsung**
      (waktu & IO di-inject) — keputusan desain di §2.4, harus diambil sebelum kode ditulis

**CI (5 workflow gerbang-merge + 1 nightly + 1 rilis, §7.1):**
- [ ] `.github/workflows/backend-ci.yml` — pytest di atas MySQL service container
- [ ] `.github/workflows/frontend-ci.yml` — `tsc --noEmit` → `oxlint` → `vitest run` → `npm run build`
- [ ] `.github/workflows/firmware-ci.yml` — `pio test -e native` + `pio run -e esp32s3_16mb`
- [ ] `.github/workflows/db-ci.yml` — **baru** (§7.2d): jalankan `schema.sql` + migrasi + seed di atas
      `mysql:8.0`, uji CHECK constraint benar-benar menolak nilai terlarang, uji model vs skema tidak
      melenceng, uji `time_zone='+00:00'` aktif (aturan R2)
- [ ] `.github/workflows/contract-ci.yml` — bandingkan tabel STATUS+REASON+EVENT di
      `app/mqtt/codes.py` ↔ `src/constants/codes.ts` ↔ `CONTRACT-CODES-V0.3.md`
- [ ] `.github/workflows/gitleaks.yml`
- [ ] `.github/workflows/integration-ci.yml` — nightly + manual, **bukan** gerbang merge (lambat)
- [ ] Aktifkan required status checks di Settings → Branches untuk `dev`

### Deliverable
✅ CI hijau wajib sebelum merge, test backend jalan di MySQL sungguhan (bukan SQLite)
✅ Firmware bisa dites tanpa hardware fisik (`[env:native]`)

---

## Sprint 2 — Skema Database & Migrasi

**Branch:** `feature/database-v0.3` · **Rujukan:** §4 KEPUTUSAN (D1–D9)

Migrasi ini **backward-compatible** — bisa dijalankan sebelum backend v0.3 mulai, sistem v0.2 tetap
jalan (§4.5). Artefaknya sudah ditulis, sprint ini tinggal menerapkan & memverifikasi.

### Checklist
- [ ] Jalankan [`database/migrations/001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql)
      di database dev/staging, verifikasi terhadap [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid)
- [ ] Perbarui `database/schema.sql` jadi DDL utuh (bukan cuma file delta) untuk instalasi baru
- [ ] Perbarui `database/seed.sql` — 8 baris `doors` butuh nilai config default (`is_active`,
      `open_timeout_s`, `held_timeout_s`, `alarm_duration_s`); tambah 1 admin `viewer` untuk uji RBAC
- [ ] Model SQLAlchemy baru: `app/models/controller_event.py`, `app/models/alarm.py`,
      `app/models/admin_log.py`
- [ ] Perbarui model existing: `Controller` (+15 kolom sync/health), `Door` (+4 kolom config),
      `AccessLog` (`kartu` nullable, +`door_number`/`device_id`/`device_ts`/`device_seq`), `Admin`
      (role `viewer`)
- [ ] Verifikasi `time_zone='+00:00'` di MySQL server & `?init_command` di `app/database.py` (aturan R2)

### Deliverable
✅ Skema v0.3 lengkap (11 tabel) berjalan di database dev, model backend cocok 1:1 dengan skema

---

## Sprint 3 — Backend: Handler MQTT & Kontrak v0.3.1

**Branch:** `feature/backend-mqtt-v0.3` · **Rujukan:** §5.1–§5.2, §5.6–§5.8 KEPUTUSAN

### Checklist
- [ ] **Baru:** `app/mqtt/codes.py` — terjemahan angka↔kode DB untuk STATUS, REASON, **EVENT**
      (0–10), cermin [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md) v0.3.1
- [ ] Rework `handle_log` — 6 field (`seq,card_id,door_number,status,reason,timestamp[,REPLAYED]`),
      toleransi format v0.2 lama, sanity guard RTC (aturan R4), hapus mekanisme `_boot_estimate`
- [ ] **Baru:** `handle_heartbeat` — `uptime_s,rssi,free_heap,total_users`, deteksi reboot dari
      `uptime_s` turun, drift check user count
- [ ] Rework `handle_status` — jadi dispatcher LWT (`ONLINE`/`OFFLINE`) vs heartbeat v0.2 lama
      (deprecated, tetap ditoleransi selama masa transisi) — bentrok topic ini didokumentasikan di §5.1(a)
- [ ] **Baru:** `handle_event` — payload `seq,event_code,door_number,timestamp[,REPLAYED]`,
      perbarui `tamper_state`/`fire_state`/`power_state` di `controllers`
- [ ] Rework `handle_config_response` — validasi `config_version` vs DB, picu reconcile kalau beda
- [ ] **Firmware — wajib bersamaan:** `seq` 32-bit disimpan di NVS ESP32, monoton naik, tidak reset
      saat reboot (mencegah `UNIQUE(device_id, seq)` menolak log sah — ini bug nyata yang sempat
      ditemukan saat review PR #61)
- [ ] `app/services/reconcile_service.py` — worker thread + queue (**bukan** blocking di handler
      MQTT), state machine `sync_state` (§5.2b), backoff, anti-loop 3× gagal < 5 menit
- [ ] Perbarui `sync_service.py` untuk format `users/set` baru (bitmask 4 pintu, ganti dari `1|3`)

### Deliverable
✅ Semua event/log v0.3.1 diproses benar, dedup `seq` teruji, tidak ada handler yang blocking thread paho

---

## Sprint 4 — Backend: Endpoint, Alarm & Keamanan

**Branch:** `feature/backend-endpoints-v0.3` · **Rujukan:** §5.3–§5.5, §5.7 KEPUTUSAN

### Checklist
**Endpoint (E1–E10, §5.3):**
- [ ] `POST`/`DELETE /api/controllers` — verifikasi provisioning EMQX auth untuk controller baru
- [ ] `GET`/`PUT /api/controllers/{id}/doors/config` — bulk config per-pintu
- [ ] `POST /api/controllers/{id}/sync/users` (rename dari `/sync`, alias lama dipertahankan
      deprecated) & `POST .../sync/config`
- [ ] `POST /api/controllers/{id}/doors/{n}/test` — relay test: role `admin` saja, wajib tulis
      `admin_logs`, ditolak kalau controller offline, `duration_ms` dibatasi maks 10 detik
- [ ] `GET /api/alarms` & `POST /api/alarms/{id}/ack`
- [ ] `GET /api/controllers/{id}/health`
- [ ] Tambah `error_code` di semua `HTTPException` baru (backlog v0.2, murah kalau dari awal)

**Alarm lifecycle (§5.7):**
- [ ] `app/services/alarm_service.py` — raise/clear/ack, `UNIQUE(source, source_id)` untuk idempotensi
- [ ] **`cleared_at` ≠ `acked_at`** — kondisi fisik normal lagi bukan berarti admin sudah lihat
- [ ] Anti-badai: alarm aktif yang sama untuk device+door yang sama tidak melahirkan baris baru,
      cukup naikkan penghitung

**Keamanan (§5.5, subset v0.3):**
- [ ] Validasi `JWT_SECRET_KEY` wajib & cukup panjang saat startup
- [ ] Rate limit `POST /api/auth/login` (`slowapi`)
- [ ] RBAC `admin`/`viewer` — `viewer` baca-saja, dilarang aksi fisik (relay test, ack alarm, sync)
- [ ] MQTT ACL per-controller sungguhan di `tools/setup_emqx_auth.py`

**WebSocket (§5.4):**
- [ ] Amplop berversi `{v:1, type, data}` — 4 jenis: `log`, `alarm`, `controller_status`, `sync_state`
- [ ] Log `REPLAYED` tidak dibroadcast sebagai kejadian baru (hindari banjir saat reconnect)

### Deliverable
✅ Admin bisa kelola controller & alarm dari API, RBAC mencegah `viewer` melakukan aksi fisik

---

## Sprint 5 — Frontend: Alarm, Config Pintu & RBAC

**Branch:** `feature/frontend-v0.3` · **Rujukan:** §6 KEPUTUSAN

### Perbaikan yang wajib sebelum fitur baru (temuan audit §6.0b)
- [ ] **`useLiveFeed()` tidak pernah mengirim token** — perbaiki bersamaan dengan aktivasi
      `AUTH_ENABLED` (Sprint 4), kalau tidak live feed mati diam-diam
- [ ] `AccessResult` → `"GRANTED"|"DENIED"|"ALARM"`, filter log tambah opsi `ALARM`
- [ ] `resultColor()`/Badge tambah warna alarm — sekarang `ALARM` tampil sama dengan `DENIED`

### Checklist
- [ ] `constants/codes.ts` — `STATUS_TEXT`, `REASON_TEXT`, `EVENT_TEXT`, fallback `"UNKNOWN"` untuk
      kode asing, test konsistensi vs backend (masuk `contract-ci.yml`)
- [ ] Tab "Pintu" di `ControllerConfigModal.tsx` — grid 4×4 config, validasi `held ≥ open` saat
      mengetik, umpan balik 2 tahap (tersimpan DB → tersinkron controller)
- [ ] `AlarmBanner.tsx` (di `Layout`), halaman `pages/Alarms/Alarms.tsx`, `store/alarmStore.ts` —
      di-seed dari `GET /api/alarms?acked=false`, diperbarui dari WS
- [ ] 2 indikator status controller (`is_online` + `link_state`), 2 tombol sync, Test Relay dengan
      konfirmasi nama pintu + disabled saat offline
- [ ] `hooks/useRole.ts` — aksi terlarang di-disable + tooltip, **bukan** disembunyikan
- [ ] Satu koneksi WS terpusat (`useRealtime()`), reconnect backoff, indikator koneksi di header

### Deliverable
✅ Admin bisa atur config per-pintu & lihat/ack alarm dari dashboard, `viewer` dibatasi dengan benar

---

## Sprint 6 — Firmware Fisik

**Branch:** `feature/firmware-hardware` · **Rujukan:** §1–§2 KEPUTUSAN, §7.2b

⚠️ **Mulai procurement hardware sejak Sprint 1 berjalan.**

### Checklist
- [ ] Terapkan alokasi pin final ke board (`GPIO33/40/47/48/EN`, `GPIO1` Digital Input `MAINS_LOST`,
      `GPIO2` ADC `POWER_LOW`) — §1.1
- [ ] Integrasi RFID sungguhan (RC522/PN532), `normalizeKartu()` format `%010lu` identik dengan backend
- [ ] Kontrol relay/solenoid sungguhan menggantikan `Serial.println`
- [ ] Watchdog eksternal TPS3823-33 → `GPIO47` (WDI) + `EN` (RESET); ULN2003 via pulldown saat reset
- [ ] OTA A/B partition + auto-rollback (gagal boot/crash 3× dalam 10 menit → rollback) — §2.6
- [ ] **Reconnect jaringan wajib non-blocking** — kehilangan koneksi dilarang mengunci loop utama
      atau memicu watchdog reset; kartu/REX tetap diproses lokal saat offline
- [ ] `seq` 32-bit persist di NVS (lihat Sprint 3)
- [ ] Fire lokal: hardware interlock (P-MOSFET cut-off VCC) — **cukup ini untuk v0.3**, MCFA
      lintas-controller resmi ditunda ke v0.4 (§2.5)
- [ ] Event: `AUX_ACTIVE`/`CLEARED`, `TAMPER_OPEN`/`CLOSED`, `FIRE_ACTIVE`/`CLEARED`,
      `MAINS_LOST`/`OK`, `POWER_LOW`/`NORMAL` — payload ikut buffer offline & `REPLAYED`
- [ ] Kurangi pemakaian `String` Arduino di `MqttManager.cpp`

### Deliverable
✅ Kartu fisik → pintu fisik, log & event v0.3.1 terkirim benar, device tahan lama tanpa restart manual

---

## Sprint 7 — Produk Fisik (Track Terpisah, Non-Kode)

**Bukan branch/PR kode.** Berjalan paralel, tidak menghalangi sprint lain.

### Checklist
- [ ] Desain enclosure — IP rating, tahan vandal
- [ ] PoE dan/atau battery backup
- [ ] BOM & estimasi biaya produksi — termasuk 19 poin proteksi dari
      [`HARDWARE-AUDIT-REVIEW-V0.3.md`](HARDWARE-AUDIT-REVIEW-V0.3.md)
- [ ] Riset sertifikasi (FCC/CE/RoHS, UL 294/EN 60839)
- [ ] Draf manual instalasi & panduan technician

### Deliverable
✅ Gambaran biaya & kelayakan produksi sebelum commit ke manufaktur skala besar

---

## Sprint 8 — Integrasi & Rilis v0.3

**Branch:** `dev` (merge semua feature branch) · **Rujukan:** §7.3–§7.6 KEPUTUSAN

### Checklist
- [ ] Merge semua feature branch, CI hijau di semua layer (5 workflow gerbang-merge)
- [ ] Jalankan 8 skenario end-to-end §7.2(d): tap valid, REX+forced-open, offline/reconnect/replay,
      drift heartbeat, `SYNC_ERROR_ATTENTION_REQUIRED`, tamper open/close, config push, reason asing
- [ ] Test end-to-end fisik: kartu RFID sungguhan → relay → log muncul di dashboard
- [ ] Build artefak rilis (§7.6b): `backend`, `frontend dist`, `firmware.bin`, `schema.sql`+migrasi,
      versi ditanam di 3 layer dari tag (`fw_version` terisi — sekarang mustahil terisi tanpa ini)
- [ ] Pasang ke staging (VM, [`pendukung/VM_TESTING_PLAN.md`](pendukung/VM_TESTING_PLAN.md)) dulu,
      **1 controller fisik** sebelum OTA massal
- [ ] Update `CHANGELOG.md`, `README.md`
- [ ] Merge `dev` → `main`, tag `v0.3.0`, push

### Deliverable
✅ **v0.3.0 Released** — hardware fisik fungsional, alarm & RBAC aktif, CI/CD penuh, MCFA lokal
   (lintas-controller resmi di v0.4)

---

## Yang TIDAK masuk v0.3 (ditunda ke v0.4, §5.9/§6.10/§7.1e)

- **MCFA lintas-controller** (`fire_orchestrator`, `fire_assignments`) — butuh desain union-state +
  threat model ACL, lihat §2.5 KEPUTUSAN untuk alasan lengkap (bug jalur evakuasi bersama)
- Auto-reconciliation penuh baru terasa nilainya setelah ada controller yang sering putus-nyambung
  di lapangan — versi dasarnya (Sprint 3) tetap masuk v0.3, yang ditunda adalah penyempurnaan lanjut
- Refresh token, HTTPS wajib, MQTT TLS — kenyamanan/deployment, bukan pemblokir fungsi inti
- Live door monitoring real-time (§6.4)
- Auto-deploy ke server, registry image publik — CD berhenti di artefak (§7.1b)

---

## Pembagian Kerja (usulan, sesuaikan bersama)

| Sprint | @danskiv | @rizzalaulia |
|--------|----------|--------------|
| 1. CI/CD + Testing | Review | ✅ Lead |
| 2. Skema Database | Review | ✅ Lead |
| 3. Backend MQTT | Review | ✅ Lead |
| 4. Backend Endpoint & Alarm | Review | ✅ Lead |
| 5. Frontend | Review | ✅ Lead |
| 6. Firmware Fisik | ✅ Lead | Review |
| 7. Produk Fisik | ✅ Lead (procurement/hardware) | Review |
| 8. Integrasi & Rilis | ✅ Berdua | ✅ Berdua |

---

## Branch Map (Referensi)

```
main ──────────────────────────────────────────────────────────► v0.3.0
  │
  └── dev
        ├── feature/ci-cd-testing ────────── Sprint 1
        ├── feature/database-v0.3 ────────── Sprint 2
        ├── feature/backend-mqtt-v0.3 ────── Sprint 3
        ├── feature/backend-endpoints-v0.3 ─ Sprint 4
        ├── feature/frontend-v0.3 ────────── Sprint 5
        ├── feature/firmware-hardware ────── Sprint 6 (paralel sejak Sprint 1)
        │        (Sprint 7 — track terpisah, non-kode, tidak ada branch)
        └── (integration testing) ────────── Sprint 8 ──► merge ke main + tag v0.3.0
```
