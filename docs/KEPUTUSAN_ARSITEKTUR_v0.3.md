# 🧭 Keputusan Arsitektur — v0.3 (Kontrak Terpadu Semua Layer)

> [!IMPORTANT]
> **Status: KERANGKA / DRAFT — belum dibekukan.** Dokumen ini menyatukan seluruh keputusan v0.3 dari
> hardware → firmware → MQTT → backend → database → frontend menjadi **satu kontrak tunggal**, meniru pola
> [`KEPUTUSAN_ARSITEKTUR_v0.2.md`](KEPUTUSAN_ARSITEKTUR_v0.2.md) yang dulu berhasil membuat 2 orang bisa kerja
> paralel tanpa saling menunggu.
>
> **Tujuan:** memunculkan porsi kerja **backend & frontend** yang selama ini under-specified dibanding
> hardware, supaya scope-nya kelihatan dari awal. Isi bagian **🔴 TERBUKA** bersama @danskiv & @rizzalaulia
> sebelum satu baris kode v0.3 ditulis. Setelah semua terisi & disepakati, ubah status jadi **DIBEKUKAN**.

> [!NOTE]
> **Revisi 22 Juli 2026 — §4 (Database), §5 (Backend), §6 (Frontend), §7 (Proses & CI/CD) sudah diisi usulan detail.**
> §4 kini disertai dua artefak siap review: [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid) dan
> [`001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql).
> Checklist keputusan yang ditawarkan ke @danskiv ada di **§4.6 (D1–D8)**.
> Sebelumnya tiga bagian itu cuma daftar pertanyaan satu baris, sementara hardware/firmware sudah punya
> tabel pin, skema partisi, dan daftar komponen. Sekarang isinya sudah setara: daftar handler, tabel
> endpoint + skema request/response, daftar file frontend yang tersentuh, dan matriks CI.
> **Semua isi baru berstatus 🟡 USUL** — hasil audit kode repo saat ini (bukan karangan), tinggal
> di-ACK/ditolak/diubah, bukan didesain dari nol lagi.

**Legend status:** ✅ SUDAH DIPUTUSKAN · 🔴 TERBUKA (wajib diisi) · 🟡 USUL (menunggu ACK)

**Dokumen sumber yang dirujuk:**
[`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) ·
[`PROPOSAL-RANCANGAN-HARDWARE-V0.3.md`](PROPOSAL-RANCANGAN-HARDWARE-V0.3.md) ·
[`HARDWARE-AUDIT-REVIEW-V0.3.md`](HARDWARE-AUDIT-REVIEW-V0.3.md) ·
[`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md) ·
[`ROADMAP_v0.3.md`](ROADMAP_v0.3.md)

---

## 0. Keputusan yang SUDAH Final (konsolidasi)

Biar tidak dibahas ulang — ini sudah disepakati, tinggal dirujuk:

| # | Aspek | Keputusan | Sumber |
|---|---|---|---|
| 0.1 | Mikrokontroler | **ESP32-S3-WROOM-1-N16** (Opsi A, 16MB flash internal, tanpa PSRAM) | Hardware §1 |
| 0.2 | Konektivitas | **W5500 Ethernet** utama, WiFi AP cadangan | Arsitektur §Ringkasan |
| 0.3 | IO Expander | **1× MCP23017** (address 0x20) | Hardware §2A |
| 0.4 | Kode status/reason | **3-lapis: angka (MQTT) → kode (DB) → teks (UI)** | Contract Codes |
| 0.5 | Proteksi hardware | **18 poin audit APPROVED** (fire interlock, snubber, watchdog, charger CN3768, dst) | Hardware Audit |
| 0.6 | Terminal lock | **3-pin NO/NC/COM per pintu** + jumper WET/DRY | Hardware §6 |
| 0.7 | Timezone (arah) | Dinamis ikut server/browser, **bukan** hardcode GMT+7 | Contract Codes §Catatan |

---

## 1. HARDWARE & KELISTRIKAN

### 1.1 Konflik alokasi pin §2B — 🔴 TERBUKA (URGENT)
Solusi teknis sudah diusulkan (tinggal diterapkan Danas ke tabel §2B):
- `GPIO1`/`GPIO2` dobel (relay vs ADC) → relay 1–2 pindah ke `GPIO33`/`GPIO40`
- `GPIO34` dobel (MCP INTA vs watchdog WDI) → WDI pindah ke `GPIO47`
- `GPIO22` **tidak ada di ESP32-S3** → Reader 4 D1 pindah ke `GPIO48`
- Watchdog RESET → pin `EN` (bukan GPIO)
- **KEPUTUSAN:** _(belum diterapkan ke dokumen — tunggu Danas)_

### 1.2 Mekanisme watchdog mematikan relay — 🔴 TERBUKA
`ULN2003` **tidak punya pin ENABLE**. Bagaimana watchdog menaruh relay ke safe-state saat MCU hang?
- **KEPUTUSAN:** _(belum — usul: load-switch MOSFET di suplai koil relay, atau pulldown input ULN saat reset)_

### 1.3 Fail-safe vs fail-secure — 🟡 USUL (perlu ACK)
Disepakati: pemilihan fail-safe/secure **mengikuti doorlock** yang dipasang (bukan urusan controller).
Catatan yang perlu dicantumkan di spec: **fire interlock (potong VCC) hanya melepas maglock (fail-safe)**;
pintu dengan strike (fail-secure) tidak ter-release otomatis oleh jalur fire.
- **KEPUTUSAN:** _(tulis sebagai catatan spec? ya/tidak)_

### 1.4 Catatan wet/dry — 🔴 TERBUKA
- Dioda flyback `1N4007` itu **DC-only** → mode DRY untuk beban AC bermasalah. Perlu diperjelas: DRY = DC saja, atau flyback bisa di-bypass?
- **Belum ada fuse per-pintu di output lock WET** — korslet kabel lock hanya dilindungi fuse utama 5A (relay bisa keburu weld). Tambah PTC per output lock?
- **KEPUTUSAN:** _(belum)_

---

## 2. FIRMWARE & INTEGRASI FISIK

### 2.1 Wiegand → card_id mapping — 🔴 TERBUKA (PALING KRITIS)
Reader Wiegand kirim biner (26/34-bit). Sistem pakai kartu **10-digit ternormalisasi** (`normalize_kartu`).
**Bagaimana angka Wiegand diterjemahkan ke format kartu yang cocok dengan yang sudah tersimpan di DB?**
Kalau salah, semua kartu terdaftar tidak akan match.
- **KEPUTUSAN:** _(belum — ini titik integrasi paling rawan, wajib dijawab sebelum apa pun)_

### 2.2 Sumber waktu RTC — 🔴 TERBUKA
RTC DS3231 di-set awalnya dari mana? (NTP via Ethernet / push dari backend / manual). Kalau RTC ngaco, semua timestamp ngaco.
- **KEPUTUSAN:** _(belum)_

### 2.3 Otoritas waktu untuk log LIVE — 🔴 TERBUKA
Log REPLAYED jelas pakai epoch RTC. Tapi untuk log **live**, waktu otoritatif = backend `NOW()` atau epoch controller?
Catatan: kolom DB `device_uptime_ms` sekarang akan menerima epoch (mismatch makna) — perlu penyesuaian skema/handler.
- **KEPUTUSAN:** _(belum)_

### 2.4 Door state machine — 🟡 USUL
Logika sudah dijelaskan (forced-open, held-open, granted-unopened). Yang belum: timing, debouncing sensor,
edge-case (REX saat forced-open, sensor bounce).
- **KEPUTUSAN:** _(perlu detail implementasi + edge case)_

### 2.5 Aux input & cross-controller trigger — 🔴 TERBUKA
Aux "software-configurable" termasuk **kirim perintah ke controller lain** (MQTT antar-controller). Ini jalur komunikasi baru.
- **KEPUTUSAN:** _(belum — desain topic + siapa broker perantaranya)_

### 2.6 OTA rollback — 🟡 USUL
Disebut "Safe OTA Rollback ke partisi pabrik". Mekanismenya (A/B partition, health check) belum detail.
- **KEPUTUSAN:** _(belum)_

---

## 3. KONTRAK MQTT (harus dibekukan lengkap, bukan cuma reason code)

### 3.1 Daftar topic lengkap v0.3 — 🔴 TERBUKA
Contract Codes baru mencakup payload `logs`. Yang belum dibekukan sebagai satu daftar:
- `access/{id}/logs` (✅ format sudah di Contract Codes)
- `access/{id}/status` → LWT ONLINE/OFFLINE (perubahan dari v0.2)
- `access/{id}/heartbeat` → format baru `uptime_s,rssi,free_heap,total_users` (ganti dari `status` v0.2)
- `access/{id}/config/*` → request/response/sync (per-pintu `dX_`)
- `access/{id}/users/*` → sync (masih sama v0.2?)
- topic tamper / fire / aux / relay-test → **belum didefinisikan**
- **KEPUTUSAN:** _(buat 1 tabel kontrak topic lengkap: topic | arah | payload | QoS | retained?)_

### 3.2 Event non-akses (tamper/fire/aux) dikirim lewat topic apa? — 🔴 TERBUKA
Masuk `logs` (dengan status ALARM) atau topic sendiri?
- **KEPUTUSAN:** _(belum)_

---

## 4. DATABASE — RANCANGAN LENGKAP v0.3 (🟡 USUL, ditawarkan ke @danskiv)

> **Artefak yang sudah dibuat dan siap direview** (keduanya berstatus DRAFT, belum dijalankan ke DB mana pun):
> - [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid) — ERD utuh v0.3 (8 tabel lama + 3 tabel baru)
> - [`../database/migrations/001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql) — DDL delta v0.2 → v0.3, lengkap dengan blok rollback
>
> Bagian di bawah menjelaskan **kenapa** rancangannya begitu, plus opsi yang ditolak — supaya
> @danskiv bisa menolak/mengubah dengan dasar, bukan cuma "oke" atau "jangan".

### 4.0 Prinsip v0.2 yang TIDAK boleh dilanggar rancangan ini (✅ pagar)

Rancangan di bawah sudah dicek terhadap 5 aturan ini — kalau ada usulan tandingan, ia juga harus lolos:

1. **`is_online` dihitung, tidak disimpan** (keputusan v0.2 #8). Kolom telemetry baru adalah *laporan terakhir device*, bukan status turunan — selalu dibaca berpasangan dengan `last_seen`.
2. **Log immutable + snapshot nama** (v0.2 #7). Tabel baru mengikuti pola yang sama (`device_id`, `door_number` di-snapshot).
3. **`door_id` tidak pernah keluar dari backend** (v0.2 #1). Config per-pintu tetap dikirim sebagai `dX_` (nomor lokal).
4. **Kartu tak dikenal tetap di-log** (invariant v0.1). Sekarang diperluas: **kejadian tanpa kartu pun tetap di-log**.
5. **Append-only kode kontrak** (Contract Codes aturan #2). Kode event baru dapat angka berikutnya, arti angka lama tidak pernah diubah.

---

### 4.1 Konfigurasi per-pintu — 🟡 USUL: **kolom di tabel `doors`**

#### Opsi yang dipertimbangkan

| Opsi | Bentuk | Nilai + | Nilai − | Putusan |
|---|---|---|---|---|
| **A** | 4 kolom baru di `doors` | Relasi memang **1:1** dengan pintu; tanpa JOIN; `UNIQUE(controller_id, door_number)` yang sudah ada langsung menjamin tidak ada config ganda | Menambah lebar tabel `doors` | ✅ **USUL DIPAKAI** |
| **B** | Tabel `door_config` (FK ke `doors`) | "Rapi" secara normalisasi | JOIN di tiap query; butuh jaga baris config selalu ada untuk tiap pintu (kalau hilang → pintu tanpa config); tidak ada satu pun kolom yang bisa berulang | ❌ Tolak — normalisasi tanpa manfaat |
| **C** | Kolom `config JSON` di `doors` | Fleksibel, gampang tambah parameter | Tidak bisa di-CHECK oleh DB; validasi pindah 100% ke aplikasi; query/filter susah | ❌ Tolak — parameter ini dipakai untuk keputusan keamanan fisik, harus ditegakkan DB |

#### Rancangan kolom (Opsi A)

| Kolom `doors` | Tipe | Default | Batas (CHECK di DB) | Parameter MQTT |
|---|---|---|---|---|
| `is_active` | `BOOLEAN NOT NULL` | `TRUE` | — | `dX_active` |
| `open_timeout_s` | `SMALLINT UNSIGNED NOT NULL` | `10` | 1–120 | `dX_open_timeout_s` |
| `held_timeout_s` | `SMALLINT UNSIGNED NOT NULL` | `30` | 1–600, **dan ≥ `open_timeout_s`** | `dX_held_timeout_s` |
| `alarm_duration_s` | `SMALLINT UNSIGNED NOT NULL` | `30` | 0–600 (0 = alarm fisik dimatikan) | `dX_alarm_duration_s` |

- **`X` = `doors.door_number`** (1–4), jadi pemetaan DB ↔ MQTT tidak butuh tabel lookup apa pun.
- **Kenapa CHECK di DB, bukan cuma di form?** `held < open` berarti alarm berbunyi sebelum orang sempat
  masuk. Bug seperti ini tidak kelihatan di code review, cuma kelihatan setelah terpasang di lapangan.
- **`config_version` ditaruh di `controllers`, bukan per pintu** — dinaikkan +1 tiap ada perubahan config
  (pintu atau jaringan). Controller melaporkannya balik lewat `config/response`, jadi backend bisa deteksi
  drift dengan **1 perbandingan angka**, bukan membandingkan 16 parameter satu per satu.

**Pertanyaan untuk @danskiv:**
- (a) Firmware menerima config sebagai **key satuan** (`config/set` → `d1_open_timeout_s,10`, 16 pesan) atau **satu pesan bulk**? Ini menentukan bentuk `config/sync` di §3.1.
- (b) `dX_active=false` mematikan **seluruh** peripheral pintu itu (reader, REX, sensor, relay, alarm) sesuai proposal — konfirmasi? Kalau ya, backend juga harus **menolak memberi akses** ke pintu non-aktif, bukan cuma controller yang mengabaikan.
- (c) Default 10/30/30 detik dari proposal — dipakai apa adanya?
- **KEPUTUSAN:** _(Opsi A/B/C? jawaban a–c?)_

---

### 4.2 Event non-akses & ALARM — 🟡 USUL: **2 tabel baru (`controller_events` + `alarms`)**

#### Aturan penempatan yang diusulkan (ini inti keputusannya)

> **Kejadian yang punya PINTU → `access_logs`. Kejadian milik CONTROLLER → `controller_events`.
> Kejadian yang butuh TINDAKAN ADMIN → juga dapat baris di `alarms`.**

| Kejadian | `access_logs` | `controller_events` | `alarms` | Alasan |
|---|:--:|:--:|:--:|---|
| `VALID_ACCESS`, `UNKNOWN_CARD`, dst | ✅ | — | — | Persis seperti v0.2 |
| `VALID_EXIT` (REX, tanpa kartu) | ✅ (kartu NULL) | — | — | Punya pintu → tetap riwayat pintu |
| `DOOR_FORCED_OPEN` / `DOOR_HELD_OPEN` | ✅ (`result='ALARM'`) | — | ✅ | Punya pintu; `result` ENUM sudah mendukung `ALARM` |
| Tamper box dibuka | — | ✅ | ✅ | Tidak ada pintu & kartu |
| Fire alarm aktif | — | ✅ | ✅ | Level controller |
| `POWER_LOW` / `POWER_NORMAL` | — | ✅ | ✅ (hanya `POWER_LOW`) | Level controller |
| Aux input aktif | — | ✅ | ⚠️ tergantung konfigurasi | Bisa cuma informasi, bisa alarm |
| `SYNC_ERROR_ATTENTION_REQUIRED` | — | ✅ (`type='SYNC'`) | ✅ | Alarm yang lahir di **backend**, bukan dari device |
| Boot / OTA rollback | — | ✅ (`INFO`) | — | Diagnosa, bukan alarm |

#### Kenapa `alarms` terpisah, bukan sekadar kolom `acked_at` di dua tabel itu?

- Dashboard butuh **satu query** "alarm yang belum di-ack" (§6.2). Kalau state ack tersebar di 2 tabel,
  setiap tampilan butuh `UNION` — dan tiap tabel baru nanti menambah cabang `UNION` lagi.
- `UNIQUE(source, source_id)` membuat pembuatan alarm **idempoten**: pesan MQTT QoS 1 yang datang dua kali
  atau ikut terbawa `REPLAYED` tidak akan melahirkan alarm ganda. Ini tidak bisa didapat dari kolom ack biasa.
- `access_logs` tetap **immutable** (prinsip §4.0 #2). Menaruh `acked_at` di sana berarti baris log diubah
  setelah ditulis — melanggar aturan yang sudah disepakati di v0.2.
- **Opsi yang ditolak:** semuanya dijejalkan ke `access_logs` dengan `kartu`/`door_id` NULL. Ditolak karena
  tabel log akses jadi berisi baris yang bukan akses, dan setiap query log harus selalu memfilternya.
- **Opsi cadangan kalau tim mau lebih sedikit tabel:** buang `alarms`, taruh `acked_at`/`acked_by` di
  `controller_events` saja, dan alarm pintu (`DOOR_FORCED_OPEN`) ikut ditulis sebagai `controller_events`
  juga (duplikat kecil dari `access_logs`). Lebih sederhana, tapi bayarannya: satu kejadian tercatat di dua tempat.

#### Konsekuensi ke kontrak MQTT (§3.2 jadi bisa ditutup)

Topic `access/{device_id}/events` (QoS 1), tetap **angka di kabel** seperti Contract Codes:

```text
<event_code>,<door_number>,<timestamp_epoch>[,REPLAYED]     # door_number dikosongkan bila tidak relevan
```

**Usulan tabel EVENT (append-only, untuk ditambahkan ke [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md)):**

| Angka | Kode DB | `event_type` | `severity` | Bikin alarm? |
|:---:|---|---|---|:--:|
| `0` | `UNKNOWN` | `SYSTEM` | `WARNING` | — |
| `1` | `TAMPER_OPEN` | `TAMPER` | `ALARM` | ✅ |
| `2` | `TAMPER_CLOSED` | `TAMPER` | `INFO` | — (menutup alarm #1) |
| `3` | `FIRE_ACTIVE` | `FIRE` | `ALARM` | ✅ |
| `4` | `FIRE_CLEARED` | `FIRE` | `INFO` | — |
| `5` | `POWER_LOW` | `POWER` | `WARNING` | ✅ |
| `6` | `POWER_NORMAL` | `POWER` | `INFO` | — |
| `7` | `AUX_ACTIVE` | `AUX` | `INFO` | ⚠️ konfigurasi |
| `8` | `AUX_CLEARED` | `AUX` | `INFO` | — |
| `9` | `BOOT` | `SYSTEM` | `INFO` | — |
| `10` | `OTA_ROLLBACK` | `SYSTEM` | `WARNING` | — |

**Pertanyaan untuk @danskiv:**
- (a) Setuju event **tidak** dicampur ke `logs` dan punya topic `events` sendiri? (§3.2 menunggu ini)
- (b) Event mengirim **pasangan aktif/clear** (`TAMPER_OPEN`/`TAMPER_CLOSED`) atau cuma saat aktif? Rancangan ini mengandalkan pasangan supaya `tamper_state` bisa kembali `OK` tanpa reboot.
- (c) Event ikut masuk buffer offline & di-`REPLAYED` juga, atau kejadian saat offline hilang?
- **KEPUTUSAN:** _(usul 2 tabel / opsi cadangan 1 tabel? ACK tabel angka event?)_

---

### 4.3 Waktu & timezone — 🟡 USUL: 6 aturan eksplisit

| # | Aturan | Kenapa |
|---|---|---|
| **R1** | **Semua kolom waktu di DB = UTC.** Tidak ada kolom yang menyimpan waktu lokal atau offset. | Satu-satunya cara filter rentang tanggal tetap benar lintas zona |
| **R2** | **Sesi/server MySQL dipaksa `time_zone='+00:00'`.** | ⚠️ **Jebakan nyata:** `created_at DEFAULT CURRENT_TIMESTAMP` memakai zona waktu **sesi MySQL**, sedangkan backend menulis `server_ts` dalam UTC. Kalau MySQL jalan di `+07:00`, dua kolom **di baris yang sama** beda 7 jam. Sekarang ini belum diatur di mana pun |
| **R3** | **`server_ts` = waktu KEJADIAN. `created_at` = waktu baris ditulis backend.** Untuk log LIVE keduanya praktis sama; untuk `REPLAYED`, `server_ts` diambil dari `device_ts` (RTC), `created_at` tetap waktu terima | Log offline jadi terurut kronologis di UI tanpa kolom tambahan. Kolom "kapan backend menerima" **sudah ada**, tidak perlu bikin baru |
| **R4** | **Validasi RTC (sanity guard).** `device_ts` ditolak & diganti `NOW()` (+ tandai) kalau: < `2025-01-01` (RTC belum di-set / baterai habis) atau > `NOW() + 5 menit` (RTC ngaco ke depan) | Tanpa ini, satu RTC rusak bisa menaruh log di tahun 2000 dan menghilangkannya dari semua tampilan |
| **R5** | **API selalu mengembalikan ISO-8601 berakhiran `Z`.** Konversi ke waktu lokal **hanya** di browser | Sudah jadi perilaku `handlers.py` sekarang (`.replace("+00:00","Z")`) — dijadikan aturan resmi |
| **R6** | **Filter tanggal dari UI dikirim sebagai rentang UTC**, dihitung dari zona waktu browser | "Log tanggal 21" menurut user = rentang UTC yang bergeser, bukan `DATE(server_ts)='2026-07-21'` |

- **`device_uptime_ms`** (jawaban §2.3): **kolom dipertahankan untuk log v0.2 lama, diisi `NULL` untuk log v0.3.**
  Jangan diisi epoch — nama kolomnya berarti "milidetik sejak boot", memasukkan epoch ke situ membuat
  data lama dan baru tidak bisa dibedakan. Penggantinya kolom baru `device_ts DATETIME(3)`.
- **Konsekuensi ke `handlers.py`:** seluruh mekanisme `_boot_estimate` (rekonstruksi waktu dari uptime)
  **dihapus** untuk jalur v0.3 — itu tambal sulam karena controller v0.2 tidak punya jam.
- **KEPUTUSAN:** _(ACK R1–R6? R2 perlu perubahan konfigurasi MySQL, tolong dicek di mesin @danskiv juga)_

---

### 4.4 ERD v0.3 — 🟡 USUL: **sudah dibuat**, tinggal direview

📄 [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid)

| Tabel | Status | Delta |
|---|---|---|
| `controllers` | **UBAH** | +15 kolom (4 sync, 1 `config_version`, 2 link/LWT, 5 telemetry, 3 health) |
| `doors` | **UBAH** | +4 kolom config per-pintu (§4.1) |
| `access_logs` | **UBAH** | `kartu` → NULLABLE, +`door_number`, +`device_id`, +`device_ts`, +index `(result, server_ts)` |
| `admins` | **UBAH** | `role` → `ENUM('admin','viewer')` |
| `controller_events` | **BARU** | Kejadian non-akses (§4.2) |
| `alarms` | **BARU** | Antrian + acknowledge (§4.2) |
| `admin_logs` | **BARU** | ⚠️ Sudah digambar di [`ERD_v0.2.mermaid`](ERD_v0.2.mermaid) **tapi tidak pernah dibuat** di `schema.sql`. Wajib sekarang karena v0.3 punya endpoint yang **membuka pintu fisik** (relay test, §5.3 E7) |
| `users`, `user_access`, `departments`, `department_access` | Tidak berubah | — |

> Catatan penamaan: ERD v0.2 menyebut tabel auth `ADMIN_USERS`, `schema.sql` yang jalan memakai `admins`.
> ERD v0.3 mengikuti **schema.sql** (yang nyata). Perbedaan ini sebaiknya tidak diwariskan lagi.

### 4.5 Migrasi & urutan penerapan — 🟡 USUL

📄 [`database/migrations/001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql)
(mengikuti konvensi penamaan di [`database/migrations/README.md`](../database/migrations/README.md))

**Sifat penting rancangan ini: migrasi bisa dijalankan LEBIH DULU tanpa merusak apa pun.**
Semua kolom baru punya `DEFAULT` dan semua tabel baru berdiri sendiri; satu-satunya pelonggaran
(`kartu` → NULLABLE) tidak menolak data lama. Artinya **backend v0.2 yang jalan sekarang tetap hidup**
setelah migrasi ini diterapkan — jadi urutan kerjanya bisa:

```
1. Jalankan 001_v0.3_schema_delta.sql   ──► sistem v0.2 TETAP JALAN (DB tidak jadi penghalang)
2. Backend v0.3 mulai mengisi kolom & tabel baru
3. Firmware v0.3 mulai mengirim format baru
4. (v0.4) Alembic dipasang, file SQL ini jadi baseline revision
```

Yang harus ikut diperbarui begitu §4 dibekukan:
- [ ] `database/schema.sql` — DDL utuh untuk instalasi baru (jangan cuma punya file delta)
- [ ] `database/seed.sql` — 8 baris `doors` butuh nilai config default; tambah 1 user `viewer` untuk uji RBAC
- [ ] `backend/app/models/{controller,door,access_log}.py` + model baru `controller_event.py`, `alarm.py`, `admin_log.py`
- [ ] `frontend/src/types/index.ts` — cermin tipe (§6.0)
- [ ] `docs/ERD_v0.2.mermaid` diberi catatan "digantikan ERD_v0.3.mermaid"

- **KEPUTUSAN:** _(ACK file migrasi + urutan penerapan?)_

---

### 4.6 Ringkasan yang ditawarkan ke @danskiv (checklist keputusan §4)

Delapan pertanyaan ini yang benar-benar butuh jawaban; sisanya di atas cuma penjelasan/alasan.

| # | Pertanyaan | Usulan saya | Jawaban |
|---|---|---|---|
| D1 | Config per-pintu: kolom di `doors`, tabel `door_config` terpisah, atau kolom JSON? | **Kolom di `doors`** (§4.1 Opsi A) | _(…)_ |
| D2 | Config dikirim per-key (16 pesan) atau 1 pesan bulk per pintu? | Bulk — butuh konfirmasi kemampuan firmware | _(…)_ |
| D3 | `dX_active=false` mematikan seluruh peripheral pintu? | Ya, **dan** backend ikut menolak memberi akses ke pintu itu | _(…)_ |
| D4 | Event non-akses: topic `events` sendiri atau numpang `logs`? | **Topic `events` sendiri** + tabel `controller_events` | _(…)_ |
| D5 | Tabel `alarms` terpisah, atau kolom ack menempel di tabel event? | **Tabel `alarms` terpisah** (idempoten + log tetap immutable) | _(…)_ |
| D6 | Tabel angka EVENT (0–10) di §4.2 — ACK untuk masuk Contract Codes? | ACK, append-only seperti tabel STATUS/REASON | _(…)_ |
| D7 | Aturan waktu R1–R6, terutama **R2 (`time_zone='+00:00'` di MySQL)** | ACK semua; R2 perlu dicek di mesin masing-masing | _(…)_ |
| D8 | `admin_logs` dibuat sekarang (v0.3) atau ditunda lagi? | **Sekarang** — v0.3 punya endpoint yang membuka pintu fisik | _(…)_ |

---

## 5. BACKEND

> Bagian ini ditulis ulang berdasar **audit kode `backend/` yang ada sekarang**, bukan dari nol.
> Semua path file di bawah nyata dan sudah dicek.

### 5.0 Titik awal: apa yang SUDAH ada di backend (✅ fakta, bukan rencana)

| Komponen | File | Kondisi sekarang |
|---|---|---|
| Router MQTT topic→handler | `backend/app/mqtt/subscriber.py` | 5 topic: `logs`, `status`, `status/lwt`, `sync/result`, `config/response` |
| Handler pesan | `backend/app/mqtt/handlers.py` | `handle_log` (4/5 field + `REPLAYED`), `handle_status`, `handle_lwt` (cuma `logger.info`), `handle_sync_result`, `handle_config_response` (cuma `logger.info`) |
| Sync atomik user | `backend/app/services/sync_service.py` | `run_full_sync()` — blocking `Event.wait(30s)`, retry 2× |
| **WebSocket live feed** | `backend/app/ws/manager.py` + `main.py:/ws/live-feed` | **SUDAH JALAN**, broadcast dict log dari thread paho |
| REST controller | `backend/app/routes/controllers.py` | `GET ""`, `GET/PUT /{id}/config`, `POST /{id}/sync`. **Belum ada POST/DELETE controller** |
| `is_online` | `routes/controllers.py:_is_online_expr` | Dihitung dari `last_seen < heartbeat_s × 3`, tidak disimpan |
| Test | `backend/pytest.ini`, `backend/requirements-dev.txt`, `backend/tests/` | **Sudah pytest** (roadmap Sprint 1 menyebut ini belum ada — sudah tidak akurat) |

> **Konsekuensi penting:** v0.3 backend adalah **rework**, bukan greenfield. Setiap keputusan di bawah
> harus menyebut apakah ia *mengubah* file yang ada atau *menambah* file baru.

---

### 5.1 Handler MQTT v0.3 — 🟡 USUL

#### (a) Bentrokan topic `status` — WAJIB diputuskan lebih dulu
Ini belum tertulis di mana pun dan bisa membuat backend diam-diam salah parse:

| Topic | Arti di v0.2 (kode sekarang) | Arti di v0.3 (proposal) | Status |
|---|---|---|---|
| `access/{id}/status` | **Heartbeat** `total_doors,user_count,free_heap,uptime_ms` | **LWT** `ONLINE`/`OFFLINE` | ⚠️ **BENTROK** |
| `access/{id}/status/lwt` | LWT `online`/`offline` | (dihapus) | Berubah |
| `access/{id}/heartbeat` | — | Heartbeat `uptime_s,rssi,free_heap,total_users` | Baru |

- **USUL:** backend v0.3 **mendukung ketiganya sekaligus selama masa transisi**. `handle_status` jadi
  *dispatcher*: kalau payload `ONLINE`/`OFFLINE` → perlakukan sebagai LWT, kalau CSV 4 angka → heartbeat
  lama (deprecated, log warning). Firmware baru cukup pakai `heartbeat` + `status`. Tanpa ini, satu
  controller lama di lapangan bikin handler crash/salah tulis `last_seen`.
- **KEPUTUSAN:** _(ACK / tolak / usul lain — dan sinkronkan ke §3.1)_

#### (b) Daftar handler final v0.3

| Topic | Handler | File | Sifat |
|---|---|---|---|
| `access/+/logs` | `handle_log` | `handlers.py` | **REWORK** — 5 field angka + epoch |
| `access/+/heartbeat` | `handle_heartbeat` | `handlers.py` | **BARU** |
| `access/+/status` | `handle_status` (dispatcher LWT/legacy) | `handlers.py` | **REWORK** |
| `access/+/sync/result` | `handle_sync_result` | tetap | Tidak berubah |
| `access/+/config/response` | `handle_config_response` | `handlers.py` | **REWORK** — sekarang cuma di-`logger.info`, harus divalidasi vs DB (§5.2) |
| `access/+/events` | `handle_event` | `handlers.py` | **BARU** — tamper/fire/aux/power (lihat §3.2 & §4.2) |

#### (c) Rework `handle_log` — detail yang harus disepakati
Kode sekarang menerima `reason` sebagai **string** dan mencocokkannya ke `VALID_REASONS`
(`handlers.py:20-26`). Kontrak v0.3 mengirim **angka**. Usulan:

1. **File baru `backend/app/mqtt/codes.py`** — satu-satunya tempat terjemahan angka→kode DB, disalin
   persis dari [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md):
   ```python
   STATUS_CODES = {0: "UNKNOWN", 1: "GRANTED", 2: "DENIED", 3: "ALARM"}
   REASON_CODES = {0: "UNKNOWN", 1: "VALID_ACCESS", ..., 9: "INVALID_DOOR_NUMBER"}
   ```
   Angka tak dikenal → `"UNKNOWN"` + `logger.warning`, **tidak pernah raise** (aturan pemeliharaan #1).
2. **Toleransi format lama.** `handle_log` harus bisa membedakan payload v0.2 (reason string) dan v0.3
   (reason angka) — deteksi lewat `field.isdigit()`. Perlu selama simulator & firmware lama masih dipakai.
3. **`card_id` kosong** (REX/alarm) → payload diawali koma. `normalize_kartu("")` harus tidak meledak
   dan menghasilkan `NULL`, tapi kolom `access_logs.kartu` sekarang **`NOT NULL`** (`database/schema.sql`)
   → **butuh migrasi kolom jadi NULLABLE** (masukkan ke §4).
4. **Epoch vs `_boot_estimate`.** Seluruh mekanisme `_boot_estimate` (`handlers.py:28-31, 84-95`) ada
   karena controller v0.2 tidak punya jam. Dengan DS3231, **mekanisme ini dihapus** untuk log v0.3.
- **KEPUTUSAN:** _(ACK butir 1–4? Terutama #3, itu perubahan skema DB)_

---

### 5.2 Auto-reconciliation — 🟡 USUL (desain state machine)

#### (a) Masalah teknis yang belum disadari proposal
`run_full_sync()` **blocking sampai 30 detik × 3 percobaan** (`sync_service.py:47`). Sekarang aman karena
hanya dipanggil dari thread request HTTP. Kalau auto-reconciliation memanggilnya **dari `handle_heartbeat`
(thread paho)**, satu sync macet akan **membekukan seluruh pemrosesan MQTT** untuk semua controller —
log dari controller lain ikut berhenti.

- **USUL:** tambah `backend/app/services/reconcile_service.py` dengan **1 worker thread + queue**.
  Handler MQTT hanya `queue.put(device_id)` lalu langsung `return`. Worker yang menjalankan sync.
- **KEPUTUSAN:** _(ACK worker thread? atau pindah backend ke async penuh — jauh lebih mahal)_

#### (b) State machine per controller

```
        ┌──────────┐  heartbeat total_users == DB
        │  IN_SYNC │◄────────────────────────────────┐
        └────┬─────┘                                 │
             │ drift terdeteksi / LWT ONLINE          │ sync OK
             ▼                                       │
      ┌─────────────┐   queue    ┌──────────┐        │
      │ SYNC_PENDING├───────────►│ SYNCING  ├────────┘
      └─────────────┘            └────┬─────┘
                                      │ gagal (fail_count += 1)
                                      ▼
                          fail_count < 3 ──► SYNC_PENDING (backoff)
                          fail_count ≥ 3 ──► SYNC_ERROR_ATTENTION_REQUIRED (auto-sync OFF)
```

#### (c) Kolom baru di tabel `controllers` (masuk delta ERD §4)

| Kolom | Tipe | Guna |
|---|---|---|
| `sync_state` | `ENUM('IN_SYNC','SYNC_PENDING','SYNCING','SYNC_ERROR_ATTENTION_REQUIRED')` | Ditampilkan di UI (§6.3) |
| `sync_fail_count` | `INT DEFAULT 0` | Anti-loop, reset saat sukses / reset manual admin |
| `last_sync_at` | `DATETIME NULL` | Diagnosa |
| `last_sync_error` | `VARCHAR(100) NULL` | `TIMEOUT` / `MISMATCH` terakhir |

- Anti-loop: **3× gagal dalam < 5 menit** → `SYNC_ERROR_ATTENTION_REQUIRED`, auto-sync mati sampai admin
  menekan tombol sync manual (yang me-reset `sync_fail_count`). Alasan di proposal: mencegah flash wear.
- **Config reconciliation**: proposal minta backend **selalu push** config saat controller ONLINE.
  Perhatian: `config/set` sekarang dibatasi `_SAFE_CONFIG_KEYS = {heartbeat_s, total_doors}`
  (`routes/controllers.py:30`) — parameter `dX_` harus masuk daftar aman ini, sedangkan `wifi_*`/`mqtt_*`
  **tetap tidak boleh** ikut auto-push (vektor bricking, keputusan v0.2 #5 masih berlaku).
- **KEPUTUSAN:** _(ACK state machine + 4 kolom + batasan key aman?)_

---

### 5.3 Endpoint REST v0.3 — 🟡 USUL (daftar lengkap)

| # | Method + Path | Request | Response | Catatan |
|---|---|---|---|---|
| E1 | `POST /api/controllers` | `{device_id, nama, lokasi, total_doors, heartbeat_s, ...}` | `ControllerOut` | Backlog v0.2. **Verifikasi provisioning EMQX auth** (roadmap Sprint 4 sudah menandai klaim "nol dampak" ini perlu dicek) |
| E2 | `DELETE /api/controllers/{id}` | — | `204` | Tolak kalau masih punya `doors` ber-FK log? → **perlu keputusan: cascade / block** |
| E3 | `GET /api/controllers/{id}/doors/config` | — | `[{door_number, active, open_timeout_s, held_timeout_s, alarm_duration_s}]` × 4 | Sumber data §4.1 |
| E4 | `PUT /api/controllers/{id}/doors/config` | array yang sama (bulk, bukan per-pintu) | idem | Bulk supaya UI 4×4 bisa 1× save |
| E5 | `POST /api/controllers/{id}/sync/users` | — | `SyncResultOut` | **Rename** dari `POST /{id}/sync` yang ada sekarang |
| E6 | `POST /api/controllers/{id}/sync/config` | — | `{status, pushed_keys[]}` | Tombol "Sync Config" (§6.3) |
| E7 | `POST /api/controllers/{id}/doors/{n}/test` | `{duration_ms?}` | `202` | Relay test. **Perlu keputusan keamanan: ini membuka pintu fisik dari internet** |
| E8 | `GET /api/alarms?acked=false` | query filter | daftar alarm | Bergantung §4.2 |
| E9 | `POST /api/alarms/{id}/ack` | — | alarm ter-update | Siapa & kapan (audit) |
| E10 | `GET /api/controllers/{id}/health` | — | heartbeat terakhir + `sync_state` + tamper/fire | Konsumsi §6.3 |

**Keputusan turunan yang harus ikut diambil:**
- **E5 rename = breaking change** untuk `frontend/src/api/controllers.ts`. Usul: sediakan `/sync` lama
  sebagai alias yang deprecated selama v0.3, hapus di v0.4.
- **E7 relay test**: usul batasi ke role `admin` saja + selalu tulis `access_logs`/`admin_logs`
  (siapa yang membuka pintu jam berapa). **Jangan** ada endpoint buka pintu tanpa jejak audit.
- **Error code**: roadmap Sprint 4 minta field `error_code` di `HTTPException`. Usul **masuk v0.3**
  dan diterapkan ke semua endpoint baru di atas sejak awal (murah kalau dari awal, mahal kalau retrofit).
- **KEPUTUSAN:** _(coret endpoint yang tidak jadi v0.3 — daftar ini sengaja maksimal)_

---

### 5.4 Real-time / notifikasi — 🟡 USUL

> **Koreksi terhadap draft lama:** pertanyaan "WebSocket?" sudah terjawab — **WS sudah ada dan jalan**
> (`app/ws/manager.py`, endpoint `/ws/live-feed`, klien `frontend/src/ws/liveFeed.ts`). Yang dibutuhkan
> v0.3 bukan bikin baru, tapi **memperluas** kanal yang sudah ada.

- **Masalah:** payload sekarang adalah **objek log polos** (`handlers.py:116-129`) dan frontend
  meng-`JSON.parse` langsung jadi `LiveFeedMessage`. Begitu kita mau kirim alarm & status controller di
  kanal yang sama, tidak ada cara membedakan jenis pesan.
- **USUL — amplop pesan berversi:**
  ```json
  { "v": 1, "type": "log" | "alarm" | "controller_status" | "sync_state", "data": { ... } }
  ```
  Frontend membaca `type`; pesan tanpa `type` diperlakukan sebagai `log` (kompatibel mundur satu rilis).
- **Alarm belum-di-ack disimpan di DB** (bukan cuma broadcast) — kalau admin sedang tidak membuka
  dashboard saat alarm terjadi, alarm tidak boleh hilang. Bentuk tabelnya ikut keputusan §4.2.
- **Batas scope:** notifikasi email/Telegram/push **TIDAK** masuk v0.3.
- **KEPUTUSAN:** _(ACK amplop `{v,type,data}` + alarm persist?)_

---

### 5.5 Keamanan — 🟡 USUL (subset v0.3)

Roadmap Sprint 2 menyebut 8 item. Usulan pemilahan, dengan alasan:

| Item | v0.3? | Alasan |
|---|:--:|---|
| Validasi `JWT_SECRET_KEY` saat startup | ✅ Ya | ~10 baris, mencegah deploy diam-diam tanpa secret |
| Rate limit `POST /api/auth/login` | ✅ Ya | 1 dependency (`slowapi`), tidak menyentuh desain lain |
| `error_code` di response error | ✅ Ya | Dipakai endpoint baru §5.3, murah kalau dari awal |
| RBAC `admin` vs `viewer` | ✅ Ya | **Wajib** kalau E7 (relay test) masuk — jangan sampai viewer bisa buka pintu. Tabel `admins.role` sudah ENUM, tinggal ditambah nilai |
| MQTT ACL per-controller | ✅ Ya | `tools/setup_emqx_auth.py` sekarang cuma auth; tanpa ACL, `ctrl-A` bisa publish alarm palsu atas nama `ctrl-B` |
| Refresh token | 🟡 Tunda | Kenyamanan, bukan keamanan. Bisa v0.4 |
| HTTPS (reverse proxy) | 🟡 Tunda / non-kode | Urusan deployment, tidak memblokir kode. Wajib sebelum keluar LAN |
| MQTT TLS (8883) | 🟡 Tunda | Butuh sinkron dengan firmware (sertifikat di device) — jangan digabung dengan rework protokol di rilis yang sama |
- **KEPUTUSAN:** _(setuju pembagian ini? RBAC dan ACL sengaja ditaruh di "ya" karena fitur baru v0.3 memperbesar dampaknya)_

---

## 6. FRONTEND

> Ditulis ulang berdasar isi nyata `frontend/src/`. Stack terpasang: **React 19 + Vite + TypeScript +
> TailwindCSS 4 + TanStack Query + Zustand + react-router**. Tidak ada library UI/komponen pihak ketiga —
> semua komponen (`Badge`, `Modal`, `Table`, `Toast`, `StatCard`) buatan sendiri. **Tidak ada test runner.**

### 6.0 Titik awal: struktur frontend sekarang (✅ fakta)

| Area | File | Catatan |
|---|---|---|
| Tipe cermin DB | `src/types/index.ts` | `AccessResult = "GRANTED"\|"DENIED"` — **belum ada `ALARM`**; `AccessReason` masih 4 kode v0.2 |
| Live feed WS | `src/ws/liveFeed.ts` | `useLiveFeed()`, auto-reconnect 3 dtk, parse objek log polos |
| Controller | `src/pages/Controllers/Controllers.tsx` + `ControllerConfigModal.tsx` | 1 tombol "🔄 Full Sync", badge Online/Offline |
| Log | `src/pages/Logs/AccessLogs.tsx` | `reason` dirender **apa adanya** (`l.reason ?? "—"`), `toCsv()` masih nempel di file ini |
| Dashboard | `src/pages/Dashboard/Dashboard.tsx` | idem, `resultColor(l.result)` cuma tahu 2 hasil |
| Util | `src/utils/format.ts`, `src/utils/kartu.ts` | Format waktu dd-mm-yyyy hh:mm:ss (keputusan @danskiv) |

---

### 6.1 Halaman config per-pintu — 🟡 USUL

- **Tempat:** **tab baru di `ControllerConfigModal.tsx`** (bukan halaman baru). Alasan: parameter ini
  milik controller, admin sudah membukanya lewat ⚙️ Config; halaman terpisah menambah navigasi tanpa
  menambah informasi.
  - Tab 1 "Jaringan & Umum" = isi modal yang sekarang.
  - Tab 2 "Pintu" = grid **4 pintu × 4 parameter** (`active`, `open_timeout_s`, `held_timeout_s`, `alarm_duration_s`).
- **Perilaku:** satu tombol Save untuk seluruh grid (endpoint bulk E4), bukan save per-pintu.
- **Validasi di klien** (harus sama dengan validasi server, server tetap otoritatif):
  `open_timeout_s` 1–120 · `held_timeout_s` 1–600 · `alarm_duration_s` 0–600 · `held ≥ open`
  (held lebih kecil dari open = alarm bunyi sebelum orang sempat masuk).
- **Pintu non-aktif** (`active=false`) → 3 field lain di-*disable* dan diberi keterangan, bukan disembunyikan.
- **KEPUTUSAN:** _(tab di modal atau halaman sendiri? ACK aturan validasi di atas?)_

---

### 6.2 Tampilan & notifikasi ALARM — 🟡 USUL

- **Prasyarat tipe:** `AccessResult` harus jadi `"GRANTED" | "DENIED" | "ALARM"` dan `AccessReason`
  diganti seluruh 9 kode v0.3 (lihat §6.5). Tanpa ini, TypeScript akan menolak/menyembunyikan bug.
- **Komponen baru:**
  - `src/components/AlarmBanner.tsx` — banner merah persisten di `Layout`, muncul selama masih ada
    alarm belum di-ack. Tetap terlihat di halaman mana pun.
  - `src/pages/Alarms/Alarms.tsx` — daftar alarm + tombol Acknowledge (endpoint E8/E9).
  - `src/store/alarmStore.ts` (Zustand) — alarm aktif di memori, diisi dari WS `type:"alarm"` +
    di-*seed* dari `GET /api/alarms?acked=false` saat halaman dibuka (kalau cuma dari WS, alarm yang
    terjadi sebelum admin login tidak akan pernah tampil).
- **Suara:** usul **ya, tapi opsional & bisa dimatikan** (toggle disimpan di `uiStore`). Browser memblokir
  autoplay sebelum ada interaksi user — perlu diakui sebagai keterbatasan, jangan jadi satu-satunya
  jalur notifikasi.
- **Warna:** GRANTED hijau · DENIED kuning/abu · **ALARM merah**. `resultColor()` di `Dashboard.tsx`
  harus dipindah ke util bersama karena sekarang dipakai 3 tempat.
- **KEPUTUSAN:** _(halaman Alarms terpisah atau cukup filter di Access Logs? suara: ya/tidak?)_

---

### 6.3 Status controller lebih kaya — 🟡 USUL

Perubahan pada `Controllers.tsx`:

| Kolom / aksi | Sekarang | v0.3 |
|---|---|---|
| Status | Badge Online/Offline dari `is_online` (hitungan `last_seen`) | Tetap, **tapi sumbernya LWT** — jelaskan di UI mana yang "OFFLINE by LWT" vs "diam melewati 3× heartbeat" |
| Sync | 1 tombol "🔄 Full Sync" | **2 tombol**: "Sync Database" (E5) & "Sync Config" (E6) |
| Sync state | — | Badge `IN_SYNC` / `SYNCING` / **`SYNC_ERROR_ATTENTION_REQUIRED` (merah)** |
| Health | — | Ikon tamper / fire / power (`POWER_NORMAL`/`POWER_LOW`), uptime, RSSI, `total_users` (E10) |

- **Sumber data:** kolom tabel dari `GET /api/controllers` (polling TanStack Query seperti sekarang);
  perubahan `sync_state` & tamper/fire didorong lewat WS supaya tidak menunggu polling.
- **Konsistensi istilah:** UI memakai label **Bahasa Indonesia**, sedangkan **kode status/reason
  ditampilkan English uppercase** sesuai Contract Codes. Ini campuran yang disengaja — **perlu
  di-ACK eksplisit**, jangan sampai nanti setengah diterjemahkan.
- **KEPUTUSAN:** _(ACK 2 tombol + badge sync_state + campuran bahasa?)_

---

### 6.4 Live door monitoring — 🟡 USUL: **TUNDA ke v0.4**

Alasan konkret (bukan sekadar "hemat waktu"):
- Butuh **topic MQTT status pintu real-time** yang belum ada di §3.1 dan belum ada di firmware —
  artinya ini menambah kerjaan hardware juga, bukan cuma frontend.
- Butuh backend menyimpan *current state* per pintu (state, bukan event) — model data baru.
- Nilai operasionalnya sebagian **sudah tercakup** alarm `DOOR_HELD_OPEN` (§6.2): pintu yang terbuka
  terlalu lama tetap terdeteksi tanpa panel live.
- **KEPUTUSAN:** _(tunda? kalau tidak, ia harus masuk §3.1 sebagai topic baru sekarang juga)_

---

### 6.5 Tabel terjemahan kode → teks — 🟡 USUL

- **Lokasi:** `src/constants/codes.ts` — satu file, dua `Record<string, string>` (`STATUS_TEXT`,
  `REASON_TEXT`), plus helper `reasonText(code)` yang mengembalikan `"UNKNOWN"` untuk kode asing
  (**tidak boleh render string kosong / crash** — aturan pemeliharaan kontrak #1).
- **Log `REPLAYED`** ditampilkan sebagai sufiks `" (REPLAYED)"`, sesuai contoh di Contract Codes —
  jadi helper-nya `reasonText(code, isReplayed)`.
- **Bahaya duplikasi:** tabel yang sama akan ada di 3 tempat (`firmware` angka, `backend/app/mqtt/codes.py`,
  `frontend/src/constants/codes.ts`). **Usul mitigasi:** satu test di CI yang membandingkan daftar kode
  backend vs frontend (§7.2), supaya drift ketahuan otomatis, bukan saat demo.
- **KEPUTUSAN:** _(ACK lokasi file + test konsistensi di CI?)_

---

### 6.6 Daftar file frontend yang tersentuh v0.3 — 🟡 USUL (untuk estimasi)

| Aksi | File |
|---|---|
| **Baru** | `constants/codes.ts`, `components/AlarmBanner.tsx`, `pages/Alarms/Alarms.tsx`, `store/alarmStore.ts`, `api/alarms.ts`, `pages/Controllers/DoorConfigTab.tsx`, `utils/resultColor.ts` |
| **Ubah** | `types/index.ts` (ALARM + 9 reason + field sync/health), `ws/liveFeed.ts` (amplop `{v,type,data}`), `pages/Controllers/Controllers.tsx` (2 tombol + kolom), `ControllerConfigModal.tsx` (tab), `pages/Logs/AccessLogs.tsx` + `Dashboard.tsx` (render kode→teks), `components/Layout.tsx` (banner), `api/controllers.ts` (endpoint baru) |
| **Ekstrak (dari roadmap Sprint 1)** | `toCsv()` keluar dari `AccessLogs.tsx`, `accessToDoorIds()` keluar dari `UserDetail.tsx` — prasyarat supaya bisa ditest |

> **Kesimpulan porsi kerja:** 7 file baru + 8 file diubah. Ini **bukan** "tinggal nambah kolom tabel" —
> setara dengan satu sprint penuh sendiri, dan itu sebelum menghitung test.

---

## 7. PROSES, CI/CD & SCOPE

### 7.0 Kondisi terkini (✅ fakta, hasil cek repo)

| Hal | Kondisi |
|---|---|
| `.github/workflows/` | **Tidak ada sama sekali** — belum ada CI apa pun |
| Test backend | **Sudah pytest**: `backend/pytest.ini`, `backend/requirements-dev.txt`, `backend/tests/{conftest,test_models,test_user_service,test_csv_service}.py` |
| Test frontend | **Nol** — `package.json` tidak punya `vitest` maupun script `test` |
| Test firmware | Belum ada `[env:native]` / folder `firmware/test/` |
| Lint | `oxlint` sudah ada di frontend (`npm run lint`); backend belum ada linter |
| Secret scanning | Belum ada (gitleaks) |
| Branch protection | Belum aktif |

> **Koreksi ke roadmap:** [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) Sprint 1 menulis pytest & `requirements-dev.txt`
> sebagai pekerjaan yang belum ada. Keduanya **sudah ada**. Sisa kerja Sprint 1 lebih kecil dari yang tertulis
> di sisi backend, tapi **frontend benar-benar dari nol**.

---

### 7.1 CI/CD — 🟡 USUL

#### (a) Kapan mulai
- **USUL: SEBELUM baris kode fitur v0.3 pertama, dan ini blocking.** Alasannya bukan idealisme —
  v0.3 mengubah **kontrak lintas layer** (format log, topic, tipe frontend). Kelas bug yang paling
  mungkin muncul adalah "backend dan frontend tidak sepakat kode", dan itu persis yang bisa
  ditangkap otomatis oleh test kontrak (§7.2) dan **tidak bisa** ditangkap review manual dengan andal.
- Biayanya ~1–2 hari (backend sudah setengah jalan), bukan 4 hari seperti estimasi roadmap.

#### (b) Matriks workflow

| Workflow | File | Trigger `paths` | Isi |
|---|---|---|---|
| Backend | `.github/workflows/backend-ci.yml` | `backend/**` | `pip install -r requirements-dev.txt` → `pytest` |
| Frontend | `.github/workflows/frontend-ci.yml` | `frontend/**` | `tsc --noEmit` → `oxlint` → `vitest run` → `npm run build` |
| Firmware | `.github/workflows/firmware-ci.yml` | `firmware/**` | `pio test -e native` (+ `pio run` compile check) |
| Kontrak | `.github/workflows/contract-ci.yml` | `backend/**`, `frontend/**`, `docs/CONTRACT-CODES-V0.3.md` | Bandingkan tabel kode backend ↔ frontend ↔ dokumen (§7.2c) |
| Secret | `.github/workflows/gitleaks.yml` | semua PR | Scan credential; repo ini menyimpan config MQTT/DB |

- **Branch protection `dev`**: required status checks = 5 workflow di atas. Sesuai
  [`CONTRIBUTING.md`](../CONTRIBUTING.md) & roadmap: **jangan merge sendiri**.
- **KEPUTUSAN:** _(ACK "CI dulu, blocking"? ACK 5 workflow — terutama `contract-ci` yang tidak ada di roadmap?)_

#### (c) Yang TIDAK masuk v0.3
Deployment otomatis (CD sungguhan), build image Docker di CI, release otomatis. `backend/Dockerfile`
(roadmap Sprint 4) boleh dibuat, tapi **tanpa** pipeline deploy — infrastrukturnya belum ada.

---

### 7.2 Strategi test tanpa hardware fisik — 🟡 USUL

Ini yang membuat backend/frontend **tidak perlu menunggu PCB jadi**.

#### (a) Perluas simulator (`tools/simulate_esp32.py`)
Simulator harus bisa memancing **semua** jalur baru, minimal:
- Kirim log format v0.3 (5 field angka + epoch), termasuk `card_id` kosong untuk REX/alarm.
- Trigger `DOOR_FORCED_OPEN`, `DOOR_HELD_OPEN`, `VALID_*_UNOPENED` lewat perintah interaktif.
- Publish `heartbeat` dengan `total_users` **sengaja salah** → memancing drift-check §5.2.
- Publish `status` = `OFFLINE`/`ONLINE` (LWT) dan LWT sungguhan (putus koneksi mendadak).
- Mode "controller nakal": gagal balas `sync/result` 3× berturut → memaksa `SYNC_ERROR_ATTENTION_REQUIRED`.
- Event tamper/fire/aux (begitu §3.2 diputuskan).

#### (b) Test level unit/integrasi
| Layer | Yang wajib ditest di v0.3 |
|---|---|
| Backend | `codes.py` (semua angka + angka asing → `UNKNOWN`), `handle_log` (v0.2 vs v0.3, kartu kosong, `REPLAYED`), state machine reconcile (3× gagal → error state), validasi param pintu |
| Frontend | `reasonText()` (termasuk kode asing & `REPLAYED`), `toCsv()`, `accessToDoorIds()`, `normalizeKartu` |
| Firmware | `checkAccess()`, door state machine (forced/held/unopened) **sebagai logika murni** — dipisah dari driver GPIO supaya bisa dites di `[env:native]` tanpa board |

> Catatan untuk @danskiv: agar poin firmware itu mungkin, **door state machine harus ditulis sebagai
> kelas tanpa akses langsung ke `digitalWrite`/`millis`** (waktu & IO di-inject). Ini keputusan desain
> firmware yang harus diambil sekarang, bukan setelah kode jadi.

#### (c) Test kontrak lintas layer (usul baru, tidak ada di roadmap)
Satu tabel *golden payload* — persis contoh di [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md)
("Contoh Payload Real & Terbaca") — dipakai sebagai **fixture bersama**: backend memastikan payload →
kode DB benar, frontend memastikan kode DB → teks UI benar. Kalau ada yang mengubah arti angka, CI merah.

- **KEPUTUSAN:** _(ACK (a)(b)(c)? siapa yang mengerjakan perluasan simulator — ini pekerjaan backend, bukan firmware)_

---

### 7.3 Keputusan scope — 🟡 USUL: **DIPECAH**

Rekomendasi: **jangan satu rilis besar.** Dasar pertimbangan dari §8 — 6 dari 8 fitur menyentuh 6 layer
sekaligus, artinya satu rilis besar = satu titik integrasi raksasa di akhir, persis pola yang bikin v0.2
molor.

| Rilis | Isi | Kriteria selesai |
|---|---|---|
| **v0.3.0** | CI/CD + test (§7.1–7.2) · kontrak MQTT dibekukan (§3) · delta DB (§4) · rework handler log/heartbeat/LWT + `codes.py` (§5.1) · config per-pintu end-to-end (E3/E4 + §6.1) · ALARM masuk DB & tampil (§6.2 minimal: badge + halaman log) · hardware + firmware fisik | Kartu fisik → pintu fisik → log & alarm tampil benar di dashboard, CI hijau |
| **v0.3.1 / v0.4** | Auto-reconciliation penuh (§5.2) · relay test E7 · alarm ack + banner + suara · live door monitoring (§6.4) · refresh token, HTTPS, MQTT TLS | Sistem bisa dioperasikan tanpa terminal |

**Alasan pemisahan spesifik:** auto-reconciliation (§5.2) butuh worker thread + 4 kolom DB + state machine,
dan **nilainya baru terasa setelah ada controller yang benar-benar sering putus-nyambung di lapangan** —
sesuatu yang belum bisa diamati sebelum v0.3.0 terpasang.

- **KEPUTUSAN:** _(pecah seperti di atas / satu rilis / garis pemisah lain?)_

---

### 7.4 Urutan kerja & siapa memblokir siapa — 🟡 USUL

Yang harus dijawab **paling dulu** karena memblokir orang lain:

| Prioritas | Item | Memblokir |
|:--:|---|---|
| 1 | §2.1 Wiegand → `card_id` mapping | **Semua.** Kalau format kartu tidak cocok DB, tidak ada yang jalan |
| 2 | §3.1 tabel topic lengkap + §5.1(a) bentrok `status` | Backend & firmware tidak bisa mulai koding protokol |
| 3 | §4.1–4.3 delta skema DB (termasuk `kartu` NULLABLE) | Backend, lalu frontend |
| 4 | §7.1 CI aktif | Semua PR sesudahnya |
| 5 | §6.5 lokasi tabel kode | Frontend |

Setelah 1–3 dijawab, **backend & frontend bisa jalan paralel penuh dengan firmware** — sama seperti pola
v0.2 yang berhasil (lihat [`KEPUTUSAN_ARSITEKTUR_v0.2.md`](KEPUTUSAN_ARSITEKTUR_v0.2.md) §2: "yang
menghubungkan hanya dokumen kontrak").

### 7.5 Definition of Done per layer — 🟡 USUL

Sebuah fitur v0.3 baru boleh disebut selesai kalau: **(1)** ada test otomatis yang gagal sebelum fitur dibuat,
**(2)** CI hijau, **(3)** bisa didemokan lewat simulator tanpa hardware, **(4)** kontrak yang dipakainya
sudah tertulis di dokumen ini — bukan cuma di kepala yang mengerjakan.
- **KEPUTUSAN:** _(ACK 4 syarat ini?)_

---

## 8. Matriks Dampak per Layer (biar porsi kerja kelihatan)

Centang layer yang tersentuh tiap fitur baru — memperlihatkan bahwa backend/frontend **tidak lebih ringan** dari hardware:

| Fitur baru v0.3 | HW | Firmware | MQTT | DB | Backend | Frontend |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Door state machine (forced/held) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Config per-pintu (`dX_`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ALARM / tamper / fire | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Aux input + cross-controller | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-reconciliation | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| RTC / timestamp | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Wiegand reader | ✅ | ✅ | — | — | — | — |
| 2 tombol sync | — | ✅ | ✅ | — | ✅ | ✅ |

> Kesimpulan: dari 8 fitur besar, **6 menyentuh backend & frontend**. Porsi software v0.3 setara (atau lebih besar) dari hardware — harus didesain dengan kedalaman yang sama.

**Bukti konkret setelah §5–§7 diisi (revisi 22 Juli 2026):**

| Layer | Wujud kerja v0.3 | Rujukan |
|---|---|---|
| Database | **3 tabel baru** (`controller_events`, `alarms`, `admin_logs`) · **+22 kolom** di 3 tabel lama (15 `controllers`, 4 `doors`, 3 `access_logs`) · 4 CHECK constraint · 1 kolom dilonggarkan (`kartu`) · aturan waktu R1–R6 | §4.1–4.5 |
| Backend | 1 modul baru (`codes.py`) + 1 service baru (`reconcile_service.py` + worker thread) · 5 handler MQTT di-rework/ditambah · **10 endpoint** baru/berubah · amplop WS berversi · 5 item keamanan | §5.1–5.5 |
| Frontend | **7 file baru + 8 file diubah** · tipe inti (`AccessResult`/`AccessReason`) berubah → menyentuh hampir semua halaman · 1 halaman baru + 1 tab baru + 1 store baru | §6.1–6.6 |
| Proses | **5 workflow CI dari nol** · test runner frontend dari nol · perluasan simulator · test kontrak lintas layer | §7.1–7.2 |

> Artinya: kalimat "scope backend/frontend belum matang" sekarang sudah punya angka. Yang tersisa bukan
> lagi *mendesain*, tapi **memangkas** — pakai §7.3 untuk memutuskan mana yang v0.3.0 dan mana yang ditunda.

---

## 9. Riwayat Pembekuan

_(Isi saat dokumen diubah dari DRAFT → DIBEKUKAN: tanggal, siapa yang menyepakati, ringkasan item yang ditutup.)_
