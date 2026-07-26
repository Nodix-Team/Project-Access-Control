# 🧭 Keputusan Arsitektur — v0.3 (Kontrak Terpadu Semua Layer)

> [!IMPORTANT]
> **Status: 🟡 REKOMENDASI FINAL DANAS — Menunggu Review Akhir Emping (@rizzalaulia).**
> Dokumen ini berisi **keputusan & rekomendasi final dari Danas (@danskiv)** untuk alokasi pin, normalisasi Wiegand, skema DB, backend, dan CI/CD.
> Jawaban dari sisi Danas sudah final. Dokumen ini diajukan ke Emping (@rizzalaulia) untuk di-review/ACK akhir sebelum dibekukan penuh bersama. Jika ada masukan/penyesuaian dari Emping, Danas siap menyesuaikan.

> [!NOTE]
> **Revisi 24 Juli 2026 — Jawaban & Rekomendasi Final Danas.**
> **Seluruh item checklist** (§1 hingga §7) telah diisi dengan **jawaban & rekomendasi final dari @danskiv** dan siap direview sepenuhnya oleh @rizzalaulia.
> Artefak pendukung [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid) dan [`001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql)
> telah disesuaikan sepenuhnya untuk menyelaraskan urutan log (`seq`) dan penjadwalan MCFA silang ke v0.4.

**Legend status:** ✅ SUDAH DIPUTUSKAN & DI-ACK · 🔴 TERBUKA · 🟡 USUL/DRAFT (belum dibekukan)

### Peta status per bagian

> **Status keseluruhan (25 Jul 2026): direview & di-ACK @rizzalaulia, di-merge ke `dev` via PR #61
> (merge commit `8ff0f21`).** Semua checklist (§1.1 & §2.1, D1–D9, B1–B8, C1–C8) sudah terjawab dan
> tidak ada lagi `🔴 TERBUKA` tersisa di §1–§7. F1–F8 (frontend) adalah keputusan internal
> @rizzalaulia, tidak pernah menunggu ACK pihak lain.

| § | Bagian | Status | Catatan |
|---|---|---|---|
| 0 | Keputusan final | ✅ 7 item | — |
| 1 | Hardware & kelistrikan | ✅ **DIPUTUSKAN & DI-ACK** | Pin §1.1, PTC per-pintu — lihat §9.1 riwayat |
| 2 | Firmware & integrasi fisik | ✅ **DIPUTUSKAN & DI-ACK** | §2.1–§2.6, termasuk MCFA fire lokal vs v0.4 (§2.5) |
| 3 | Kontrak MQTT | ✅ **DIPUTUSKAN & DI-ACK** | §3.1–§3.2, tabel topic final v0.3.1 |
| 4 | **Database** | ✅ **DIPUTUSKAN & DI-ACK** | D1–D9, migrasi `001_v0.3_schema_delta.sql` |
| 5 | **Backend** | ✅ **DIPUTUSKAN & DI-ACK** | B1–B8 |
| 6 | **Frontend** | ✅ **DIPUTUSKAN** (internal @rizzalaulia) | F1–F8 |
| 7 | **Proses, CI/CD, test & deployment** | ✅ **DIPUTUSKAN & DI-ACK** | C1–C8 |

> **Yang masih perlu tindak lanjut BUKAN di dokumen ini, tapi di dokumen turunannya** (lihat §9.2 &
> §9.4): `ROADMAP_v0.3.md`, `ARCHITECTURE-PROPOSAL-V0.3.md`, dan `HARDWARE-AUDIT-REVIEW-V0.3.md`
> masih perlu disamakan dengan keputusan final di sini.

**Dokumen sumber yang dirujuk:**
[`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) ·
[`PROPOSAL-RANCANGAN-HARDWARE-V0.3.md`](PROPOSAL-RANCANGAN-HARDWARE-V0.3.md) ·
[`HARDWARE-AUDIT-REVIEW-V0.3.md`](HARDWARE-AUDIT-REVIEW-V0.3.md) ·
[`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md) ·
[`ROADMAP_v0.3.md`](ROADMAP_v0.3.md)

**Artefak yang dihasilkan dokumen ini:**
[`ERD_v0.3.mermaid`](ERD_v0.3.mermaid) ·
[`../database/migrations/001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql)

---

## 0. Keputusan yang SUDAH Final (konsolidasi)

Biar tidak dibahas ulang — ini sudah disepakati, tinggal dirujuk:

| # | Aspek | Keputusan | Sumber |
|---|---|---|---|
| 0.1 | Mikrokontroler | **ESP32-S3-WROOM-1-N16** (Opsi A, 16MB flash internal, tanpa PSRAM) | Hardware §1 |
| 0.2 | Konektivitas | **W5500 Ethernet satu-satunya jalur MQTT/backend.** WiFi **bukan cadangan MQTT** — hanya Hotspot AP lokal saat tombol `GPIO37` ditekan, untuk Web Config 8081 | Arsitektur §Ringkasan-2 |
| 0.3 | IO Expander | **1× MCP23017** (address 0x20) | Hardware §2A |
| 0.4 | Kode status/reason | **3-lapis: angka (MQTT) → kode (DB) → teks (UI)** | Contract Codes |
| 0.5 | Proteksi hardware | **18 poin audit APPROVED** (fire interlock, snubber, watchdog, charger CN3768, dst) | Hardware Audit |
| 0.6 | Terminal lock | **3-pin NO/NC/COM per pintu** + jumper WET/DRY | Hardware §6 |
| 0.7 | Timezone (arah) | Dinamis ikut server/browser, **bukan** hardcode GMT+7 | Contract Codes §Catatan |

---

## 1. HARDWARE & KELISTRIKAN

### 1.1 Konflik alokasi pin §2B — 🟡 REKOMENDASI FINAL DANAS
Solusi teknis sudah diusulkan (tinggal diterapkan Danas ke tabel §2B):
- `GPIO1`/`GPIO2` dobel (relay vs ADC) → relay 1–2 pindah ke `GPIO33`/`GPIO40`
- `GPIO34` dobel (MCP INTA vs watchdog WDI) → WDI pindah ke `GPIO47`
- `GPIO22` **tidak ada di ESP32-S3** → Reader 4 D1 pindah ke `GPIO48`
- Watchdog RESET → pin `EN` (bukan GPIO)
- **Rekomendasi Final Danas:**
  - Relay 1–2 pindah ke **`GPIO33`** & **`GPIO40`**. WDI ke **`GPIO47`**. Reader 4 D1 ke **`GPIO48`**. Watchdog RESET ke **`EN`**.
  - **`GPIO2`** (ADC) khusus membaca voltase Rel 12V Utama untuk mendeteksi `POWER_LOW` (baterai drop).
  - **`GPIO1`** diubah desainnya dari ADC menjadi **Digital Input** (opsional) untuk mendeteksi `MAINS_LOST` (kabel terhubung ke AC Fail Relay dari Smart PSU atau External AC Relay).
- **KEPUTUSAN:** 🟡 **REKOMENDASI FINAL DANAS**.

### 1.2 Mekanisme watchdog mematikan relay — 🟡 REKOMENDASI FINAL DANAS
`ULN2003` **tidak punya pin ENABLE**. Bagaimana watchdog menaruh relay ke safe-state saat MCU hang?
- **Rekomendasi Final Danas:** ULN2003 dikontrol via pulldown input ULN saat watchdog reset.
- **KEPUTUSAN:** 🟡 **REKOMENDASI FINAL DANAS**.

### 1.3 Fail-safe vs fail-secure — 🟡 REKOMENDASI FINAL DANAS
Disepakati: pemilihan fail-safe/secure **mengikuti doorlock** yang dipasang.
Catatan yang perlu dicantumkan di spec: **fire interlock (potong VCC) hanya melepas maglock (fail-safe)**.
- ⚠️ **Dampak ke software (baru, lihat §5.8):** karena fire interlock memutus VCC **tanpa lewat controller**, semua maglock terlepas dan controller akan melaporkan `DOOR_FORCED_OPEN` beruntun.
- **Rekomendasi Final Danas:** Catatan spec disetujui. Saat `FIRE_ACTIVE`, backend menekan pembuatan alarm `DOOR_FORCED_OPEN` baru (sesuai usulan B5).
- **KEPUTUSAN:** 🟡 **REKOMENDASI FINAL DANAS**.

### 1.4 Catatan wet/dry — 🟡 REKOMENDASI FINAL DANAS
- Dioda flyback `1N4007` itu **DC-only** → mode DRY untuk beban AC bermasalah. Perlu diperjelas: DRY = DC saja, atau flyback bisa di-bypass?
- **Belum ada fuse per-pintu di output lock WET** — korslet kabel lock hanya dilindungi fuse utama 5A (relay bisa keburu weld). Tambah PTC per output lock?
- **Rekomendasi Final Danas:** 
  1. Output WET khusus beban DC.
  2. Disetujui penambahan **Polyfuse PTC SMD per-pintu** (4 pcs) untuk mencegah relay weld jika terjadi short circuit.
- **KEPUTUSAN:** 🟡 **REKOMENDASI FINAL DANAS**.

---

## 2. FIRMWARE & INTEGRASI FISIK

### 2.1 Wiegand → card_id mapping — 🟡 REKOMENDASI FINAL DANAS
Reader Wiegand kirim biner (26/34-bit). Sistem memakai kartu **10-digit ternormalisasi** (`normalize_kartu`).
- **Rekomendasi Final Danas:** 
  1. Wiegand-26 dan Wiegand-34 dikonversi ke angka desimal unsigned long 32-bit.
  2. Di-format menjadi **10-digit decimal string zero-padded (`%010lu`)**, contoh: `0000123456`.
  3. C++ firmware `normalizeKartu()` dan Python backend `normalize_kartu()` dijamin menghasilkan string identik 100%.
- **KEPUTUSAN:** 🟡 **REKOMENDASI FINAL DANAS (Menunggu Review & ACK Emping)**.

### 2.2 Sumber waktu RTC — ✅ FINAL (Keputusan Danas)
RTC DS3231 di-set awalnya dan disinkronisasi secara berkala dari server backend.
- **Rekomendasi Final Danas (Opsi B):** Ketika kontroler terhubung ke broker MQTT, server akan mem-push epoch waktu UTC secara berkala (pada saat boot dan secara berkala setiap 24 jam) untuk menyesuaikan jam RTC lokal.
- **KEPUTUSAN:** ✅ **Opsi B (Disuapi oleh Backend via MQTT)**.

### 2.3 Otoritas waktu untuk log LIVE — ✅ FINAL (Keputusan Danas)
Pertanyaan awal: untuk log **live**, waktu otoritatif = backend `NOW()` atau epoch controller?
- **Rekomendasi Final Danas (Opsi A):** 
  - **LIVE** -> `server_ts = NOW()` backend (epoch controller tetap dikirim dan disimpan di kolom `device_ts` untuk audit).
  - **REPLAYED** -> `server_ts = device_ts` (dari RTC offline controller) agar log terurut secara kronologis di database.
  - Kolom usang `device_uptime_ms` diisi `NULL` untuk log v0.3.
- **KEPUTUSAN:** ✅ **Opsi A (LIVE = Server TS, REPLAYED = Device TS)**.

### 2.4 Door state machine — ✅ FINAL (Keputusan Danas)
Logika sensor pintu, timeout, dan alarm.
- **Rekomendasi Final Danas (Opsi A):** 
  - Logika pintu dipisah dalam kelas C++ terisolasi (Modular) dengan dependensi waktu (`millis()`) dan IO (`digitalWrite`) yang di-inject dari luar agar bisa di-unit-test di native PC (`[env:native]` / PlatformIO) & CI.
  - Debouncing sensor pintu minimal 50ms dilakukan di tingkat firmware untuk mencegah badai alarm.
- **KEPUTUSAN:** ✅ **Opsi A (Modular & Testable)**.

### 2.5 Aux input & MCFA Fire Safety — ✅ FINAL (Keputusan Danas & Reviewer)
- **Keamanan Fire Lokal (v0.3)**: 100% dijamin oleh hardware interlock lokal (potong VCC relay maglock secara fisik saat sinyal MCFA aktif). Tidak bergantung pada software maupun jaringan.
- **AUX & Fire Log (v0.3)**: Berfungsi untuk pencatatan event log (`AUX_ACTIVE`/`AUX_CLEARED` dan `FIRE_ACTIVE`/`FIRE_CLEARED`) di database untuk keperluan audit trail.
- **MCFA Silang Lintas-Controller (Ditunda ke v0.4)**:
  - Fitur pembukaan pintu gedung tetangga via server **resmi ditunda ke v0.4**.
  - **Alasan konkret ditunda — bug jalur evakuasi bersama (dicatat permanen di sini, bukan cuma di komentar PR):**
    Draft awal PR #61 mengusulkan proteksi *clear* dengan cara server publish `0,0,0,0` (blanket zero)
    ke `fire/override` begitu menerima `FIRE_CLEARED` dari controller sumber. Itu cacat pada kasus nyata:
    ```
    Gedung A & Gedung C sama-sama diberi assignment membuka Pintu Evakuasi
    di Gedung B (titik kumpul bersama).
      1. Gedung A kebakaran  -> Pintu Evakuasi B terbuka.                    ✅
      2. Gedung C IKUT kebakaran -> Pintu B tetap harus terbuka.
      3. Api Gedung A padam  -> server terima FIRE_CLEARED dari A.
      4. Proteksi "blanket 0,0,0,0" -> Pintu B TERKUNCI KEMBALI
         -- padahal Gedung C masih kebakaran dan orang masih evakuasi lewat B.
    ```
    Ini bukan bug kosmetik: itu mengunci pintu evakuasi saat kebakaran masih berlangsung.
    Clear yang benar **wajib menghitung ulang UNION seluruh kebakaran yang masih aktif**
    per controller target sebelum publish — bukan blanket zero. Logika union, jembatan
    `target_door_id` (global) → `(device_id, door_number)` lokal, dan threat model untuk
    `FIRE_ACTIVE` yang bisa di-spoof (satu event palsu berpotensi membuka banyak gedung
    sekaligus kalau MQTT ACL belum ketat) **semuanya belum ada** — itulah kenapa fitur ini
    butuh iterasi desain sendiri, bukan disisipkan ke rilis yang sedang difinalisasi.
  - V0.4 akan membangun service `fire_orchestrator` yang menghitung UNION state kebakaran aktif
    sebelum melakukan lock/unlock pintu, dilengkapi jembatan global-to-local door ID dan
    perketatan MQTT ACL, plus skenario test: dua kebakaran serentak dengan target beririsan,
    clear-satu-sementara-lain-aktif, target offline saat fire, reconnect di tengah fire, dan
    `FIRE_ACTIVE` yang di-spoof.
  - Riwayat diskusi lengkap (untuk konteks historis): PR #61, komentar review 24 Jul 2026.
- **KEPUTUSAN:** ✅ **v0.3 = Fire Lokal (Hardware Interlock) + Event Logging. MCFA Silang = Dijadwalkan ke v0.4.**

### 2.6 OTA rollback — ✅ FINAL (Keputusan Danas)
Mekanisme pengamanan proses OTA agar device tidak mati total (bricked).
- **Rekomendasi Final Danas (Opsi A + Proteksi Non-Blocking):** 
  - Wajib menggunakan skema partisi A/B (app0 dan app1 masing-masing 3MB) dengan fitur auto-rollback bawaan ESP32.
  - Jika firmware baru gagal boot atau crash berturut-turut sebanyak 3 kali (memicu Watchdog Reset) dalam 10 menit pertama, bootloader otomatis mengembalikan (rollback) boot ke partisi versi stabil sebelumnya.
  - **Aturan Non-Blocking Wajib**: Penanganan koneksi ulang jaringan (MQTT/Backend) harus ditulis secara asinkron (non-blocking). Hilangnya koneksi jaringan dilarang keras mengunci program utama (delay/looping) dan tidak boleh memicu Watchdog Reset. Kontroler harus tetap bisa memproses pembacaan kartu dan REX secara lokal (offline mode) saat tidak ada koneksi ke server.
- **KEPUTUSAN:** ✅ **Opsi A (Automatic Rollback via Partisi A/B & Proteksi Non-Blocking)**.

---

## 3. KONTRAK MQTT (harus dibekukan lengkap, bukan cuma reason code)

### 3.1 Daftar topic lengkap v0.3 — ✅ FINAL (Keputusan Danas)

Seluruh kontrak topik MQTT untuk v0.3 telah disatukan dan dibekukan. Semua payload menggunakan format murni CSV untuk efisiensi RAM di ESP32:

| Topic | Arah | QoS | Retained | Format Payload (CSV) | Keterangan / Fungsi |
|---|:---:|:---:|:---:|---|---|
| `access/{id}/status` | C ➔ S | 1 | **Yes** | `ONLINE` atau `OFFLINE` | **LWT (Last Will & Testament)**. Deteksi status koneksi fisik kontroler secara instan. |
| `access/{id}/heartbeat` | C ➔ S | 1 | No | `<uptime_s>,<rssi>,<free_heap>,<total_users>` | **Telemetry**. Dikirim tiap 30s. `rssi` diisi status Ethernet (`NULL`/`0`/`100`/`10`). |
| `access/{id}/logs` | C ➔ S | 1 | No | `<seq>,<card_id>,<door_number>,<status>,<reason>,<timestamp>[,REPLAYED]` | **Log Akses Pintu** (termasuk buffer offline). `<seq>` 32-bit untuk dedup. |
| `access/{id}/events` | C ➔ S | 1 | No | `<seq>,<event_code>,<door_number>,<timestamp>[,REPLAYED]` | **Log Event Non-Akses** (Tamper, Fire, Power, Aux, dll). |
| `access/{id}/config/request` | S ➔ C | 1 | No | `request` (atau kosong) | **Perintah Baca Config**. Server meminta kontroler mengirim config terbarunya. |
| `access/{id}/config/response` | C ➔ S | 1 | No | `config_version,<val>,wifi_ssid,<val>,...` | **Laporan Config Aktif**. Format berpasangan `key,value` (TANPA `wifi_pass`). |
| `access/{id}/config/sync` | S ➔ C | 1 | No | `<door_number>,<is_active>,<open_timeout>,<held_timeout>,<alarm_dur>` | **Sinkronisasi Config Pintu** (Bulk). Contoh: `d1,1,10,30,30`. |
| `access/{id}/relay/test` | S ➔ C | 1 | No | `<door_number>,<duration_ms>` | **Uji Relay**. Server menginstruksikan pintu terbuka sementara. |
| `access/{id}/users/sync/start` | S ➔ C | 1 | No | `<sync_id>` | **Mulai Sinkronisasi Massal**. Kontroler membuka buffer RAM baru. |
| `access/{id}/users/sync/end` | S ➔ C | 1 | No | `<sync_id>,<count>` | **Selesai Sinkronisasi**. Kontroler mem-validasi total user lalu menulis ke flash. |
| `access/{id}/users/set` | S ➔ C | 1 | No | `<card_id>,<d1>,<d2>,<d3>,<d4>` | **Simpan/Edit Hak Akses User**. Nilai `dX` berupa `1` (boleh) atau `0` (tidak). |
| `access/{id}/users/delete` | S ➔ C | 1 | No | `<card_id>` | **Hapus User** dari memori kontroler. |

- **KEPUTUSAN:** ✅ **Tabel Kontrak MQTT Dibekukan (Komplet CSV)**.

### 3.2 Event non-akses (tamper/fire/aux) dikirim lewat topic apa? — ✅ FINAL (Keputusan Danas)
- **Rekomendasi Final Danas:** Event non-akses (tamper/fire/power/aux) wajib dikirim lewat topik terpisah `access/{device_id}/events` (QoS 1) secara independen, tidak menumpang pada log akses pintu. Hal ini untuk memisahkan domain data operasional (log akses) dari domain data kesehatan/keamanan perangkat (events/alarms).
- **KEPUTUSAN:** ✅ **Disetujui topik `access/{id}/events` terpisah**.

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
- **KEPUTUSAN:** ✅ **Opsi A (Kolom di tabel `doors`)**. Jawaban pertanyaan: (a) **Satu pesan bulk CSV** per pintu (`d1,1,10,30,30`), (b) **Ya, dX_active=false mematikan seluruh peripheral** dan backend ikut menolak akses, (c) **Ya, default proposal 10/30/30s dipakai**.

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
- **KEPUTUSAN:** ✅ **Usul 2 tabel (`controller_events` & `alarms`)** disetujui. Jawaban pertanyaan: (a) **Ya, topic `events` terpisah**, (b) **Ya, mengirim pasangan aktif/clear**, (c) **Ya, event offline di-buffer & REPLAYED**. Tabel angka event 0-10 disetujui (dibekukan).

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
- **KEPUTUSAN:** ✅ **ACK R1–R6**. Skema UTC murni disetujui. Urutan log REPLAYED mengikuti `device_ts`.

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
| `admin_logs` | **BARU** | ⚠️ Sudah digambar di [`ERD_v0.2.mermaid`](v0.2/ERD_v0.2.mermaid) **tapi tidak pernah dibuat** di `schema.sql`. Wajib sekarang karena v0.3 punya endpoint yang **membuka pintu fisik** (relay test, §5.3 E7) |
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
- [ ] `docs/v0.2/ERD_v0.2.mermaid` diberi catatan "digantikan ERD_v0.3.mermaid"

- **KEPUTUSAN:** ✅ **ACK file migrasi & urutan penerapan**. Migrasi delta SQL aman dijalankan lebih dulu.

---

### 4.6 Ringkasan keputusan §4 (D1–D9) — 🟡 REKOMENDASI FINAL DANAS

Seluruh usulan skema database & ERD ditinjau oleh @danskiv (menunggu ACK akhir @rizzalaulia):

| # | Pertanyaan | Usulan saya | Rekomendasi Final Danas |
|---|---|---|---|
| D1 | Config per-pintu: kolom di `doors`, tabel `door_config` terpisah, atau kolom JSON? | **Kolom di `doors`** (§4.1 Opsi A) | ✅ **Kolom di `doors`** (Opsi A) |
| D2 | Config dikirim per-key (16 pesan) atau 1 pesan bulk per pintu? | Bulk — 1 payload per pintu | ✅ **Bulk** (1 payload per pintu via CSV, contoh: `d1,1,10,30,30`) |
| D3 | `dX_active=false` mematikan seluruh peripheral pintu? | Ya, **dan** backend ikut menolak memberi akses ke pintu itu | ✅ **Ya** (Backend ikut menolak akses pintu non-aktif) |
| D4 | Event non-akses: topic `events` sendiri atau numpang `logs`? | **Topic `events` sendiri** + tabel `controller_events` | ✅ **Topic `events` sendiri** + tabel `controller_events` |
| D5 | Tabel `alarms` terpisah, atau kolom ack menempel di tabel event? | **Tabel `alarms` terpisah** (idempoten + log tetap immutable) | ✅ **Tabel `alarms` terpisah** |
| D6 | Tabel angka EVENT (0–10) di §4.2 — ACK untuk masuk Contract Codes? | ACK, append-only seperti tabel STATUS/REASON | ✅ **ACK** (Tabel angka event 0–10 dibekukan) |
| D7 | Aturan waktu R1–R6, terutama **R2 (`time_zone='+00:00'` di MySQL)** | ACK semua; R2 diatur di sesi MySQL | ✅ **ACK Semua R1–R6** + `kartu` NULLable |
| D8 | `admin_logs` dibuat sekarang (v0.3) atau ditunda lagi? | **Sekarang** — v0.3 punya endpoint yang membuka pintu fisik | ✅ **Sekarang** (Tabel `admin_logs` dibuat di v0.3) |
| D9 | Alarm punya **dua** state (`cleared_at` & `acked_at`), atau cukup satu? | **Dua** — `cleared_at` (kondisi normal) + `acked_at` (di-ack admin) | ✅ **Dua State** (`cleared_at` & `acked_at`) |

---

## 5. BACKEND

> Bagian ini ditulis ulang berdasar **audit kode `backend/` yang ada sekarang**, bukan dari nol.
> Semua path file di bawah nyata dan sudah dicek.

### 5.0 Kerangka

#### (a) Titik awal: apa yang SUDAH ada di backend (✅ fakta, bukan rencana)

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

#### (b) Peta modul backend v0.3 — 🟡 USUL

| Aksi | File | Isi |
|---|---|---|
| **BARU** | `app/mqtt/codes.py` | Terjemahan angka ↔ kode DB (STATUS, REASON, **EVENT**) — cermin [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md) |
| **BARU** | `app/services/alarm_service.py` | Siklus hidup alarm: raise / clear / ack (§5.7) |
| **BARU** | `app/services/reconcile_service.py` | Worker thread + queue, state machine sync (§5.2) |
| **BARU** | `app/services/config_service.py` | Susun & push payload config (jaringan + `dX_`), naikkan `config_version` |
| **BARU** | `app/services/audit_service.py` | Tulis `admin_logs` (§4.4) |
| **BARU** | `app/models/{controller_event,alarm,admin_log}.py` | Model 3 tabel baru |
| **BARU** | `app/routes/alarms.py` | Endpoint E8/E9 |
| **BARU** | `app/schemas/{event,alarm,door_config}.py` | Skema Pydantic |
| **UBAH** | `app/mqtt/handlers.py` | 4 handler di-rework + 1 baru (§5.1) |
| **UBAH** | `app/mqtt/subscriber.py` | +`heartbeat`, +`events`; `status` jadi dispatcher |
| **UBAH** | `app/services/sync_service.py` | Dipanggil worker, bukan langsung dari thread request/paho |
| **UBAH** | `app/routes/controllers.py` | +CRUD, +config pintu, +2 aksi sync, +relay test |
| **UBAH** | `app/routes/doors.py` | Validasi `is_active` ikut memengaruhi pemberian akses (D3) |
| **UBAH** | `app/services/user_service.py` | `resolve_user_access()` **membuang pintu non-aktif** (D3) |
| **UBAH** | `app/ws/manager.py` | Amplop `{v,type,data}` (§5.4) |
| **UBAH** | `app/auth/dependencies.py` | `require_role("admin")` untuk aksi fisik (§5.5) |

#### (c) Model threading — kontrak yang harus dipatuhi semua kode baru 🟡 USUL

Ini sumber bug paling mahal di aplikasi ini (sudah pernah kena sekali: komentar `expire_on_commit`
di `handlers.py:76-79` lahir dari kejadian nyata). Ditulis eksplisit supaya tidak terulang:

```
  thread paho (1 buah, milik MQTT)          worker reconcile (1 buah, BARU)
  ────────────────────────────────          ──────────────────────────────
  on_message                                 queue.get()  ──► run_full_sync()
    └─ handler: parse + 1 transaksi DB           (boleh blocking 30 dtk, tidak
       cepat, LALU return                         mengganggu thread paho)
       └─ butuh kerja lama? queue.put()
       └─ mau kirim ke UI? broadcast_threadsafe()
                                     │
  event loop asyncio (FastAPI)  ◄────┘
    └─ WS broadcast, request HTTP
```

**Tiga aturan wajib:**
1. **Handler MQTT tidak boleh blocking.** Tidak ada `Event.wait()`, tidak ada `run_full_sync()`
   langsung di dalamnya. Kerja panjang → `queue.put()`.
2. **Satu handler = satu transaksi DB pendek**, sesi selalu ditutup di `finally` (pola yang sudah dipakai sekarang).
3. **Nilai yang dipakai setelah `commit()` harus di-snapshot dulu** ke variabel biasa — objek ORM
   sudah kedaluwarsa setelah commit.

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
- **KEPUTUSAN:** ✅ **ACK**. Mendukung transisi status dan heartbeat v0.3 secara asinkron, sinkron dengan spesifikasi §3.1.

#### (b) Daftar handler final v0.3

| Topic | Handler | Sifat | Menulis ke tabel |
|---|---|---|---|
| `access/+/logs` | `handle_log` | **REWORK** — 5 field angka + epoch | `access_logs`, `alarms` |
| `access/+/heartbeat` | `handle_heartbeat` | **BARU** | `controllers` (telemetry) |
| `access/+/status` | `handle_status` (dispatcher LWT/legacy) | **REWORK** | `controllers` (`link_state`) |
| `access/+/events` | `handle_event` | **BARU** — tamper/fire/power/aux | `controller_events`, `controllers` (health), `alarms` |
| `access/+/config/response` | `handle_config_response` | **REWORK** — sekarang cuma di-`logger.info` | — (memicu reconcile) |
| `access/+/sync/result` | `handle_sync_result` | **REWORK ringan** — +transisi `sync_state` | `controllers` (sync) |

#### (c) `handle_log` — rework 🟡 USUL

Kode sekarang menerima `reason` sebagai **string** dan mencocokkannya ke `VALID_REASONS`
(`handlers.py:20-26`). Kontrak v0.3 mengirim **angka**.

**Alur yang diusulkan:**

```
payload  <card_id>,<door_number>,<status>,<reason>,<timestamp_epoch>[,REPLAYED]
   │
   ├─1. Parse. Deteksi versi: reason.isdigit() -> v0.3 ; selain itu -> v0.2 (toleransi)
   ├─2. codes.py : angka -> kode DB. Angka asing -> "UNKNOWN" + warning, JANGAN raise
   ├─3. card_id kosong  -> kartu = NULL  (bukan string kosong)  [§4.5, kolom sudah NULLABLE]
   ├─4. Waktu: device_ts = epoch (UTC). Sanity guard R4:
   │      di luar 2025-01-01 .. NOW()+5mnt  ->  device_ts tetap disimpan apa adanya,
   │                                            server_ts pakai NOW(), tulis warning
   │      LIVE      -> server_ts = NOW()
   │      REPLAYED  -> server_ts = device_ts    [aturan R3]
   ├─5. Resolve: controller (device_id), door (controller_id + door_number), user (kartu)
   ├─6. Snapshot: user_nama, door_nama, door_number, device_id
   ├─7. INSERT access_logs  (1 transaksi)
   ├─8. result == "ALARM"  ->  alarm_service.raise_from_log(log_id, ...)   [§5.7]
   └─9. broadcast {v:1, type:"log", data:{...}}  (+ type:"alarm" bila ada)
```

**Yang dihapus:** seluruh mekanisme `_boot_estimate` (`handlers.py:28-31, 84-95`). Itu tambal sulam
karena controller v0.2 tidak punya jam; DS3231 membuatnya tidak relevan. Jalur v0.2 tetap memakainya
selama masa transisi, jalur v0.3 tidak.

**Kolom baru yang wajib diisi** (§4.4): `door_number`, `device_id`, `device_ts`; `device_uptime_ms` = `NULL`.

- **KEPUTUSAN:** ✅ **ACK alur 1–9**. Log `REPLAYED` resmi menggunakan `device_ts` sebagai `server_ts`.

#### (d) `handle_heartbeat` — baru 🟡 USUL

Payload `uptime_s,rssi,free_heap,total_users`:

1. `controllers.last_seen = NOW()` (ini yang menghidupkan `is_online`).
2. Simpan snapshot: `uptime_s`, `rssi`, `free_heap`, `total_users_reported`.
3. **Deteksi reboot:** `uptime_s` baru **lebih kecil** dari yang tersimpan → device baru boot →
   tulis `controller_events` (`BOOT`, INFO) + antre config push. Ini pengganti murah untuk kasus
   controller restart tanpa sempat kirim LWT.
4. **Drift check user:** bandingkan `total_users` vs jumlah user ter-resolve untuk device ini
   (`resolve_user_access`). Beda → `sync_state = SYNC_PENDING` + `queue.put(device_id)`.
   **Bukan** memanggil `run_full_sync()` langsung (aturan threading §5.0c).

> ⚠️ **Ketidakselarasan dengan hardware — perlu jawaban @danskiv (B1).** Format heartbeat mewarisi
> `rssi` dari era WiFi. Di v0.3, **WiFi tidak dipakai untuk MQTT sama sekali** (W5500 Ethernet satu-satunya
> jalur, WiFi cuma AP saat tombol `GPIO37`). Jadi `rssi` praktis selalu 0/tidak bermakna. Usul: field
> tetap ada demi kompatibilitas tapi diisi status link Ethernet, atau diganti `eth_link`.

#### (e) `handle_status` — dispatcher LWT 🟡 USUL

1. Payload `ONLINE`/`OFFLINE` → set `link_state` + `link_changed_at`.
2. Transisi **`OFFLINE`/`UNKNOWN` → `ONLINE`** adalah pemicu rekonsiliasi config
   (proposal §2E-2: backend **selalu** push config saat controller online) → `queue.put()`.
3. Payload CSV 4 angka → heartbeat v0.2 (deprecated, `logger.warning`, tetap update `last_seen`).
4. **`link_state` tidak menggantikan `is_online`.** `is_online` tetap dihitung dari `last_seen`
   (keputusan v0.2 #8). Keduanya ditampilkan berdampingan — LWT bisa gagal terkirim, timeout heartbeat
   bisa telat; dua sumber ini saling menutupi.

#### (f) `handle_event` — baru 🟡 USUL

Payload `<event_code>,<door_number>,<timestamp_epoch>[,REPLAYED]` (tabel angka event di §4.2):

1. Terjemahkan angka → kode + `event_type` + `severity` lewat `codes.py`.
2. INSERT `controller_events` (waktu mengikuti aturan R3/R4 yang sama dengan log).
3. **Perbarui state ringkas di `controllers`** supaya UI tidak perlu query agregat:
   `TAMPER_OPEN`→`tamper_state='TAMPER'`, `TAMPER_CLOSED`→`'OK'`, `FIRE_ACTIVE`/`FIRE_CLEARED`,
   `POWER_LOW`/`POWER_NORMAL`.
4. `severity='ALARM'` (atau `POWER_LOW`) → `alarm_service.raise_from_event(...)`;
   pasangan `*_CLOSED`/`*_CLEARED` → `alarm_service.clear(...)` (§5.7).
5. Broadcast `type:"alarm"` / `type:"controller_status"`.

> ⚠️ **Perlu jawaban @danskiv (B2).** Hardware punya **dua** jalur ADC (`GPIO1` sensing PLN 12V,
> `GPIO2` sensing aki/PSU), tapi tabel event cuma punya `POWER_LOW`/`POWER_NORMAL` — satu dimensi.
> Kalau memang dua sumber daya yang dibedakan, kodenya perlu dipisah (mis. `MAINS_LOST`/`MAINS_OK` dan
> `BATTERY_LOW`/`BATTERY_OK`), dan `controllers.power_state` jadi dua kolom. Ini juga menyentuh
> konflik pin §1.1 yang belum ditutup.

#### (g) `handle_config_response` 🟡 USUL

- Payload berisi pasangan key,value **plus `config_version`** yang dipegang controller.
- Bandingkan dengan `controllers.config_version`: **beda → antre config push**. Ini yang membuat
  rekonsiliasi config cuma butuh 1 perbandingan angka, bukan membandingkan 16 parameter `dX_` satu per satu.
- Isi parameter tetap di-log untuk diagnosa, tapi **DB tetap sumber kebenaran** — backend tidak pernah
  menimpa DB dengan nilai dari controller (arah data satu arah, sejalan aturan `wifi_pass` v0.2 #6).

#### (h) `handle_sync_result` 🟡 USUL

Menambah transisi state (§5.2) di luar yang sudah ada: `OK` → `sync_state='IN_SYNC'`,
`sync_fail_count=0`, `last_sync_at=NOW()`; `MISMATCH`/timeout → naikkan `sync_fail_count`,
isi `last_sync_error`.

---

### 5.2 Auto-reconciliation — 🟡 USUL (desain state machine)

#### (a) Masalah teknis yang belum disadari proposal
`run_full_sync()` **blocking sampai 30 detik × 3 percobaan** (`sync_service.py:47`). Sekarang aman karena
hanya dipanggil dari thread request HTTP. Kalau auto-reconciliation memanggilnya **dari `handle_heartbeat`
(thread paho)**, satu sync macet akan **membekukan seluruh pemrosesan MQTT** untuk semua controller —
log dari controller lain ikut berhenti.

- **USUL:** tambah `backend/app/services/reconcile_service.py` dengan **1 worker thread + queue**.
  Handler MQTT hanya `queue.put(device_id)` lalu langsung `return`. Worker yang menjalankan sync.
- **KEPUTUSAN:** ✅ **ACK Worker Thread & Queue** untuk menghindari pemblokiran (*blocking*) pada thread paho MQTT.

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

#### (c) Kolom penyangga
Sudah dirancang di §4 dan masuk migrasi 001: `sync_state`, `sync_fail_count`, `last_sync_at`,
`last_sync_error`, `config_version`.

#### (d) Pemicu rekonsiliasi — siapa memanggil apa

| Pemicu | Deteksi | Aksi |
|---|---|---|
| Controller kembali ONLINE | `handle_status` LWT `OFFLINE→ONLINE` | Antre **push config** (proposal §2E-2: selalu push, tanpa peduli ada perubahan atau tidak) |
| Device baru boot | `handle_heartbeat`, `uptime_s` turun | Antre push config + catat event `BOOT` |
| Jumlah user beda | `handle_heartbeat`, `total_users` ≠ hitungan DB | Antre **full sync user** |
| Config version beda | `handle_config_response` | Antre push config |
| Admin menekan tombol | Endpoint E5/E6 | Jalankan langsung + reset `sync_fail_count` |

#### (e) Anti-loop & backoff
- **3× gagal dalam < 5 menit** → `sync_state='SYNC_ERROR_ATTENTION_REQUIRED'`, auto-sync **dimatikan**
  untuk controller itu, alarm dibuat (§5.7). Alasan di proposal: mencegah flash wear karena tulis berulang.
- Antar percobaan pakai **backoff** (mis. 30 dtk → 2 mnt → 5 mnt), bukan langsung ulang.
- Reset `sync_fail_count` **hanya** oleh: sync sukses, atau tombol sync manual admin. Bukan oleh waktu —
  supaya masalah yang belum diperbaiki tidak diam-diam mengaktifkan lagi loop yang sama.
- **Antrean dedup:** satu `device_id` tidak boleh punya lebih dari satu job menunggu; heartbeat tiap
  30 detik jangan sampai menumpuk jadi antrean panjang.

#### (f) Batasan key config yang boleh di-auto-push
`config/set` sekarang dibatasi `_SAFE_CONFIG_KEYS = {heartbeat_s, total_doors}`
(`routes/controllers.py:30`). Untuk v0.3:
- **Ditambahkan ke daftar aman:** seluruh parameter `dX_*` (4 pintu × 4 parameter).
- **TETAP dilarang auto-push:** `wifi_*`, `mqtt_*`, `ip_*` — vektor bricking, keputusan v0.2 #5 masih
  berlaku. Perubahan itu tetap tersimpan di DB dan diterapkan lewat Web Config lokal port 8081
  (jaring pengaman yang memang disediakan hardware v0.3).
- **KEPUTUSAN:** ✅ **ACK State Machine & Backoff**. Pengiriman otomatis dibatasi untuk parameter aman (`dX_*` dan `heartbeat_s`). Parameter sensitif wajib lewat portal lokal Web Config 8081.

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

#### Role & jejak audit per endpoint (🟡 USUL)

| Endpoint | `admin` | `viewer` | Tulis `admin_logs`? | Naikkan `config_version`? |
|---|:--:|:--:|:--:|:--:|
| E1 `POST /controllers` | ✅ | ❌ | ✅ `CONTROLLER_CREATE` | — |
| E2 `DELETE /controllers/{id}` | ✅ | ❌ | ✅ `CONTROLLER_DELETE` | — |
| E3 `GET .../doors/config` | ✅ | ✅ | — | — |
| E4 `PUT .../doors/config` | ✅ | ❌ | ✅ `DOOR_CONFIG_UPDATE` (+before/after) | ✅ |
| E5 `POST .../sync/users` | ✅ | ❌ | ✅ `SYNC_TRIGGER` | — |
| E6 `POST .../sync/config` | ✅ | ❌ | ✅ `SYNC_TRIGGER` | — |
| E7 `POST .../doors/{n}/test` | ✅ | ❌ | ✅ **`RELAY_TEST` (wajib)** | — |
| E8 `GET /alarms` | ✅ | ✅ | — | — |
| E9 `POST /alarms/{id}/ack` | ✅ | ❌ | ✅ `ALARM_ACK` | — |
| E10 `GET .../health` | ✅ | ✅ | — | — |

#### Perintah MQTT yang dipancarkan endpoint

| Endpoint | Topic terbit | Payload |
|---|---|---|
| E4 (setelah commit DB) | `access/{id}/config/sync` | parameter `dX_*` + `config_version` baru |
| E5 | `users/sync/start` → `users/set` ×N → `users/sync/end` | seperti v0.2 |
| E6 | `access/{id}/config/sync` | idem E4 |
| E7 | `access/{id}/relay/test` | `<door_number>,<duration_ms>` ← **butuh ACK @danskiv (B3)**, topic ini belum ada di §3.1 |

**Keputusan turunan:**
- **E5 rename = breaking change** untuk `frontend/src/api/controllers.ts`. Usul: sediakan `/sync` lama
  sebagai alias deprecated selama v0.3, hapus di v0.4.
- **E7 relay test membuka pintu fisik dari browser.** Tiga syarat yang diusulkan **tidak bisa ditawar**:
  role `admin` saja, selalu tulis `admin_logs`, dan **hanya bisa dipakai bila controller online**
  (kalau tidak, perintah mengendap di broker dan pintu terbuka entah kapan). Usul tambahan: batasi
  `duration_ms` (mis. maksimal 10 detik) di sisi backend, jangan percaya nilai dari klien.
- **E2 hapus controller:** `doors` memakai FK RESTRICT, jadi controller yang masih punya pintu tidak
  bisa dihapus. Usul: **pertahankan RESTRICT** (hapus pintu dulu secara sadar), karena penghapusan
  berantai akan memutus `door_id` di log riwayat.
- **Error code**: roadmap Sprint 4 minta field `error_code` di `HTTPException`. Usul **masuk v0.3**,
  diterapkan ke semua endpoint baru sejak awal (murah di awal, mahal kalau retrofit).
- **KEPUTUSAN:** ✅ **Daftar Endpoint E1–E10 Disetujui** untuk rilis v0.3. E5 rename disetujui dengan alias `/sync` lama tetap dipertahankan sebagai deprecated. E7 dibatasi maksimum 10 detik dan mencatat audit log wajib. E2 tetap RESTRICT.

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
- **Jenis pesan & isinya:**

| `type` | Dipicu oleh | Isi `data` | Konsumen |
|---|---|---|---|
| `log` | `handle_log` | seperti sekarang + `door_number`, `device_ts`, `is_replayed` | Live feed, Dashboard |
| `alarm` | `alarm_service.raise/clear` | `{alarm_id, alarm_code, device_id, door_number, raised_at, cleared_at}` | Banner + halaman Alarms (§6.2) |
| `controller_status` | `handle_event`, `handle_status`, `handle_heartbeat` | `{device_id, link_state, tamper_state, fire_state, power_state}` | Tabel Controllers (§6.3) |
| `sync_state` | `reconcile_service` | `{device_id, sync_state, sync_fail_count, last_sync_error}` | Badge sync (§6.3) |

- **Log `REPLAYED` jangan dibroadcast sebagai "kejadian baru".** Bisa masuk ratusan sekaligus saat
  controller reconnect dan akan membanjiri live feed dengan kejadian lama. Usul: kirim dengan penanda,
  frontend menampilkannya di bawah/terpisah — atau tidak dibroadcast sama sekali dan cukup muncul saat
  halaman log di-refresh.
- **Batas scope:** notifikasi email/Telegram/push **TIDAK** masuk v0.3.
- **KEPUTUSAN:** ✅ **ACK Amplop Berversi `{v,type,data}` & 4 Jenis Pesan**. Log `REPLAYED` tidak dibroadcast ke live-feed utama untuk menghindari spamming.

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
- **KEPUTUSAN:** ✅ **Setuju Pembagian Keamanan**. Pembatasan RBAC `admin`/`viewer` dan MQTT ACL wajib diterapkan di v0.3, sedangkan TLS dan Refresh Token ditunda ke v0.4.

**RBAC — batas yang diusulkan:** `viewer` boleh membaca semua (user, log, alarm, status controller),
tapi **tidak boleh**: mengubah user/akses, mengubah config, memicu sync, meng-ack alarm, dan yang paling
penting **tidak boleh menjalankan relay test**. Aturan praktisnya: *kalau aksi itu bisa mengubah keadaan
fisik di lapangan, `viewer` tidak boleh.*

---

### 5.6 Duplikasi log & idempotensi — 🟡 USUL (belum pernah dibahas)

MQTT QoS 1 itu **at-least-once**: pesan yang sama bisa datang dua kali. Ditambah buffer offline yang
di-`REPLAYED`, ada dua sumber duplikat yang nyata:

1. Broker mengirim ulang karena PUBACK hilang → log ganda persis.
2. Controller reconnect dan me-replay log yang **sebenarnya sudah terkirim** sebelum koneksi putus.

Sekarang `access_logs` tidak punya kunci apa pun untuk menolak duplikat.

| Opsi | Cara | Risiko |
|---|---|---|
| **A. Firmware kirim `seq`** (nomor urut per device, ikut disimpan di DB, UNIQUE `(device_id, seq)`) | Paling benar — satu-satunya cara membedakan "dua tap identik" dari "satu tap terkirim dua kali" | Butuh perubahan firmware + 1 field di payload → **butuh ACK @danskiv (B4)** |
| **B. UNIQUE `(device_id, device_ts, door_number, reason)`** | Tanpa perubahan firmware | RTC presisi **detik** → dua REX di pintu sama dalam 1 detik yang sama akan dianggap duplikat dan **hilang**. Menghilangkan kejadian nyata lebih buruk daripada duplikat |
| **C. Terima duplikat apa adanya** | Tidak ada perubahan | Log ganda di UI; tapi **alarm tidak ganda** karena `alarms` sudah di-dedup lewat `UNIQUE(source, source_id)` |

- **USUL: A kalau firmware sanggup, kalau tidak C** (jangan B — B menghapus data asli).
- **KEPUTUSAN:** ✅ **Opsi A (Firmware kirim `seq`)**. Payload MQTT log dan Event Listrik langsung menggunakan field `seq` v0.3.1. Firmware WAJIB menyimpan counter `last_seq` di NVS (Non-Volatile Storage) ESP32 agar nilainya bersifat monoton naik dan tidak reset ke 0 saat reboot (mencegah tabrakan UNIQUE index di DB).

---

### 5.7 Siklus hidup alarm (`alarm_service.py`) — 🟡 USUL

```
  kejadian ALARM ──► raise()
                       │  INSERT alarms (UNIQUE(source, source_id) -> aman dari duplikat)
                       │  broadcast type:"alarm"
                       ▼
                  [ AKTIF ]  cleared_at=NULL, acked_at=NULL
                    │                     │
   device kirim     │                     │  admin tekan Acknowledge
   *_CLOSED /       │                     │
   *_CLEARED        ▼                     ▼
              cleared_at=NOW()      acked_at=NOW(), acked_by=admin
                    │                     │
                    └──────► [ SELESAI ] ◄┘   (butuh KEDUANYA)
```

**Aturan yang diusulkan:**
1. **`cleared_at` ≠ `acked_at`** (keputusan D9). Tamper yang dibuka lalu ditutup lagi **tetap harus
   dilihat admin** — kalau auto-hilang begitu kondisi normal, sabotase singkat lewat tanpa jejak.
2. **Yang bisa auto-clear hanya alarm berpasangan** (`TAMPER_OPEN`↔`TAMPER_CLOSED`,
   `FIRE_ACTIVE`↔`FIRE_CLEARED`, `POWER_LOW`↔`POWER_NORMAL`).
   `DOOR_FORCED_OPEN`/`DOOR_HELD_OPEN` **tidak punya pasangan** — kejadian sesaat, `cleared_at` diisi
   sama dengan `raised_at`, tetap menunggu ack.
3. **`SYNC_ERROR_ATTENTION_REQUIRED`** adalah alarm yang lahir di **backend**, bukan dari device.
   Sumbernya baris `controller_events` bertipe `SYNC`. Auto-clear saat sync berikutnya berhasil.
4. **Anti-badai alarm:** satu `alarm_code` yang sama untuk `device_id`+`door_number` yang sama dan
   **masih aktif** tidak melahirkan baris alarm baru — cukup perbarui `raised_at` + tambah penghitung.
   Sensor pintu yang bouncing bisa mengirim puluhan event; admin tidak boleh dapat 50 baris alarm.
- **KEPUTUSAN:** _(ACK 4 aturan? khususnya #1 dan #4)_

---

### 5.8 Konsekuensi lintas layer yang WAJIB ikut berubah — 🟡 USUL

Ini bagian yang paling gampang terlewat: keputusan hardware/firmware yang diam-diam mengubah logika backend.

| Asal keputusan | Konsekuensi di backend | Status |
|---|---|---|
| **D3** `dX_active=false` mematikan peripheral pintu | `resolve_user_access()` harus **membuang pintu non-aktif** sebelum sync ke controller — kalau tidak, controller menyimpan hak akses untuk pintu yang perangkatnya dimatikan. Endpoint akses juga harus menolak pemberian akses ke pintu non-aktif | Menunggu D3 |
| **RTC DS3231** jadi sumber waktu | `_boot_estimate` dihapus; `server_ts` untuk REPLAYED diambil dari RTC (R3); butuh sanity guard (R4) | §5.1(c) |
| **Ethernet satu-satunya jalur MQTT** | `rssi` di heartbeat kehilangan makna (B1) | Menunggu B1 |
| **Fire interlock memutus VCC lock** | Saat `FIRE_ACTIVE`, maglock terlepas **tanpa lewat controller**. Backend akan melihat `DOOR_FORCED_OPEN` beruntun dari pintu-pintu yang terbuka. Usul: **selama `fire_state='FIRE'`, alarm forced-open ditekan (tetap dicatat sebagai log, tapi tidak melahirkan alarm)** — kalau tidak, satu kebakaran menghasilkan badai alarm palsu yang menutupi alarm kebakaran itu sendiri | **Baru, butuh ACK (B5)** |
| **Web Config lokal 8081** bisa ubah jaringan | Nilai di controller bisa berbeda dari DB tanpa backend tahu. `config_version` cuma mendeteksi drift parameter yang di-push backend | Menunggu §3.1 |
| **Wiegand → card_id** (§2.1) | `normalize_kartu()` di backend harus menghasilkan format yang **sama persis** dengan yang dikirim firmware. Ini titik integrasi paling rawan dan masih terbuka | Menunggu §2.1 |

---

### 5.9 Yang TIDAK masuk backend v0.3 (batas tegas)

Ditulis supaya tidak diam-diam masuk di tengah jalan: OTA push dari backend (§2.6 — cukup lewat Web
Config 8081 dulu), cross-controller trigger via backend (§2.5), notifikasi email/Telegram,
logging terstruktur + `/metrics`, Alembic, Docker image, dan live door state (§6.4).

---

### 5.10 Checklist keputusan §5 (B1–B8) — 🟡 REKOMENDASI FINAL DANAS

Seluruh usulan integrasi backend & firmware ditinjau oleh @danskiv (menunggu ACK akhir @rizzalaulia):

| # | Pertanyaan | Usulan saya | Rekomendasi Final Danas |
|---|---|---|---|
| B1 | `rssi` di heartbeat: dipertahankan, diisi status link Ethernet, atau diganti `eth_link`? | Ganti maknanya jadi status Ethernet; nama field tetap demi kompatibilitas | ✅ **Diisi status link Ethernet** (`NULL` untuk belum ada data, `0` untuk link putus, >0 untuk speed) |
| B2 | Sensing daya: satu dimensi (`POWER_LOW/NORMAL`) atau dua (PLN + aki terpisah)? | Satu dimensi dari ADC `GPIO2` sensing aki/PSU 12V | ✅ **2 Dimensi** (`GPIO2` ADC pantau baterai, `GPIO1` Digital Input pantau `MAINS_LOST`) |
| B3 | Topic relay test: `access/{id}/relay/test` dengan payload `<door>,<duration_ms>`? | ACK, dan controller membalas hasilnya | ✅ **ACK** (`access/{id}/relay/test` + payload `<door>,<duration_ms>`) |
| B4 | Firmware sanggup menyertakan `seq` (nomor urut log per device)? | Sanggup → dedup benar | ✅ **Sanggup (Opsi A)** (Firmware kirim `seq` 32-bit, Contract Codes langsung di-update ke v0.3.1) |
| B5 | Saat `FIRE_ACTIVE`, alarm forced-open ditekan supaya tidak badai alarm? | Ya — tetap dicatat sebagai log, tapi tidak melahirkan alarm | ✅ **Ya** (Menekan alarm `DOOR_FORCED_OPEN` saat `FIRE_ACTIVE`) |
| B6 | Bentrok topic `status` (heartbeat v0.2 vs LWT v0.3) — firmware v0.3 pakai yang mana? | `heartbeat` untuk telemetry, `status` untuk LWT; backend tetap toleran | ✅ **`heartbeat` untuk telemetry, `status` untuk LWT** |
| B7 | Event ikut buffer offline & `REPLAYED`, atau hilang saat offline? | Ikut di-buffer — tamper saat jaringan mati justru yang paling penting | ✅ **Ikut di-buffer & `REPLAYED`** (disimpan di LittleFS saat offline) |
| B8 | Controller melaporkan `config_version` di `config/response`? | Ya — bikin deteksi drift cukup 1 perbandingan angka | ✅ **Ya** (`config_version` dilaporkan di `config/response`) |

---

## 6. FRONTEND

> Ditulis ulang berdasar isi nyata `frontend/src/`. Stack terpasang: **React 19 + Vite + TypeScript +
> TailwindCSS 4 + TanStack Query + Zustand + react-router**. Tidak ada library UI/komponen pihak ketiga —
> semua komponen (`Badge`, `Modal`, `Table`, `Toast`, `StatCard`) buatan sendiri. **Tidak ada test runner.**

### 6.0 Kerangka

#### (a) Titik awal: struktur frontend sekarang (✅ fakta)

| Area | File | Catatan |
|---|---|---|
| Tipe cermin DB | `src/types/index.ts` | `AccessResult = "GRANTED"\|"DENIED"` — **belum ada `ALARM`**; `AccessReason` masih 4 kode v0.2 |
| Live feed WS | `src/ws/liveFeed.ts` | `useLiveFeed()`, auto-reconnect 3 dtk, parse objek log polos |
| Controller | `src/pages/Controllers/Controllers.tsx` + `ControllerConfigModal.tsx` | 1 tombol "🔄 Full Sync", badge Online/Offline |
| Log | `src/pages/Logs/AccessLogs.tsx` | `reason` dirender **apa adanya** (`l.reason ?? "—"`), `toCsv()` masih nempel di file ini |
| Dashboard | `src/pages/Dashboard/Dashboard.tsx` | `resultColor(l.result)` cuma tahu 2 hasil |
| Auth | `src/api/auth.ts` (`useMe()` sudah mengembalikan `role`), `api/client.ts` | JWT di `localStorage`, interceptor 401 → `/login` |
| Navigasi | `components/NavSidebar.tsx` (6 menu), `App.tsx` (7 rute) | Semua rute dibungkus `ProtectedRoute` |
| Util | `src/utils/format.ts`, `src/utils/kartu.ts` | Format waktu dd-mm-yyyy hh:mm:ss (keputusan @danskiv) |

#### (b) Empat temuan yang mengubah rencana (⚠️ hasil audit, bukan asumsi)

| # | Temuan | Dampak |
|---|---|---|
| **F-a** | **`useLiveFeed()` tidak pernah mengirim token.** `wsUrl()` (`ws/liveFeed.ts:17-20`) cuma menempel `/ws/live-feed`, padahal backend membaca `?token=` (`app/ws/auth.py`). Sekarang tidak ketahuan karena `AUTH_ENABLED = False` | Begitu §5.5 mengaktifkan auth, **live feed langsung mati** (close 1008) tanpa pesan yang jelas. Wajib diperbaiki **bersamaan** dengan aktivasi auth, bukan sesudahnya |
| **F-b** | **Filter log tidak punya `ALARM`.** `uiStore.logsFilter.result` bertipe `"ALL"\|"GRANTED"\|"DENIED"`, dan dropdown di `AccessLogs.tsx:210-218` cuma 3 opsi | Log ALARM akan **masuk DB tapi tidak bisa difilter** — fitur alarm terasa "tidak jalan" padahal datanya ada |
| **F-c** | **Badge result 2 warna.** `l.result === "GRANTED" ? "green" : "red"` (`AccessLogs.tsx:126`) | `ALARM` akan tampil **persis sama** dengan `DENIED`. Kejadian sabotase tidak bisa dibedakan dari kartu ditolak biasa |
| **F-d** | **`toCsv()` header hardcoded 9 kolom** (`AccessLogs.tsx:26-37`) | Kolom baru (`door_number`, `device_ts`) tidak ikut ter-export; export juga masih **halaman aktif saja** (batasan lama yang belum ditutup) |

#### (c) Kontrak state di frontend — 🟡 USUL

Sekarang sudah ada 2 sumber state; v0.3 menambah yang ketiga (WS push). Batasnya perlu ditulis
supaya tidak jadi tiga sumber kebenaran yang saling bertengkar:

| Sumber | Dipakai untuk | Contoh | Aturan |
|---|---|---|---|
| **React Query** | Semua data server | user, log, controller, alarm | **Satu-satunya sumber kebenaran.** Boleh basi, tidak boleh salah |
| **Zustand** | State UI murni | filter, modal terbuka, tema, toggle suara | Tidak pernah menyimpan salinan data server |
| **WebSocket** | **Pemberitahuan**, bukan penyimpanan | log baru, alarm baru, status controller | Pesan WS → tampilkan sekilas **dan** `invalidateQueries()`; jangan jadikan WS satu-satunya jalan data masuk |

> **Kenapa aturan ketiga penting:** kalau alarm hanya hidup di memori dari WS, admin yang me-refresh
> halaman atau baru login akan melihat "tidak ada alarm" padahal ada. Alarm **harus** di-seed dari
> `GET /api/alarms?acked=false`, WS cuma mempercepat kemunculannya.

---

### 6.1 Config per-pintu — 🟡 USUL

- **Tempat:** **tab baru di `ControllerConfigModal.tsx`** (bukan halaman baru). Parameter ini milik
  controller, dan admin sudah membukanya lewat ⚙️ Config; halaman terpisah menambah navigasi tanpa
  menambah informasi.
  - Tab 1 "Jaringan & Umum" = isi modal sekarang (heartbeat, SSID, IP mode, broker).
  - Tab 2 "Pintu" = grid **4 pintu × 4 parameter**, satu tombol Save untuk seluruh grid (endpoint bulk E4).

```
┌ Config — ctrl-A ────────────────────────────────────┐
│ [ Jaringan & Umum ] [ Pintu ]          v.config 7   │
│                                                     │
│ Pintu            Aktif  Open  Held  Alarm           │
│ 1 Lobby Utama     [x]   [10]  [30]  [30]            │
│ 2 Ruang Server    [x]   [ 5]  [20]  [60]            │
│ 3 Ruang Meeting   [ ]   [--]  [--]  [--]  (nonaktif)│
│ 4 Ruang Arsip     [x]   [10]  [30]  [30]            │
│                                                     │
│ ⚠ Pintu 2: held (20) harus ≥ open (5) — OK          │
│                        [ Batal ]  [ Simpan & Push ] │
└─────────────────────────────────────────────────────┘
```

- **Validasi di klien** (cermin CHECK di DB §4.1 — server tetap otoritatif):
  `open_timeout_s` 1–120 · `held_timeout_s` 1–600 · `alarm_duration_s` 0–600 · **`held ≥ open`**.
  Validasi lintas-field (`held ≥ open`) dicek **saat mengetik**, bukan cuma saat submit — kalau baru
  ketahuan setelah Save, admin harus menebak baris mana yang salah.
- **Pintu non-aktif** → 3 field lain di-*disable* + diberi keterangan, **bukan disembunyikan**.
  Menyembunyikan membuat admin mengira nilainya hilang.
- **Umpan balik yang jujur setelah Save.** Ini bukan form biasa: menyimpan berarti **mengubah perilaku
  perangkat fisik**. Yang harus dibedakan di UI:
  - `200` = tersimpan di **database** ✅
  - tapi push MQTT ke controller **belum tentu sampai** (controller bisa offline)
  - Usul: setelah Save, tampilkan `config_version` baru + status "menunggu konfirmasi controller",
    lalu berubah jadi "tersinkron" begitu `config/response` masuk (lewat WS `type:"sync_state"`).
    Jangan menampilkan "Config tersimpan" polos seperti sekarang (`Controllers.tsx:22`) — itu
    membuat admin mengira pintu sudah berubah padahal belum.
- **Konflik dua admin:** `config_version` dikirim balik saat PUT; kalau versi di server sudah lebih
  baru, tolak dengan `error_code: CONFIG_VERSION_CONFLICT` dan minta muat ulang. Tanpa ini, dua admin
  yang membuka modal bersamaan akan saling menimpa diam-diam.
- **KEPUTUSAN:** ✅ **Tab di modal, validasi lintas-field (held >= open), umpan balik 2 tahap, dan penolakan konflik versi (config_version) disetujui** sesuai usulan F1, F7.

---

### 6.2 Alarm — 🟡 USUL (fitur frontend terbesar v0.3)

- **Prasyarat tipe:** `AccessResult` jadi `"GRANTED" | "DENIED" | "ALARM"` dan `AccessReason` diganti
  9 kode v0.3 (§6.5). Tanpa ini TypeScript akan diam saja saat `ALARM` masuk.

#### (a) Tiga tempat alarm muncul (sengaja berlapis)

| Lapis | Komponen | Kapan tampil |
|---|---|---|
| **Banner global** | `components/AlarmBanner.tsx` di `Layout` | Selama ada alarm **belum di-ack** — terlihat di halaman mana pun. Bukan toast; toast hilang sendiri dan alarm tidak boleh hilang sendiri |
| **Halaman Alarms** | `pages/Alarms/Alarms.tsx` (rute `/alarms` + menu 🚨) | Daftar penuh + tombol Acknowledge (E8/E9), filter aktif/riwayat |
| **Baris log** | `AccessLogs.tsx`, `Dashboard.tsx` | Baris `ALARM` berwarna merah + reason ter-terjemah |

#### (b) Dua state alarm harus kelihatan beda (turunan D9/§5.7)

Ini yang paling gampang salah dirancang di UI:

| Kondisi | `cleared_at` | `acked_at` | Tampilan |
|---|:--:|:--:|---|
| Sedang terjadi | NULL | NULL | 🔴 **AKTIF** — merah, di banner |
| Sudah normal, belum dilihat | terisi | NULL | 🟠 **PERLU DILIHAT** — tetap di banner, tapi beda warna |
| Sudah di-ack | terisi/NULL | terisi | ⚪ pindah ke riwayat |

> Tamper yang dibuka lalu ditutup lagi **tidak boleh hilang sendiri dari layar**. Kalau UI cuma
> membaca "kondisi sekarang", sabotase singkat lewat tanpa ada yang tahu — itu justru kejadian
> yang paling ingin ditangkap.

#### (c) Perilaku detail

- **Seed + push:** `alarmStore` diisi dari `GET /api/alarms?acked=false` saat app dimuat, lalu
  diperbarui oleh WS `type:"alarm"`. WS saja tidak cukup (§6.0c).
- **Suara:** usul **ya, opsional, default menyala**, toggle disimpan di `uiStore`. Batasannya harus
  diakui: browser memblokir autoplay sebelum ada interaksi user, jadi suara **tidak boleh** jadi
  satu-satunya jalur notifikasi. Beri suara berbeda untuk `FIRE_ACTIVE` vs alarm lain.
- **Ack butuh konfirmasi + catatan opsional** (`ack_note`), karena ini masuk `admin_logs`.
- **Anti-badai (cermin §5.7 #4):** kalau backend mengirim penghitung, tampilkan `DOOR_FORCED_OPEN ×12`
  dalam **satu baris**, bukan 12 baris.
- **`viewer` tidak boleh meng-ack** (§6.7) — tombolnya di-disable dengan alasan, bukan disembunyikan.
- **KEPUTUSAN:** ✅ **ACK 3 lapis tampilan alarm (banner, halaman Alarms, baris log), pemisahan cleared/acked, dan suara alarm default menyala (bisa di-toggle)** sesuai F2, F3.

---

### 6.3 Status & kendali controller — 🟡 USUL

Perubahan pada `Controllers.tsx` (sekarang 6 kolom, 2 aksi):

| Kolom / aksi | Sekarang | v0.3 |
|---|---|---|
| Status | Badge Online/Offline dari `is_online` | **Dua indikator berdampingan**: `is_online` (hitungan `last_seen`) **dan** `link_state` (LWT). Beda arti — lihat catatan di bawah |
| Sync | 1 tombol "🔄 Full Sync" | **2 tombol**: "Sync Database" (E5) & "Sync Config" (E6) |
| Sync state | — | Badge `IN_SYNC` / `SYNCING` / 🔴 `SYNC_ERROR_ATTENTION_REQUIRED` + tombol reset |
| Health | — | Tamper / fire / power, uptime, `total_users_reported` vs jumlah di DB (E10) |
| Aksi fisik | — | **Test Relay 1–4** (E7) — `admin` saja, dengan konfirmasi |

- **Kenapa dua indikator status, bukan digabung:** `is_online` bisa `true` sementara LWT sudah
  `OFFLINE` (heartbeat terakhir belum kedaluwarsa), dan sebaliknya LWT `ONLINE` bisa basi kalau
  device mati mendadak tanpa sempat mengirim apa pun. Menggabungkan keduanya jadi satu lampu
  menyembunyikan justru kasus yang paling ingin dilihat teknisi. Usul: satu badge utama + tooltip
  yang menjelaskan sumbernya.
- **Drift user terlihat langsung:** tampilkan `total_users_reported` (dari heartbeat) berdampingan
  dengan jumlah user yang seharusnya. Beda → tandai, karena itu persis pemicu auto-sync di §5.2.
- **Test Relay (E7) — aksi paling berbahaya di seluruh UI.** Ini membuka pintu fisik dari browser.
  Usul perlakuan khusus:
  - Modal konfirmasi yang **menyebut nama pintu**, bukan cuma "Yakin?" ("Buka **Ruang Server**
    (ctrl-A pintu 2) selama 3 detik?").
  - **Disabled kalau controller offline**, dengan alasan tertulis — jangan biarkan perintah mengendap
    di broker lalu pintu terbuka entah kapan.
  - Tampilkan pengingat bahwa aksi ini tercatat atas nama admin yang login.
- **Sumber data:** tabel dari `GET /api/controllers` (polling React Query seperti sekarang);
  `sync_state` & tamper/fire/power didorong lewat WS supaya tidak menunggu interval polling.
- **Konsistensi istilah:** label UI **Bahasa Indonesia**, kode status/reason **English uppercase**
  sesuai Contract Codes. Campuran ini disengaja — perlu di-ACK, jangan sampai nanti setengah diterjemahkan.
- **KEPUTUSAN:** ✅ **ACK 2 indikator status (is_online + link_state), 2 tombol sync (User & Config), dan perlakuan khusus Test Relay (konfirmasi nama pintu, disabled saat offline)** sesuai F5, F8.

---

### 6.4 Live door monitoring — 🟡 USUL: **TUNDA ke v0.4**

Alasan konkret (bukan sekadar "hemat waktu"):
- Butuh **topic MQTT status pintu real-time** yang belum ada di §3.1 dan belum ada di firmware —
  artinya ini menambah kerjaan hardware juga, bukan cuma frontend.
- Butuh backend menyimpan *current state* per pintu (state, bukan event) — model data baru.
- Nilai operasionalnya sebagian **sudah tercakup** alarm `DOOR_HELD_OPEN` (§6.2): pintu yang terbuka
  terlalu lama tetap terdeteksi tanpa panel live.
- **KEPUTUSAN:** ✅ **Tunda ke v0.4** untuk menyederhanakan scope firmware dan database.

---

### 6.5 Tabel terjemahan kode → teks — 🟡 USUL

- **Lokasi:** `src/constants/codes.ts` — satu file, **tiga** `Record<string, string>`: `STATUS_TEXT`,
  `REASON_TEXT`, dan `EVENT_TEXT` (kode event §4.2: `TAMPER_OPEN` → `TAMPER OPEN`, dst), plus helper
  yang mengembalikan `"UNKNOWN"` untuk kode asing (**tidak boleh render string kosong / crash** —
  aturan pemeliharaan kontrak #1).
- **Log `REPLAYED`** ditampilkan sebagai sufiks `" (REPLAYED)"`, sesuai contoh di Contract Codes —
  jadi helper-nya `reasonText(code, isReplayed)`.
- **Bahaya duplikasi:** tabel yang sama akan ada di 3 tempat (`firmware` angka, `backend/app/mqtt/codes.py`,
  `frontend/src/constants/codes.ts`). **Usul mitigasi:** satu test di CI yang membandingkan daftar kode
  backend vs frontend (§7.2), supaya drift ketahuan otomatis, bukan saat demo.
- **KEPUTUSAN:** ✅ **ACK `src/constants/codes.ts` dan test konsistensi kode di CI** sesuai F6.

---

### 6.6 Daftar file frontend yang tersentuh v0.3 — 🟡 USUL (untuk estimasi)

| Aksi | File |
|---|---|
| **Baru (11)** | `constants/codes.ts` · `components/AlarmBanner.tsx` · `components/ConfirmDialog.tsx` · `pages/Alarms/Alarms.tsx` · `pages/Controllers/DoorConfigTab.tsx` · `store/alarmStore.ts` · `api/alarms.ts` · `api/events.ts` · `hooks/useRole.ts` · `utils/resultColor.ts` · `utils/csv.ts` (hasil ekstraksi) |
| **Ubah (12)** | `types/index.ts` (ALARM + 9 reason + kode event + field sync/health) · `ws/liveFeed.ts` (amplop + **token**) · `store/uiStore.ts` (filter `ALARM`, toggle suara) · `pages/Controllers/Controllers.tsx` · `ControllerConfigModal.tsx` · `pages/Logs/AccessLogs.tsx` · `pages/Dashboard/Dashboard.tsx` · `components/Layout.tsx` (banner + label versi) · `components/NavSidebar.tsx` (menu Alarms + filter role) · `components/Badge.tsx` (tone alarm) · `api/controllers.ts` · `App.tsx` (rute `/alarms`) |
| **Ekstrak (roadmap Sprint 1)** | `toCsv()` keluar dari `AccessLogs.tsx`, `accessToDoorIds()` keluar dari `UserDetail.tsx` — prasyarat supaya bisa ditest |

> **Kesimpulan porsi kerja:** **11 file baru + 12 file diubah**, dan yang diubah termasuk file yang
> dipakai **semua** halaman (`types/index.ts`, `Layout`, `Badge`, `uiStore`). Ini bukan "tinggal
> nambah kolom tabel" — perubahan tipe `AccessResult` saja sudah merembet ke seluruh halaman yang
> menampilkan log.

---

### 6.7 RBAC di UI (`viewer`) — 🟡 USUL (konsekuensi §5.5)

Sekarang frontend **tidak punya konsep role sama sekali** — semua yang lolos `ProtectedRoute` dianggap
admin penuh. `useMe()` sudah mengembalikan `role`, jadi bahannya ada, tinggal dipakai.

- **`hooks/useRole.ts`** — `const { isAdmin } = useRole()` dari `useMe()`, dipakai semua aksi.
- **Aturan tampilan:** aksi yang tidak boleh → **di-disable + tooltip alasan**, bukan disembunyikan.
  Menyembunyikan bikin viewer mengira fiturnya tidak ada dan melapor sebagai bug.
- **Menu `Alarms` tetap terlihat** untuk viewer (boleh baca), tapi tombol Acknowledge disabled.
- **Batas tegas:** UI **hanya kosmetik**. Penegakan sesungguhnya di backend (§5.3). Tidak boleh ada
  satu pun aksi yang aman semata-mata karena tombolnya disembunyikan.
- **KEPUTUSAN:** ✅ **ACK disable-bukan-hide untuk viewer dan pembatasan role `admin` vs `viewer`** sesuai F4.

---

### 6.8 WebSocket di sisi klien — 🟡 USUL

- **⚠️ Perbaiki F-a lebih dulu:** `wsUrl()` harus menempel `?token=${localStorage.getItem("jwt")}`.
  Ini **wajib satu paket** dengan pengaktifan `AUTH_ENABLED` di §5.5 — kalau tidak, live feed mati
  begitu auth dinyalakan dan penyebabnya susah ditebak (WS ditutup dengan kode 1008, tanpa pesan).
- **Amplop `{v,type,data}`** (§5.4). `liveFeed.ts` sekarang meng-`JSON.parse` langsung jadi log.
  Usul: `useLiveFeed()` dipecah jadi `useRealtime()` (satu koneksi, mendistribusikan per `type`) —
  **satu koneksi WS untuk seluruh aplikasi**, jangan satu koneksi per komponen.
- **Pesan tanpa `type`** diperlakukan sebagai `log` (kompatibel mundur satu rilis).
- **Reconnect:** sekarang tetap 3 detik selamanya. Usul **backoff** (3 → 6 → 12 → maks 30 detik),
  supaya backend yang sedang mati tidak dihantam ulang terus oleh semua tab yang terbuka.
- **Indikator koneksi:** `connected` sudah ada di hook tapi belum ditampilkan di mana-mana. Usul
  tampilkan titik kecil di header — kalau WS putus, admin harus tahu bahwa "sepi" belum tentu
  berarti "tidak ada kejadian".
- **Banjir REPLAYED** (§5.4): log replay **tidak** masuk live feed sebagai kejadian baru.
- **Dedup di klien:** buang pesan dengan `id` yang sudah ada di daftar — perlindungan lapis dua
  terhadap duplikat QoS 1 (§5.6), murah dan tidak bergantung keputusan B4.
- **KEPUTUSAN:** ✅ **ACK satu koneksi terpusat (`useRealtime`), reconnect backoff, dan indikator koneksi di header** sesuai F5.

---

### 6.9 Perubahan tipe & efek berantainya — 🟡 USUL

`types/index.ts` adalah file paling berbahaya untuk diubah karena dipakai hampir semua halaman.
Urutan yang diusulkan supaya tidak "merah semua" sekaligus:

1. `AccessResult` → `"GRANTED" | "DENIED" | "ALARM"`.
   → TypeScript akan **langsung menunjukkan** semua tempat yang cuma menangani 2 hasil (F-c).
   Ini fitur, bukan gangguan — biarkan compiler yang mencari, jangan cari manual.
2. `AccessReason` → 9 kode v0.3. Usul: **`string`-kan tapi dengan konstanta** — kode dari perangkat
   lapangan bisa saja lebih baru dari frontend (aturan append-only), jadi union yang terlalu ketat
   akan menolak data sah. Union dipakai untuk pilihan filter, bukan untuk data masuk.
3. `uiStore.logsFilter.result` → tambah `"ALARM"` + opsi dropdown (F-b).
4. `Badge` → tambah tone khusus alarm; `resultColor()` dipindah ke `utils/resultColor.ts`.
5. `toCsv()` → kolom baru (`door_number`, `device_ts`) + pindah file (F-d).
6. `Controller` → +`sync_state`, `link_state`, `tamper_state`, `fire_state`, `power_state`,
   `total_users_reported`, `config_version`.
7. Tipe baru: `Alarm`, `ControllerEvent`.

---

### 6.10 Yang TIDAK masuk frontend v0.3 (batas tegas)

Live door monitoring (§6.4), halaman viewer `admin_logs` (datanya ditulis, UI-nya v0.4), grafik/laporan
statistik, notifikasi browser/push, i18n penuh (tetap campuran ID + kode English), dan tema/branding baru.

---

### 6.11 Checklist keputusan §6

Berbeda dari §4/§5, ini keputusan yang **di ranah saya sendiri** — dicatat supaya konsisten, bukan
untuk menunggu jawaban @danskiv:

| # | Pertanyaan | Usulan | Jawaban |
|---|---|---|---|
| F1 | Config pintu: tab di modal atau halaman sendiri? | Tab di modal | _(…)_ |
| F2 | Alarm: halaman sendiri atau cukup filter di Access Logs? | **Halaman sendiri** — alarm punya siklus ack yang tidak dimiliki log | _(…)_ |
| F3 | Suara alarm: ada / tidak / opsional? | Opsional, default menyala | _(…)_ |
| F4 | Aksi terlarang untuk `viewer`: disembunyikan atau disabled? | Disabled + alasan | _(…)_ |
| F5 | Satu koneksi WS terpusat atau per halaman? | Terpusat (`useRealtime`) | _(…)_ |
| F6 | `AccessReason` union ketat atau string + konstanta? | String + konstanta (append-only aman) | _(…)_ |
| F7 | Umpan balik Save config: 1 tahap atau 2 tahap (DB → controller)? | **2 tahap** — jangan bilang "tersimpan" untuk perubahan yang belum sampai ke perangkat | _(…)_ |
| F8 | Test Relay muncul di tabel controller atau di dalam modal config? | Di modal config, tab Pintu — bukan di tabel utama, supaya tidak salah klik | _(…)_ |

---

## 7. PROSES, CI/CD & SCOPE

### 7.0 Kondisi terkini (✅ fakta, hasil cek repo)

| Hal | Kondisi |
|---|---|
| `.github/workflows/` | **Tidak ada sama sekali** — belum ada CI apa pun |
| Test backend | **Sudah pytest**: `backend/pytest.ini` (`asyncio_mode=auto`), `requirements-dev.txt` (`pytest`, `pytest-asyncio`, `httpx`), `tests/{conftest,test_models,test_user_service,test_csv_service}.py` |
| Test frontend | **Nol** — `package.json` tidak punya `vitest` maupun script `test` |
| Test firmware | Belum ada `[env:native]` / folder `firmware/test/` |
| Lint | `oxlint` sudah ada di frontend (`npm run lint`); backend belum ada linter |
| Secret scanning | Belum ada (gitleaks). `.env` sudah masuk `.gitignore` ✅ |
| Branch protection | Belum aktif |
| Deployment | Manual sepenuhnya. Referensi terdekat: [`VM_TESTING_PLAN.md`](pendukung/VM_TESTING_PLAN.md) (VM Debian + Docker `mysql:8.0` & `emqx/emqx:5.8` + uvicorn) |

#### Dua temuan yang mengubah rancangan CI (⚠️ hasil audit, bukan asumsi)

| # | Temuan | Akibatnya untuk v0.3 |
|---|---|---|
| **C-a** | **Test backend memakai SQLite, dan skemanya dibangun dari MODEL — bukan dari `schema.sql`.** `tests/conftest.py` memanggil `Base.metadata.create_all()` di atas `sqlite:///test.db` | Dua lubang sekaligus: **(1)** `schema.sql`/migrasi bisa melenceng dari model tanpa satu pun test gagal; **(2)** semua hal khas MySQL **tidak pernah teruji** — `ENUM`, `DATETIME(3)`, FK `RESTRICT`, dan **CHECK constraint §4.1** yang justru jadi pengaman utama config pintu. Bahkan `_is_online_expr` **mustahil** dites di SQLite karena memakai `func.timestampdiff()` |
| **C-b** | **`conftest.py` menyemai data saat IMPORT**, ke file `test.db` yang dihapus-buat di direktori kerja | Di CI ini rapuh: tidak ada isolasi antar test, sisa file bisa terbawa, dan urutan test jadi berpengaruh. Perlu diubah ke fixture sebelum dipakai sebagai gerbang merge |
| **C-c** | **`platformio.ini` masih `[env:esp32dev]` (ESP32 klasik)** | v0.3 memakai ESP32-S3-WROOM-1-N16 + partisi 16MB. CI firmware harus mengompilasi environment **baru** `esp32s3_16mb`, bukan yang lama |

> **Koreksi ke roadmap:** [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) Sprint 1 menulis pytest & `requirements-dev.txt`
> sebagai pekerjaan yang belum ada. Keduanya **sudah ada**. Tapi sebaliknya, roadmap **tidak menyebut** dua
> pekerjaan yang ternyata perlu: memindahkan test DB ke MySQL sungguhan (C-a) dan merapikan `conftest.py` (C-b).

---

### 7.1 CI/CD — 🟡 USUL

#### (a) Kapan mulai
- **USUL: SEBELUM baris kode fitur v0.3 pertama, dan ini blocking.** Alasannya bukan idealisme —
  v0.3 mengubah **kontrak lintas layer** (format log, topic, tipe frontend). Kelas bug yang paling
  mungkin muncul adalah "backend dan frontend tidak sepakat kode", dan itu persis yang bisa
  ditangkap otomatis oleh test kontrak (§7.2) dan **tidak bisa** ditangkap review manual dengan andal.
- Biayanya ~1–2 hari (backend sudah setengah jalan), bukan 4 hari seperti estimasi roadmap.

#### (b) Batas CI vs CD di v0.3 — 🟡 USUL

Supaya tidak salah harap sejak awal:

```
  PR ──► [ CI: verifikasi ]  ──merge──► dev ──► [ CI ulang ]
                                                    │
                              tag v0.3.0 ──► [ CD: BUILD ARTEFAK ]
                                                    │
                                        artefak siap pasang (GitHub Release)
                                                    │
                                        ┌───────────┴───────────┐
                                        │  PEMASANGAN = MANUAL  │  ◄── v0.3
                                        │  (terdokumentasi,     │
                                        │   satu perintah/tahap)│
                                        └───────────────────────┘
```

**CD di v0.3 berhenti di "menghasilkan artefak", bukan "memasang ke server".** Tiga alasan:
1. Memasang berarti menyentuh sistem yang **mengendalikan pintu fisik**. Deploy otomatis ke perangkat
   keamanan tanpa manusia menekan tombol bukan penghematan yang sepadan.
2. Target pasangnya masih satu VM di LAN ([`VM_TESTING_PLAN.md`](pendukung/VM_TESTING_PLAN.md)) — GitHub Actions
   tidak bisa menjangkaunya tanpa membuka jalur masuk baru ke jaringan gedung.
3. Kredensial produksi (DB, MQTT, JWT) belum punya tempat penyimpanan yang layak.

Yang **tetap didapat**: artefak yang sama persis dengan yang diuji CI, ter-versi, bisa di-rollback, dan
prosedur pasangnya tertulis (§7.6) — bukan "build di laptop siapa yang lagi sempat".

#### (c) Matriks workflow — 🟡 USUL

| # | Workflow | File | Trigger | Isi | Gerbang merge? |
|---|---|---|---|---|:--:|
| W1 | **Backend** | `backend-ci.yml` | PR, `paths: backend/**` | `pip install -r requirements-dev.txt` → `ruff` (baru) → `pytest` **dengan service container `mysql:8.0`** | ✅ |
| W2 | **Frontend** | `frontend-ci.yml` | PR, `paths: frontend/**` | `tsc --noEmit` → `oxlint` → `vitest run` → `npm run build` | ✅ |
| W3 | **Firmware** | `firmware-ci.yml` | PR, `paths: firmware/**` | `pio test -e native` → `pio run -e esp32s3_16mb` (compile) → unggah `firmware.bin` sebagai artifact | ✅ |
| W4 | **Database** | `db-ci.yml` | PR, `paths: database/**`, `backend/app/models/**` | **BARU** — lihat (d) di bawah | ✅ |
| W5 | **Kontrak** | `contract-ci.yml` | PR, `paths: backend/**`, `frontend/**`, `firmware/**`, `docs/CONTRACT-CODES-V0.3.md` | Bandingkan tabel **STATUS + REASON + EVENT** di `app/mqtt/codes.py` ↔ `src/constants/codes.ts` ↔ konstanta firmware ↔ dokumen | ✅ |
| W6 | **Secret scan** | `gitleaks.yml` | semua PR | Repo menyimpan config MQTT/DB; `.env` sudah di-ignore tapi riwayat & contoh config tetap perlu discan | ✅ |
| W7 | **Integrasi** | `integration-ci.yml` | **manual + nightly**, bukan tiap PR | Docker compose: MySQL + EMQX + backend + `simulate_esp32.py` → jalankan 8 skenario §7.2(d) end-to-end | ❌ (lambat) |
| W8 | **Rilis** | `release.yml` | `push: tags: v*` | Build & lampirkan artefak (§7.6b) ke GitHub Release | ❌ |

- **Branch protection `dev`**: required status checks = **W1–W6**. Sesuai
  [`CONTRIBUTING.md`](../CONTRIBUTING.md) & roadmap: **jangan merge sendiri**.
- **W7 sengaja tidak jadi gerbang merge.** Menyalakan MySQL + EMQX + backend tiap PR bikin siklus review
  lambat dan sering merah karena hal yang tidak berhubungan (flaky, timeout broker). Cukup nightly +
  bisa dipicu manual sebelum rilis.

#### (d) `db-ci.yml` — workflow yang tidak ada di roadmap tapi paling dibutuhkan v0.3

Ini jawaban langsung untuk temuan **C-a**. Jalan di atas service container `mysql:8.0` sungguhan:

| Langkah | Isi | Menangkap bug apa |
|---|---|---|
| 1 | `mysql < database/schema.sql` | DDL rusak/tidak urut |
| 2 | Jalankan `database/migrations/*.sql` **berurutan** | Migrasi tidak bisa diterapkan di atas skema bersih |
| 3 | `mysql < database/seed.sql` | Seed tidak cocok skema baru (mis. kolom `dX_` belum diisi) |
| 4 | **Uji CHECK constraint benar-benar menolak**: `held_timeout_s < open_timeout_s`, `open_timeout_s = 0`, `alarm_duration_s > 600` | §4.1 — pengaman config pintu yang di SQLite tidak berarti apa-apa |
| 5 | **Bandingkan model SQLAlchemy vs skema nyata** (kolom, tipe, nullability) | `schema.sql` melenceng dari `models/` — persis lubang C-a |
| 6 | Uji **idempotensi & rollback**: terapkan migrasi 2×, lalu jalankan blok rollback dan pastikan skema kembali | Migrasi yang tidak aman diulang saat deploy gagal separuh jalan |
| 7 | Uji `time_zone='+00:00'` aktif (aturan **R2**, §4.3) | Jebakan `created_at` vs `server_ts` beda 7 jam |

> Dengan W4 ada, `backend-ci` (W1) juga sebaiknya dipindah ke MySQL service container yang sama —
> supaya `_is_online_expr` (`func.timestampdiff`) dan handler baru bisa benar-benar dites, bukan dilewati.

- **KEPUTUSAN:** ✅ **ACK**. Required status checks W1–W6 wajib hijau sebelum merge (blocking), W4 (`db-ci.yml`) disetujui berjalan di atas MySQL container, dan test backend dipindahkan ke MySQL service container.

#### (e) Yang TIDAK masuk v0.3
Auto-deploy ke server, registry image publik, canary/blue-green, dan dashboard monitoring. `backend/Dockerfile`
(roadmap Sprint 4) **tetap dibuat** — tapi sebagai bahan artefak rilis (§7.6), bukan pemicu deploy otomatis.

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

#### (b) Test level unit/integrasi per layer

| Layer | Jalan di | Yang wajib ditest di v0.3 |
|---|---|---|
| **Database** | `mysql:8.0` (W4) | CHECK constraint menolak nilai terlarang · migrasi bisa diterapkan & di-rollback · model ↔ skema tidak melenceng · `time_zone` UTC |
| **Backend** | `mysql:8.0` (W1) | `codes.py` (semua angka + angka asing → `UNKNOWN`) · `handle_log` (v0.2 vs v0.3, kartu kosong, `REPLAYED`, RTC ngaco → guard R4) · `handle_event` (state controller ikut berubah) · state machine reconcile (3× gagal → `SYNC_ERROR_ATTENTION_REQUIRED`) · `alarm_service` (idempoten, `cleared_at` ≠ `acked_at`) · RBAC (`viewer` ditolak di endpoint aksi fisik) · `_is_online_expr` |
| **Frontend** | node/vitest (W2) | `reasonText()`/`eventText()` termasuk kode asing & `REPLAYED` · `toCsv()` · `accessToDoorIds()` · `normalizeKartu` · validasi lintas-field `held ≥ open` · reducer amplop WS (`type` tak dikenal tidak bikin crash) |
| **Firmware** | `[env:native]` (W3) | `checkAccess()` · `normalizeKartu()` · **door state machine** (forced/held/unopened) sebagai logika murni · parser/serializer payload v0.3 |

> **Catatan untuk @danskiv:** agar baris firmware itu mungkin, **door state machine harus ditulis sebagai
> kelas tanpa memanggil `digitalWrite`/`millis` langsung** (waktu & IO di-inject). Keputusan desain ini
> harus diambil **sebelum** kode ditulis — lihat §2.4.

#### (c) Test kontrak lintas layer (usul baru, tidak ada di roadmap)
Satu tabel *golden payload* — persis contoh di [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md)
("Contoh Payload Real & Terbaca") — dipakai sebagai **fixture bersama** oleh ketiga layer: firmware
memastikan ia **menghasilkan** payload itu, backend memastikan payload → kode DB benar, frontend
memastikan kode DB → teks UI benar. Kalau ada yang mengubah arti angka, W5 merah.

#### (d) Skenario end-to-end yang dijalankan W7 (nightly)

Ini yang menggantikan "colok hardware dulu baru ketahuan":

| # | Skenario | Membuktikan |
|---|---|---|
| S1 | Tap kartu valid → log muncul di DB & WS | Jalur utama v0.3 utuh |
| S2 | REX (kartu kosong) & `DOOR_FORCED_OPEN` | `kartu` NULLABLE benar-benar jalan (§4.5, §5.1c) |
| S3 | Controller putus mendadak → LWT → reconnect → replay 50 log | `server_ts` REPLAYED dari RTC (R3), tidak membanjiri live feed (§5.4) |
| S4 | Heartbeat dengan `total_users` salah | Drift check memicu sync (§5.2d) |
| S5 | Controller nakal: gagal `sync/result` 3× | `SYNC_ERROR_ATTENTION_REQUIRED` + alarm (§5.2e) |
| S6 | Tamper open lalu close | Alarm `cleared_at` terisi tapi tetap menunggu ack (§5.7 #1) |
| S7 | Ubah config pintu → push → controller balas `config_version` baru | Rekonsiliasi config (§5.2f) |
| S8 | Kirim angka reason yang belum terdaftar (mis. `99`) | Sistem **tidak crash**, tercatat `UNKNOWN` (aturan kontrak #1) |

- **KEPUTUSAN:** ✅ **ACK (a)–(d) dan 8 skenario end-to-end**. Perluasan simulator disepakati sebagai tanggung jawab pekerjaan backend.

---

### 7.3 Keputusan scope — 🟡 USUL: **DIPECAH**

Rekomendasi: **jangan satu rilis besar.** Dasar pertimbangan dari §8 — **9 dari 11 fitur** menyentuh
backend & frontend, dan 4 di antaranya menyentuh keenam layer sekaligus. Satu rilis besar = satu titik
integrasi raksasa di akhir, persis pola yang bikin v0.2 molor.

| Rilis | Isi | Kriteria selesai |
|---|---|---|
| **v0.3.0** | CI (W1–W6) + test (§7.1–7.2) + pipeline artefak rilis (§7.6) · kontrak MQTT dibekukan (§3) · **seluruh** delta DB dijalankan sekali (§4, termasuk tabel yang UI-nya belum dibuat) · rework handler log/heartbeat/LWT/events + `codes.py` (§5.1) · alarm **raise/clear** di backend (§5.7) · config per-pintu end-to-end (E3/E4 + §6.1) · ALARM tampil di log + badge (§6.2 lapis 3) · RBAC + audit (§5.5, §6.7) · hardware + firmware fisik | Kartu fisik → pintu fisik → log & alarm tampil benar di dashboard, CI hijau |
| **v0.3.1 / v0.4** | Auto-reconciliation penuh (§5.2) · relay test E7 · halaman Alarms + acknowledge + banner + suara (§6.2 lapis 1–2) · live door monitoring (§6.4) · refresh token, HTTPS, MQTT TLS | Sistem bisa dioperasikan tanpa terminal |

**Dua alasan pemisahan yang spesifik:**
- **Skema DB tidak ikut dipecah.** Migrasi 001 dijalankan **utuh** di v0.3.0 meski `alarms`/`admin_logs`
  belum punya UI penuh — memecah migrasi berarti dua kali downtime dan dua kali revisi ERD, sementara
  menjalankannya utuh tidak merusak apa pun (§4.5 backward-compatible).
- **Auto-reconciliation ditunda** karena butuh worker thread + state machine, dan **nilainya baru terasa
  setelah ada controller yang benar-benar sering putus-nyambung di lapangan** — sesuatu yang belum bisa
  diamati sebelum v0.3.0 terpasang.

- **KEPUTUSAN:** ✅ **Rilis dipecah menjadi v0.3.0 (fondasi & integrasi fisik) dan v0.3.1/v0.4 (otomatisasi penuh & UI lengkap)** sesuai rekomendasi. Skema database dijalankan utuh di v0.3.0.

---

### 7.4 Urutan kerja & siapa memblokir siapa — 🟡 USUL

Yang harus dijawab **paling dulu** karena memblokir orang lain:

| Prioritas | Item | Siapa | Memblokir |
|:--:|---|---|---|
| 1 | §2.1 Wiegand → `card_id` mapping | @danskiv | **Semua.** Kalau format kartu tidak cocok DB, tidak ada yang jalan |
| 2 | §3.1 tabel topic final + **B6** (bentrok `status`) + **D4/D6** (topic `events`) | Berdua | Backend & firmware tidak bisa mulai koding protokol |
| 3 | §4.6 **D1–D9** (skema DB) | @danskiv ACK | Backend, lalu frontend |
| 4 | §5.10 **B1–B5, B7, B8** | @danskiv | Detail handler backend (bisa dikerjakan sebagian sambil menunggu) |
| 5 | §7.1 CI aktif (W1–W6) + §7.7 **C1–C4** | @rizzalaulia | Semua PR sesudahnya |
| 6 | §6.11 **F1–F8** | @rizzalaulia | Frontend saja — **tidak memblokir siapa pun**, boleh diputuskan sendiri |

Setelah 1–3 dijawab, **backend & frontend bisa jalan paralel penuh dengan firmware** — sama seperti pola
v0.2 yang berhasil (lihat [`KEPUTUSAN_ARSITEKTUR_v0.2.md`](v0.2/KEPUTUSAN_ARSITEKTUR_v0.2.md) §2: "yang
menghubungkan hanya dokumen kontrak").

> **Yang bisa dimulai SEKARANG tanpa menunggu jawaban apa pun:** migrasi DB (§4.5 — backward-compatible,
> sistem v0.2 tetap jalan), CI/CD (§7.1), ekstraksi `toCsv()`/`accessToDoorIds()` (§6.6), dan perbaikan
> **F-a** (token WebSocket, §6.0b) yang memang bug terlepas dari v0.3.

### 7.5 Definition of Done per layer — 🟡 USUL

Sebuah fitur v0.3 baru boleh disebut selesai kalau: **(1)** ada test otomatis yang gagal sebelum fitur dibuat,
**(2)** CI hijau, **(3)** bisa didemokan lewat simulator tanpa hardware, **(4)** kontrak yang dipakainya
sudah tertulis di dokumen ini — bukan cuma di kepala yang mengerjakan.
- **KEPUTUSAN:** ✅ **ACK 4 syarat Definition of Done (DoD)** untuk menjamin kualitas rilis.

---

### 7.6 Deployment & artefak rilis — 🟡 USUL

#### (a) Tiga lingkungan

| Lingkungan | Di mana | Isi | Siapa |
|---|---|---|---|
| **Dev** | Laptop masing-masing (Windows) | MySQL + EMQX via Docker, uvicorn + `npm run dev`, `simulate_esp32.py` sebagai pengganti controller | Masing-masing |
| **Staging** | VM Debian di LAN ([`VM_TESTING_PLAN.md`](pendukung/VM_TESTING_PLAN.md)) | Container `mysql:8.0` + `emqx/emqx:5.8` + backend, **controller fisik sungguhan** di LAN yang sama | Berdua, sebelum rilis |
| **Produksi** | Server/mini-PC di gedung | Sama seperti staging + reverse proxy TLS (§5.5, ditunda) | Pemasangan manual |

> Staging **wajib dilewati** sebelum firmware disebar. Ini satu-satunya tempat kombinasi
> backend v0.3 + firmware v0.3 + controller fisik bertemu sebelum kena pintu sungguhan.

#### (b) Artefak yang dihasilkan `release.yml` (W8) saat tag `v0.3.0`

| Artefak | Dari | Dipakai untuk |
|---|---|---|
| `backend-v0.3.0.tar.gz` (+ opsional image Docker) | `backend/` | Dipasang di VM/server |
| `frontend-dist-v0.3.0.zip` | `npm run build` | Disajikan reverse proxy / nginx |
| `firmware-v0.3.0.bin` | `pio run -e esp32s3_16mb` | **Diunggah teknisi lewat Web Config 8081** (OTA, §2.6) |
| `schema-v0.3.0.sql` + `migrations/*.sql` | `database/` | Dijalankan sebelum backend baru hidup |
| `CHANGELOG` + catatan rilis | Repo | Rekam jejak |

> **Kenapa `firmware.bin` ikut jadi artefak rilis:** jalur pasang firmware v0.3 adalah **unggah manual
> lewat portal 8081**. Kalau `.bin`-nya di-build di laptop, tidak ada jaminan yang terpasang di pintu
> sama dengan yang lolos CI. Dengan W3/W8, file yang diunggah teknisi **persis** yang diuji.

#### (c) Penomoran versi — satu sumber, tiga layer

Sekarang versi ditulis manual dan sudah mulai salah: `components/Layout.tsx` masih menampilkan
**"Access Control System v0.2"** secara hardcoded.

| Layer | Cara | Terlihat di |
|---|---|---|
| Backend | Env/`__version__` dari tag | `GET /health` |
| Frontend | `define` Vite dari tag saat build | Label header (ganti teks hardcoded) |
| Firmware | `-DFW_VERSION=\"v0.3.0\"` di `build_flags` | Dilaporkan ke `controllers.fw_version` |

> **Ini menutup satu lubang §4:** kolom `fw_version` sudah ada di ERD tapi **tidak akan pernah terisi**
> kalau firmware tidak dibangun dengan versi yang ditanam. Sekaligus membuat pertanyaan "unit mana yang
> belum di-OTA?" bisa dijawab dari dashboard, bukan dari catatan teknisi.

#### (d) Urutan pemasangan & rollback

```
 1. Backup DB                     ──► wajib, sebelum apa pun
 2. Jalankan migrasi 001          ──► AMAN: backward-compatible, v0.2 tetap jalan (§4.5)
 3. Pasang backend v0.3           ──► /health hijau + MQTT connected
 4. Pasang frontend v0.3          ──► cek 1 halaman log & 1 controller
 5. Perbarui EMQX auth/ACL        ──► controller lama tidak boleh langsung tertolak
 6. OTA firmware — SATU unit dulu ──► amati 24 jam sebelum sisanya
```

| Kalau gagal di | Rollback |
|---|---|
| 3 / 4 | Pasang kembali artefak versi sebelumnya. **DB tidak perlu di-rollback** — justru itu gunanya migrasi backward-compatible |
| 6 (firmware) | Partisi A/B: rollback otomatis kalau gagal boot / watchdog < 30 detik (§2.6) |
| DB | Blok rollback ada di `001_v0.3_schema_delta.sql`, **tapi ini pilihan terakhir** — kalau sudah ada alarm/event tercatat, rollback berarti membuang data. Lebih baik perbaikan maju |

- **Aturan langkah 6:** jangan pernah OTA semua controller sekaligus. Satu unit → tunggu → sisanya.
- **Aturan langkah 2:** migrasi dijalankan **sebelum** backend baru, bukan sesudah, dan boleh dijalankan
  jauh-jauh hari karena tidak merusak v0.2.

#### (e) Kredensial & rahasia

- `.env` **tidak pernah** masuk repo (sudah di `.gitignore` ✅), diverifikasi ulang oleh W6 gitleaks.
- Kredensial MQTT **per-controller** dibuat saat provisioning (`tools/setup_emqx_auth.py`) — endpoint
  `POST /api/controllers` (E1) harus jelas apakah ikut memprovisioning atau tetap manual (catatan
  roadmap Sprint 4 yang belum diverifikasi).
- **GitHub Secrets belum diperlukan** di v0.3 justru karena CD berhenti di artefak (§7.1b).
- `JWT_SECRET_KEY` divalidasi saat startup (§5.5) — deploy dengan secret kosong **gagal boot**,
  bukan jalan diam-diam.

- **KEPUTUSAN:** ✅ **ACK 3 Lingkungan (Dev/Staging/Prod), daftar 5 artefak rilis, 6 langkah urutan pasang, dan penomoran versi 3 layer** sesuai usulan.

---

### 7.7 Checklist keputusan §7 (C1–C8) — 🟡 REKOMENDASI FINAL DANAS

Seluruh usulan keputusan proses, CI/CD, testing, dan deployment ditinjau oleh @danskiv (menunggu ACK akhir @rizzalaulia):

| # | Pertanyaan | Usulan saya | Rekomendasi Final Danas |
|---|---|---|---|
| C1 | CI dikerjakan sebelum fitur v0.3 (blocking) atau paralel? | **Sebelum, blocking** — v0.3 mengubah kontrak lintas layer | ✅ **Sebelum, blocking** |
| C2 | Test backend pindah ke MySQL service container? | **Ya** — SQLite membuat CHECK/ENUM/`timestampdiff` tidak pernah teruji | ✅ **Ya** (Pindah ke MySQL container) |
| C3 | `db-ci.yml` (W4) dibuat? | **Ya** — mencegah `schema.sql` melenceng dari model | ✅ **Ya** (`db-ci.yml` dibuat) |
| C4 | `conftest.py` dirapikan ke fixture sebelum jadi gerbang merge? | Ya (C-b) | ✅ **Ya** |
| C5 | Workflow integrasi (W7) nightly atau tiap PR? | **Nightly + manual** — tiap PR bikin review lambat & flaky | ✅ **Nightly + manual** |
| C6 | `firmware.bin` jadi artefak rilis resmi? | **Ya** — supaya yang diunggah ke pintu sama dengan yang lolos CI | ✅ **Ya** (`firmware.bin` jadi artefak rilis resmi) |
| C7 | Versi ditanam otomatis di 3 layer dari tag? | Ya — mengisi `controllers.fw_version` | ✅ **Ya** (Penomoran versi terintegrasi dari tag) |
| C8 | Auto-deploy ke VM/server masuk v0.3? | **Tidak** — CD berhenti di artefak, pemasangan manual terdokumentasi | ✅ **Tidak** (CD berhenti pada pembentukan artefak) |

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
| RTC / timestamp | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ ¹ |
| Wiegand reader | ✅ | ✅ | — | — | ✅ ² | — |
| 2 tombol sync | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Alarm + acknowledge** ³ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Relay test dari dashboard** ³ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **RBAC admin/viewer + audit** ³ | — | — | — | ✅ | ✅ | ✅ |

¹ Frontend ikut tersentuh: konversi UTC→lokal browser (R5) dan filter tanggal yang harus dikirim sebagai rentang UTC (R6).
² Backend ikut tersentuh: `normalize_kartu()` harus menghasilkan format identik dengan firmware (§5.8) — kalau beda, semua kartu tidak match.
³ Tiga baris terakhir **tidak ada di matriks versi awal** — baru muncul setelah §4–§6 dirancang.

> Kesimpulan: dari **11** fitur besar, **9 menyentuh backend & frontend**, dan 3 di antaranya justru
> **tidak terlihat sama sekali** sebelum software-nya didesain. Porsi software v0.3 setara (atau lebih
> besar) dari hardware — harus didesain dengan kedalaman yang sama.

**Bukti konkret setelah §4–§7 diisi (revisi 23 Juli 2026):**

| Layer | Wujud kerja v0.3 | Rujukan |
|---|---|---|
| Database | **3 tabel baru** (`controller_events`, `alarms`, `admin_logs`) · **+22 kolom** di 3 tabel lama (15 `controllers`, 4 `doors`, 3 `access_logs`) · 4 CHECK constraint · 1 kolom dilonggarkan (`kartu`) · aturan waktu R1–R6 | §4.1–4.5 |
| Backend | **12 file baru + 8 file diubah** · 6 handler MQTT di-rework/ditambah · **10 endpoint** baru/berubah · worker thread + state machine sync · siklus hidup alarm · amplop WS 4 jenis pesan · 5 item keamanan + RBAC | §5.0–5.10 |
| Frontend | **11 file baru + 12 file diubah** · tipe inti (`AccessResult`/`AccessReason`) berubah → merembet ke semua halaman log · 1 halaman baru + 1 tab baru + 1 store baru · RBAC dari nol · WS jadi 4 jenis pesan + perbaikan token | §6.0–6.11 |
| Proses & rilis | **8 workflow dari nol** (termasuk `db-ci` di MySQL sungguhan) · test runner frontend dari nol · test backend pindah dari SQLite ke MySQL · perluasan simulator + 8 skenario end-to-end · test kontrak lintas layer · pipeline artefak rilis 5 keluaran + penomoran versi 3 layer | §7.0–7.7 |

---

## 9. Riwayat Revisi & Status Dokumen

### 9.1 Riwayat revisi dokumen

| Tanggal | Oleh | Perubahan |
|---|---|---|
| 22 Jul 2026 | @rizzalaulia | Versi awal: kerangka §0–§8, sebagian besar berisi pertanyaan 🔴 TERBUKA |
| 23 Jul 2026 | @rizzalaulia | **§4 Database** ditulis lengkap (opsi + alasan + 2 artefak: [`ERD_v0.3.mermaid`](ERD_v0.3.mermaid), [`001_v0.3_schema_delta.sql`](../database/migrations/001_v0.3_schema_delta.sql)); checklist D1–D9 |
| 23 Jul 2026 | @rizzalaulia | **§5 Backend** ditulis lengkap (peta modul, kontrak threading, 6 handler, idempotensi, siklus hidup alarm, konsekuensi lintas layer); checklist B1–B8. Menambahkan `alarms.cleared_at` ke §4/ERD/SQL (D9) |
| 23 Jul 2026 | @rizzalaulia | **§6 Frontend** ditulis lengkap (4 temuan audit, kontrak state, RBAC, WS, efek berantai tipe); checklist F1–F8 |
| 23 Jul 2026 | @rizzalaulia | **Revisi menyeluruh:** peta status per bagian, koreksi §0.2 (WiFi bukan cadangan MQTT), §2.3 & §3.2 turun dari 🔴 ke 🟡 karena usulannya sudah ada, §3.1 jadi tabel status per topic, §8 ditambah 3 fitur yang baru terlihat setelah software didesain |
| 23 Jul 2026 | @rizzalaulia | **§7 CI/CD, test & deployment** ditulis lengkap: 8 workflow (termasuk `db-ci` di MySQL sungguhan), batas CI vs CD, strategi test per layer + 8 skenario end-to-end, §7.6 deployment (3 lingkungan, artefak rilis, penomoran versi 3 layer, urutan pasang & rollback); checklist C1–C8. Temuan C-a/C-b/C-c dicatat |
| 23 Jul 2026 | @danskiv | **REKOMENDASI FINAL DANAS:** Mengisi seluruh jawaban checklist (§1.1 & §2.1, D1–D9, B1–B8, C1–C8) dengan status final dari sisi Danas, siap diserahkan ke Emping (@rizzalaulia) untuk di-review akhir sebelum dibekukan penuh bersama. |
| 24 Jul 2026 | @rizzalaulia | **Review PR #61.** 3 temuan mayor: (1) `fire_assignments`/`fire/override` MCFA lintas-controller menyeludupkan scope yang sudah disepakati keluar dari v0.3 (§5.9/§7.3); (2) `fire/override` Retained tanpa protokol clear — pintu bisa menganga selamanya; (3) `seq` reset saat reboot bisa membuat `UNIQUE(device_id, seq)` menolak & menghilangkan log sah. Ditulis sebagai komentar review resmi di PR |
| 24 Jul 2026 | @danskiv | Menangkis 3 temuan: NVS `last_seq` (persist lintas-reboot), `door_number` ditambahkan ke payload event, `config/response` diubah Non-Retained. MCFA sementara di-push dengan asumsi masuk v0.3 (commit `9cbed07`) |
| 24 Jul 2026 | @rizzalaulia | **Keputusan MCFA: ditunda ke v0.4.** Ditemukan bug jalur evakuasi bersama (2 gedung berbagi 1 pintu evakuasi, proteksi clear "blanket zero" bisa mengunci pintu saat salah satu gedung masih kebakaran) — alasan lengkap sekarang di §2.5. Diminta 4 tindak lanjut: cabut `fire_assignments`/`fire/override` dari migrasi & kontrak, tambah catatan penundaan di §2.5 |
| 24 Jul 2026 | @danskiv | Menjalankan 4 tindak lanjut (commit `7dc1326`): `fire_assignments` dicabut dari migrasi & ERD, `fire/override` dicabut dari kontrak/Contract Codes/testing guide, §2.5 diberi catatan penundaan ke v0.4, 3 perbaikan sebelumnya dipertahankan |
| 25 Jul 2026 | @rizzalaulia | **PR #61 di-ACK & di-merge** ke `dev` (merge commit `8ff0f21`). Semua checklist §1–§7 tertutup, tidak ada `🔴 TERBUKA` tersisa. Folder `docs/` dirapikan jadi 3 lapis (aktif v0.3 / pendukung / arsip v0.2) di commit `2c9ac0d` |
| 25 Jul 2026 | @rizzalaulia | **Audit menyeluruh** atas `ROADMAP_v0.3.md`, `ARCHITECTURE-PROPOSAL-V0.3.md`, `HARDWARE-AUDIT-REVIEW-V0.3.md` terhadap dokumen ini. Temuan: roadmap basi total (tidak menyebut 90% pekerjaan yang sudah diputuskan); proposal arsitektur berkontradiksi aktif (reason kalimat Inggris, GMT+7, "8 tabel", tabel pin lama termasuk konflik `GPIO34` yang sudah dipindah); audit hardware ber-status "APPROVED final" tapi 2 poin (Poin 3 WDI, Poin 10 sensing PLN) sudah dianulir keputusan pin §1.1. Alasan bug evakuasi MCFA dipindah dari komentar PR ke §2.5 secara permanen. Status dokumen (bagian atas & §9.3) diperbarui mencerminkan sudah di-ACK & di-merge |

### 9.2 Koreksi yang dibuat terhadap dokumen sumber

Ditulis terpisah supaya tidak hilang — ini beda dengan dokumen lain yang jadi rujukan:

| Koreksi | Dokumen sumber yang perlu menyusul |
|---|---|
| `reason` di payload bukan kalimat Inggris (`Valid Access`) tapi **angka** | [`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) §3A masih menulis kalimat |
| Timestamp **UTC**, konversi dinamis di browser — **bukan** disimpan sebagai GMT+7 | [`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) §4B masih memakai contoh `timezone(timedelta(hours=7))` |
| Tabel DB bertambah dari 8 → **11** | Proposal §4A masih menulis "8 tabel utama" |
| `pytest`, `requirements-dev.txt`, `backend/tests/` **sudah ada** | [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) Sprint 1 masih menulis belum ada |
| Sebaliknya, roadmap **tidak menyebut**: test DB pindah ke MySQL (C-a), rapikan `conftest.py` (C-b), `platformio.ini` masih ESP32 klasik (C-c), dan pipeline artefak rilis (§7.6) | [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) Sprint 1 & 7 |
| ERD lama menamai tabel auth `ADMIN_USERS`, skema nyata memakai `admins` | [`ERD_v0.2.mermaid`](v0.2/ERD_v0.2.mermaid) |
| `admin_logs` digambar di ERD v0.2 tapi tidak pernah ada di `schema.sql` | [`ERD_v0.2.mermaid`](v0.2/ERD_v0.2.mermaid) vs `database/schema.sql` |
| `fire/override` payload, tabel angka event, dan skema delta — sudah naik ke **v0.3.1** (field `seq`, `door_number` di event) | [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md) — **sudah diperbarui** di PR #61, tidak perlu tindak lanjut lagi |
| Tabel pin §1 & §2A masih memakai alokasi lama (`GPIO1-4` relay, `GPIO34` dobel INTA/WDI, `GPIO1` ADC) | [`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) §1, [`PROPOSAL-RANCANGAN-HARDWARE-V0.3.md`](PROPOSAL-RANCANGAN-HARDWARE-V0.3.md) §2A/§2B — **diperbaiki 25 Jul 2026**, lihat §9.4 |
| Payload MQTT proposal tanpa `seq`/`door_number`, payload log masih 4 field | [`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) §3A — **diperbaiki 25 Jul 2026** |
| Matriks Hardware Audit Poin 3 (WDI→`GPIO34`) & Poin 10 (`GPIO1` ADC PLN) berstatus "APPROVED final" padahal sudah dianulir §1.1 | [`HARDWARE-AUDIT-REVIEW-V0.3.md`](HARDWARE-AUDIT-REVIEW-V0.3.md) — **diperbaiki 25 Jul 2026** |
| Roadmap tidak menyebut 90% keputusan v0.3 (alarm, RBAC, MCFA, seq/NVS, CI 8 workflow, dst) | [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) — **ditulis ulang 25 Jul 2026**, lihat §9.4 |

### 9.3 Status Dokumen

- **Tanggal pembekuan checklist:** **24–25 Juli 2026**
- **Disusun oleh:** @danskiv (rekomendasi teknis) & @rizzalaulia (review, keputusan MCFA, ACK akhir)
- **Status Dokumen:** ✅ **DI-ACK & DI-MERGE** ke `dev` via PR #61 (merge commit `8ff0f21`, 25 Jul 2026).
  Seluruh checklist (§1.1 & §2.1, D1–D9, B1–B8, C1–C8) terjawab, F1–F8 diputuskan internal.
  Tidak ada lagi `🔴 TERBUKA` di §1–§7.
- **Yang tersisa bukan isi dokumen ini**, tapi menyamakan 3 dokumen turunan (roadmap, proposal arsitektur,
  audit hardware) dengan keputusan final di sini — lihat §9.4.

### 9.4 Penyelarasan dokumen turunan (25 Jul 2026)

Setelah dokumen ini di-ACK & merge, tiga dokumen berikut disamakan ulang supaya tidak ada lagi yang
berkontradiksi dengan keputusan final:

| Dokumen | Perubahan |
|---|---|
| [`ROADMAP_v0.3.md`](ROADMAP_v0.3.md) | Ditulis ulang total. Sprint 1–7 lama (generik, pra-audit) diganti struktur sprint yang mencerminkan pekerjaan nyata: skema DB & migrasi, handler MQTT v0.3.1 (`codes.py`, `seq`, event), alarm lifecycle, RBAC, 8 workflow CI (`db-ci` dsb), 3 lingkungan deployment, MCFA v0.4 dicatat eksplisit sebagai *di luar scope v0.3* |
| [`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) | Tabel alokasi pin §1 diperbarui ke `GPIO33/40/47/48/EN` + `GPIO1` Digital Input; payload MQTT §3 diperbarui ke format v0.3.1 (`seq`, `door_number` event); §4 waktu diperbaiki dari contoh GMT+7 ke UTC; jumlah tabel DB diperbaiki 8→11; setiap titik yang diperbaiki ditandai `[DIPERBAIKI 25 Jul]` supaya jejak revisi tetap terlihat |
| [`HARDWARE-AUDIT-REVIEW-V0.3.md`](HARDWARE-AUDIT-REVIEW-V0.3.md) | Poin 3 & Poin 10 ditandai **DIANULIR** oleh §1.1 (bukan dihapus — riwayat audit tetap utuh), matriks kesimpulan diberi kolom status terkini, banner diperluas menyebut `GPIO34` |

Prinsip yang dipakai: **dokumen historis tidak dihapus isinya**, tapi ditandai jelas mana yang masih
berlaku dan mana yang sudah dianulir — supaya siapa pun yang membuka dokumen lama tetap tahu ke mana
harus merujuk untuk kebenaran terkini.
