# 🧪 Laporan Sprint 1 — CI/CD & Infrastruktur Testing

> **Branch:** `feature/ci-cd-testing` · **Rujukan:** [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) Sprint 1 +
> [`KEPUTUSAN_ARSITEKTUR_v0.3.md`](KEPUTUSAN_ARSITEKTUR_v0.3.md) §7.0–7.2
> **Status:** selesai dikerjakan, **belum di-commit/push** — menunggu review @rizzalaulia.

Dokumen ini mencatat **apa yang dikerjakan**, **kenapa**, dan **catatan tiap test**, plus **apa yang
sudah diverifikasi jalan di mesin lokal** vs **apa yang baru bisa diverifikasi di CI runner**.

---

## 0. Ringkasan verifikasi lokal

| Layer | Perintah | Hasil lokal |
|---|---|---|
| Backend | `pytest -q` (SQLite lokal) | ✅ **20 passed** |
| Backend | `ruff check .` | ✅ **All checks passed** (1 unused import diperbaiki) |
| Frontend | `vitest run` | ✅ **22 passed** (4 file) |
| Frontend | `tsc --noEmit` | ✅ exit 0 |
| Frontend | `oxlint` | ✅ exit 0 (1 warning pre-existing, bukan dari sprint ini) |
| Firmware | `pio test -e native` | ⚠️ **tidak bisa dijalankan lokal** — mesin dev Windows tanpa `gcc`/`g++`. PlatformIO berhasil collect test + pasang Unity + sampai tahap kompilasi; hanya gagal di pemanggilan gcc. **Akan jalan di CI (runner Ubuntu punya gcc bawaan).** Logika = cermin persis test frontend yang sudah lolos. |
| Contract | `python tools/check_contract_codes.py` | ✅ exit 0 (STATUS=4, REASON=10 ter-parse; backend/frontend PENDING karena `codes.py`/`codes.ts` belum lahir — Sprint 3/5) |
| Semua workflow | validasi YAML | ✅ 7/7 valid |

> **Yang butuh MySQL** (backend-ci @ MySQL, db-ci) tidak dijalankan lokal karena tidak ada MySQL di
> mesin dev — divalidasi struktural, berjalan sungguhan saat CI. Ini justru inti temuan C-a: constraint
> MySQL memang tidak bisa diuji tanpa MySQL, makanya CI wajib memakainya.

---

## 1. Backend

### 1.1 `backend/tests/conftest.py` — ditulis ulang (temuan C-a & C-b)
- **Sebelum:** membangun skema + seed **saat import modul**, di atas file SQLite tetap. Rapuh untuk CI,
  dan SQLite tidak menegakkan ENUM/CHECK/`timestampdiff`.
- **Sesudah:** URL DB dibaca dari env `TEST_DATABASE_URL` (CI → MySQL service container; lokal → SQLite
  default untuk iterasi cepat). Skema & seed dibangun lewat **fixture ber-scope session** (`database`,
  autouse) + fixture `db_session` per-test. Seed dipisah ke fungsi `_seed()`.
- **Kompatibilitas:** test lama tetap jalan tanpa diubah — mekanisme override `app.database.SessionLocal`
  dipertahankan.

### 1.2 `requirements-dev.txt`
- Tambah `ruff` (linter CI), `pymysql` + `cryptography` (driver MySQL untuk test di CI).

### 1.3 `backend/ruff.toml` (baru) + perbaikan
- Konservatif di Sprint 1: hanya menangkap **bug nyata** (pyflakes `F`) + error struktur (`E`,`W`),
  belum gaya. Tujuan: baseline langsung hijau, diperketat bertahap.
- Memperbaiki 1 temuan nyata: `Optional` tak terpakai di `app/services/sync_service.py`.

### 1.4 `backend/Dockerfile` + `.dockerignore` (baru)
- Untuk **artefak rilis** (§7.6b), **bukan** pemicu deploy. `python:3.13-slim`, install
  `requirements.txt` (tanpa dev), HEALTHCHECK ke `/health`. `.dockerignore` menyingkirkan
  venv/test/.env dari image.

### Catatan test backend (20 test, semua sudah ada — sekarang jalan di harness bersih)
| File | Test | Catatan |
|---|---|---|
| `test_models.py` | import + `configure_mappers()`, SELECT tiap model | Membuktikan relationship semua model resolve tanpa error |
| `test_user_service.py` | `resolve_user_access()` — custom vs department, translasi door_id→door_number per controller | Golden: Jane Smith (custom) = `{ctrl-A:[1,2,3], ctrl-B:[2]}` |
| `test_csv_service.py` | `process_user_csv()` — satu test per aturan validasi | Kartu test berprefix `CSVTEST` supaya bersih dari seed asli |

> Sprint berikutnya (§7.2b) menambah test untuk `codes.py`, `handle_log`, state machine reconcile,
> `alarm_service`, RBAC — belum ada karena kode-nya baru lahir di Sprint 3/4.

---

## 2. Frontend

### 2.1 Ekstraksi util (prasyarat test, §6.6)
- `toCsv()` dipindah `AccessLogs.tsx` → **`src/utils/csv.ts`** (+ `CSV_HEADER` diexport).
- `accessToDoorIds()` dipindah `UserDetail.tsx` → **`src/utils/access.ts`**.
- Kedua komponen sumber sekarang meng-import dari util; `tsc --noEmit` bersih.

### 2.2 Vitest
- `package.json`: +`vitest` (dev), script `"test": "vitest run"` & `"test:watch"`.
- `vitest.config.ts`: environment `node` (test util murni belum butuh jsdom; Sprint 5 tambah jsdom
  saat ada test komponen).

### Catatan test frontend (22 test, 4 file)
| File | # | Catatan penting |
|---|:--:|---|
| `kartu.test.ts` | 6 | Kontrak §2.1 — **golden yang sama dipakai backend & firmware**. Pad `%010lu`, hex tidak dipad, kosong tetap kosong (kejadian tanpa kartu) |
| `format.test.ts` | 6 | ⚠️ input ISO **tanpa** suffix `Z` supaya deterministik lintas zona waktu runner (dijelaskan di komentar file) |
| `csv.test.ts` | 5 | Escaping RFC 4180 (kutip digandakan), null → string kosong, koma dalam data tidak merusak kolom |
| `access.test.ts` | 5 | Pemetaan lewat **device_id** bukan controller_id; door.id sengaja tak berurutan supaya membuktikan resolusi lewat `(controller_id, door_number)` |

---

## 3. Firmware

### 3.1 `platformio.ini` — 3 environment (temuan C-c)
- `esp32dev` (lama, dipertahankan), **`esp32s3_16mb`** (target produksi v0.3, baru), **`native`** (test PC).

### 3.2 `src/util/kartu_normalize.h` (baru) + test native
- Fungsi murni `acs::normalizeKartu(std::string)` **tanpa dependensi Arduino** → bisa di-unit-test
  native. Cermin kontrak §2.1.
- **Catatan Sprint 6:** `UserStorage::normalizeKartu` (Arduino String) sebaiknya di-refactor
  mendelegasikan ke fungsi ini supaya satu sumber kebenaran.

### Catatan test firmware (`test/test_kartu_normalize/`, 6 assert)
| Assert | Catatan |
|---|---|
| `test_numeric_padded_to_10` | Format produksi `%010lu` dari Wiegand |
| `test_numeric_over_10_kept` | > 10 digit **tidak** dipotong (memotong = kartu berbeda = berbahaya) |
| `test_hex_uppercased_not_padded` | Kartu warisan v0.2 (AABBCCDD) |
| `test_empty_stays_empty` | Kejadian tanpa kartu (REX/alarm) |

> **Keterbatasan verifikasi:** belum bisa dijalankan di mesin dev (tanpa gcc). Struktur & config
> sudah benar (PlatformIO collect + Unity terpasang). Nilai golden identik dengan `kartu.test.ts`
> yang **sudah lolos** di vitest — jadi risiko logika sangat rendah; CI Ubuntu akan mengeksekusinya.

---

## 4. CI Workflows (`.github/workflows/`)

| # | File | Gerbang merge? | Isi | Catatan |
|---|---|:--:|---|---|
| W1 | `backend-ci.yml` | ✅ | ruff + pytest **@ MySQL 8.0 service** | `TEST_DATABASE_URL` → MySQL; timezone dipaksa UTC (R2) |
| W2 | `frontend-ci.yml` | ✅ | tsc → oxlint → vitest → build | Node 22, `npm ci` |
| W3 | `firmware-ci.yml` | ✅ (native) | `pio test -e native` **keras** + `pio run -e esp32s3_16mb` **soft** | Compile S3 `continue-on-error` di Sprint 1 (port S3 baru Sprint 6) — **jadikan keras nanti** |
| W4 | `db-ci.yml` | ✅ | schema→migrasi→seed di MySQL, **CHECK menolak nilai terlarang**, 11 tabel, timezone | Inti temuan C-a: DDL sungguhan diuji di MySQL |
| W5 | `contract-ci.yml` | ✅ | `check_contract_codes.py` | Tolerant: PENDING kalau `codes.py`/`codes.ts` belum ada, merah kalau melenceng |
| W6 | `gitleaks.yml` | ✅ | secret scan | `fetch-depth: 0` untuk scan riwayat |
| W7 | `integration-ci.yml` | ❌ nightly | MySQL+EMQX, smoke pub/sub roundtrip, kerangka 8 skenario §7.2(d) | Sengaja non-gate (lambat/flaky). Skenario diisi Sprint 3/4 |

### `db-ci.yml` — negatif test (bukti CHECK jalan)
- **4b:** insert `held_timeout_s=10 < open_timeout_s=100` → **harus DITOLAK** DB (`ck_door_held_ge_open`).
  Kalau DB menerima, CI merah. Ini kelas bug yang di SQLite lolos diam-diam.
- **4c:** insert `open_timeout_s=999` (>120) → **harus ditolak** (`ck_door_open_timeout`).

### `tools/check_contract_codes.py` (baru)
- Parse tabel STATUS/REASON dari `CONTRACT-CODES-V0.3.md` (sumber kebenaran) → bandingkan ke
  `codes.py`/`codes.ts` bila ada. Exit 0 kalau konsisten/pending, 1 kalau melenceng.

---

## 5. Yang BELUM dikerjakan Sprint 1 (sesuai batas roadmap)

- **Required status checks di Settings → Branches** untuk `dev` — ini **aksi di UI GitHub oleh admin
  repo**, tidak bisa lewat kode. Perlu @rizzalaulia/@danskiv aktifkan setelah workflow ter-merge:
  jadikan W1–W6 wajib, W7 tidak.
- Test untuk kode yang belum lahir (`codes.py`, handler v0.3, alarm, RBAC) — Sprint 3/4.
- Port firmware ke ESP32-S3 (menjadikan W3 compile-check keras) — Sprint 6.

---

## 6. Daftar file yang disentuh

**Baru:** `.github/workflows/{backend,frontend,firmware,db,contract,gitleaks,integration}-ci.yml` ·
`backend/Dockerfile` · `backend/.dockerignore` · `backend/ruff.toml` ·
`frontend/vitest.config.ts` · `frontend/src/utils/{csv,access}.ts` ·
`frontend/src/utils/{kartu,format,csv,access}.test.ts` ·
`firmware/src/util/kartu_normalize.h` · `firmware/test/test_kartu_normalize/test_kartu_normalize.cpp` ·
`tools/check_contract_codes.py` · dokumen ini

**Diubah:** `backend/tests/conftest.py` · `backend/requirements-dev.txt` ·
`backend/app/services/sync_service.py` (unused import) ·
`frontend/package.json` · `frontend/package-lock.json` ·
`frontend/src/pages/Logs/AccessLogs.tsx` · `frontend/src/pages/Users/UserDetail.tsx` ·
`firmware/platformio.ini`
