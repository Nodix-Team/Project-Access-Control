# Review Arsitektur — Proposal v0.2

**Reviewer**: AI assistant
**Dokumen yang direview**: `architecture_proposal.md` (Proposal v0.2 Revisi)
**Tanggal**: 2026-07-14

---

## Ringkasan Eksekutif

Arah arsitekturnya benar. Pemisahan Controller → Broker → Backend → DB sudah tepat,
normalisasi 5 tabel masuk akal, dan keputusan **tidak mengirim `nama` ke Controller**
adalah perbaikan desain yang bagus (Controller memang tidak butuh PII untuk mengambil
keputusan akses).

Namun ada **1 bug desain blocking**, **4 lubang keamanan**, dan **beberapa celah
keandalan** yang harus ditutup sebelum implementasi. Yang paling mendesak adalah
konflik penomoran pintu — bug ini tidak akan terlihat saat menguji satu controller,
dan baru muncul saat controller kedua dipasang.

| Prioritas | Jumlah | Ringkas |
|-----------|--------|---------|
| **P0 — Blocking** | 3 | Penomoran pintu, keamanan MQTT, sync tidak lengkap |
| **P1 — Penting** | 6 | Timestamp/NTP, bricking config, audit log, deteksi offline, upsert, auth API |
| **P2 — Sebaiknya** | 5 | Indeks DB, log buffer offline, UX CSV, versioning payload, scope |

---

# P0 — BLOCKING

## P0-1. Konflik penomoran pintu: `door_id` (global) vs `door_number` (lokal)

**Ini bug, bukan preferensi.** Proposal memakai dua sistem penomoran pintu yang
berbeda, lalu tertukar di alur publish.

Dari dokumen:

- Tabel `doors`: `door_number` = nomor pintu **lokal di controller** (1–4)
- Tabel `doors`: `id` = **ID global database** (1, 2, 3, ... 10)
- Diagram atas: "Controller B — Pintu 5, 6, 7, 8" → penomoran **global**
- Tabel `doors`: door_id 6 = controller 2, door_number **2**

Sekarang lihat alur di baris 137–143:

```
Publish MQTT ke ctrl-B:
  topic: access/ctrl-B/users/add
  payload: "AABBCCDD,6"              ← hanya pintu milik ctrl-B
```

Yang dikirim adalah **`door_id` = 6** (ID database). Tapi Controller B hanya mengenal
pintu **1–4** secara lokal. Pintu yang dimaksud sebenarnya adalah **`door_number` = 2**.

**Akibatnya**: Controller B menerima `6`, memfilternya ke rentang 1–`total_doors`,
lalu **membuangnya**. John Doe tidak akan pernah bisa masuk Lab Komputer, dan tidak
ada error di mana pun.

**Yang membuat bug ini berbahaya**: di baris 139, publish ke ctrl-A memakai
`door_id = 1`, yang **kebetulan sama** dengan `door_number = 1`. Jadi controller
pertama akan tampak bekerja sempurna. Bug baru muncul di controller kedua — kemungkinan
berminggu-minggu setelah Anda yakin sistemnya sudah benar.

**Perbaikan** — Backend **wajib** menerjemahkan `door_id` → `door_number` sebelum publish:

```sql
SELECT c.device_id, d.door_number
FROM user_access ua
JOIN doors d       ON d.id = ua.door_id
JOIN controllers c ON c.id = d.controller_id
WHERE ua.user_id = :uid;
```

```python
# Kelompokkan per controller, kirim door_number (BUKAN door_id)
by_ctrl = defaultdict(list)
for device_id, door_number in rows:
    by_ctrl[device_id].append(door_number)

for device_id, numbers in by_ctrl.items():
    payload = f"{kartu},{'|'.join(map(str, sorted(numbers)))}"
    mqtt.publish(f"access/{device_id}/users/add", payload, qos=1)
    # ctrl-A -> "AABBCCDD,1"
    # ctrl-B -> "AABBCCDD,2"   <-- BUKAN "6"
```

**Tambahan**: perbaiki juga diagram di bagian atas. Menulis "Controller B — Pintu 5, 6, 7, 8"
menanamkan model mental global yang justru **penyebab akar** bug ini. Tulis
"Controller B — Pintu 1–4 (Lobby B, Lab Komputer, ...)".

**Aturan yang harus dipegang**:
> `door_id` tidak pernah keluar dari Backend. Controller hanya bicara `door_number`.

Ini juga berlaku untuk upload CSV (baris 344) — jangan minta admin mengetik `door_id`.

---

## P0-2. Keamanan MQTT: Section 2 kosong

Proposal menulis **"2. EMQX Broker (Tetap, Tidak Berubah)"** lalu tidak ada isinya.
Tapi "tidak berubah" berarti **tetap tanpa autentikasi** — dan itu tidak bisa
dipertahankan di v0.2, karena sekarang sistemnya memegang:

1. **Password WiFi dalam plaintext** (`wifi_pass: "Danas123"` — lihat baris 180)
2. **Kontrol akses pintu fisik**

Tanpa auth, siapa pun yang bisa menjangkau broker dapat:

```bash
# Memberi diri sendiri akses ke SEMUA pintu
mosquitto_pub -h broker -t access/ctrl-A/users/add -m "DEADBEEF,1|2|3|4"

# Membaca password WiFi kantor
mosquitto_sub -h broker -t 'access/+/config/response'

# Mem-brick semua controller
mosquitto_pub -h broker -t access/ctrl-A/config/set -m "mqtt_broker,1.2.3.4"
```

Ini bukan hipotetis — ini tiga baris perintah.

**Yang minimal harus ada di v0.2:**

| Kontrol | Keterangan |
|---------|------------|
| **Username/password MQTT** | Per-controller, bukan satu kredensial bersama |
| **ACL per topic** | Controller X **hanya** boleh sub `access/X/#` dan pub `access/X/logs`, `access/X/status` |
| **TLS (port 8883)** | Wajib jika trafik keluar dari LAN. ESP32 mampu (`WiFiClientSecure`), biayanya ~40 KB heap |
| **Backend punya kredensial terpisah** | Hanya Backend yang boleh publish ke `access/+/users/#` dan `access/+/config/#` |

ACL EMQX-nya kira-kira:

```
# Controller hanya menyentuh topic miliknya sendiri
{allow, {user, "ctrl-A"}, subscribe, ["access/ctrl-A/#"]}.
{allow, {user, "ctrl-A"}, publish,   ["access/ctrl-A/logs", "access/ctrl-A/status"]}.
{deny,  {user, "ctrl-A"}, publish,   ["access/+/users/#", "access/+/config/#"]}.

# Backend
{allow, {user, "backend"}, publish,   ["access/+/users/#", "access/+/config/#"]}.
{allow, {user, "backend"}, subscribe, ["access/+/logs", "access/+/status", "access/+/config/response"]}.

{deny, all}.
```

**Terpisah dari itu**: jangan pernah kirim `wifi_pass` di `config/response`. Controller
boleh melapor SSID, tidak boleh melapor password. Password hanya mengalir satu arah
(Backend → Controller), tidak pernah kembali.

---

## P0-3. Protokol sync tidak lengkap dan tidak aman

Proposal mendefinisikan `sync/start` dan `sync/end`, tapi **tidak mendefinisikan
bagaimana data user dikirim di antaranya**. Diasumsikan berupa rentetan `users/add`,
tapi itu tidak tertulis.

Lebih penting lagi, protokolnya punya empat lubang:

| Lubang | Akibat |
|--------|--------|
| **Tidak ada hitungan/checksum** | Kalau 3 dari 80 pesan hilang, Controller tidak tahu. Ia yakin sync sukses padahal daftar user kurang. |
| **QoS tidak disebut** | Kalau QoS 0, kehilangan pesan **normal** dan tak terdeteksi. |
| **Tidak ada acknowledgement** | Backend tidak pernah tahu sync berhasil. |
| **Tidak atomik** | Kalau Controller menghapus daftar lama saat `sync/start`, ada jendela waktu di mana **tidak ada yang bisa masuk pintu mana pun**. Kalau koneksi putus di tengah sync, Controller kosong permanen sampai sync berikutnya. |

Ini pengulangan persis dari kegagalan-sunyi `MQTT_BUFFER_SIZE` di v0.1 — Controller
dan database diam-diam berbeda, tanpa error.

**Protokol yang disarankan:**

```
Server → access/{id}/users/sync/start   payload: "{sync_id}"
Server → access/{id}/users/add          payload: "AABBCCDD,1|3"     (QoS 1, N kali)
Server → access/{id}/users/sync/end     payload: "{sync_id},{count}"
Controller → access/{id}/sync/result    payload: "{sync_id},OK,{count}"
                                             atau "{sync_id},MISMATCH,{diterima}"
```

Aturan di Controller:

1. `sync/start` → buat daftar **baru** di RAM (**jangan** hapus yang lama)
2. `users/add` selama sync → masuk ke daftar baru
3. `sync/end` → **bandingkan count**.
   - Cocok → tulis ke LittleFS, **swap atomik** daftar lama ke baru, balas `OK`
   - Tidak cocok → **buang daftar baru, pertahankan yang lama**, balas `MISMATCH`
4. Backend menerima `MISMATCH` → ulangi sync

Dengan pola staging ini, sync yang gagal **tidak pernah** meninggalkan pintu dalam
keadaan tak bisa diakses. Pintu tetap memakai daftar lama yang valid.

**QoS 1 wajib** untuk semua topik `users/#` dan `config/#`.

---

# P1 — PENTING

## P1-1. Timestamp: dari mana Controller tahu waktu?

Log CSV: `AABBCCDD,2,GRANTED,1720000000` — itu Unix epoch. Tapi v0.1 memakai `millis()`
(uptime), dan proposal tidak menyebut RTC maupun NTP di mana pun.

Pertanyaan yang harus dijawab:

- **NTP?** Perlu koneksi internet. Kalau broker lokal tapi tidak ada internet, NTP gagal.
- **Sebelum NTP sinkron** (beberapa detik pertama setelah boot), timestamp = 1970. Log akan ngawur.
- **Saat WiFi mati**, jam tetap jalan? ESP32 tanpa RTC baterai akan kehilangan waktu setiap reboot.

**Rekomendasi**: **Backend yang menentukan timestamp**, bukan Controller.

Kirim `timestamp_ms_uptime` dari Controller (seperti v0.1), lalu Backend mencatat
`received_at = NOW()` sebagai waktu resmi. Latensi MQTT di LAN < 50 ms — tidak
signifikan untuk access control.

Simpan **keduanya** di DB: `server_timestamp` (otoritatif, untuk audit) dan
`device_uptime_ms` (untuk diagnosa). Kalau nanti ada RTC/NTP, tambahkan
`device_timestamp` tanpa mengubah apa pun.

Ini juga menghilangkan seluruh kelas bug timezone. Simpan **UTC** di MySQL, konversi
di frontend.

---

## P1-2. Push config WiFi/broker = vektor bricking

Proposal sudah memberi WARNING, tapi meremehkan konsekuensinya. Kalau admin salah
ketik `wifi_ssid`, Controller reboot, gagal connect, dan **tidak bisa dijangkau lagi
lewat jalur apa pun**. Satu-satunya pemulihan: cabut unit dari dinding, colok USB,
flash ulang. Untuk 10 pintu di 3 gedung, itu mahal.

**Perbaikan wajib — config rollback:**

```
1. Controller terima config/set (wifi/broker)
2. Simpan config LAMA sebagai config_last_known_good.json
3. Terapkan config baru, tandai "pending"
4. Reboot
5. Kalau berhasil connect MQTT dalam 60 detik:
      → tandai config baru sebagai "confirmed", hapus pending
   Kalau GAGAL:
      → restore config_last_known_good.json, reboot lagi
```

Dengan ini, config salah = downtime 2 menit, bukan panggilan teknisi.

**Tambahan**: pisahkan config yang aman dari yang berbahaya.

| Aman (langsung terapkan) | Berbahaya (butuh rollback + konfirmasi 2 langkah) |
|--------------------------|---------------------------------------------------|
| `heartbeat_s` | `wifi_ssid`, `wifi_pass` |
| `total_doors` | `mqtt_broker`, `mqtt_port` |

Di UI, config berbahaya harus punya konfirmasi eksplisit ("ketik nama controller untuk
mengonfirmasi") — pola yang sama dengan menghapus repo di GitHub.

---

## P1-3. Audit log rusak saat kartu dipindahtangankan

`access_logs` hanya menyimpan `kartu` (VARCHAR), tanpa `user_id`. Nama user diambil
dengan JOIN ke `users` **saat menampilkan**.

Masalahnya: kartu `AABBCCDD` milik John, dipakai 6 bulan, lalu John resign. Kartunya
di-assign ulang ke Sarah. Sekarang **seluruh riwayat John selama 6 bulan berubah
menjadi Sarah** — retroaktif, di semua laporan.

Untuk sistem access control, ini kegagalan audit yang serius. Log akses adalah
bukti forensik; ia harus **immutable**.

**Perbaikan** — snapshot identitas saat log dibuat:

```sql
CREATE TABLE access_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,   -- BIGINT, bukan INT
    kartu           VARCHAR(20) NOT NULL,
    user_id         INT NULL,                            -- FK, boleh NULL (kartu tak dikenal)
    user_nama       VARCHAR(100) NULL,                   -- SNAPSHOT saat kejadian
    door_id         INT NULL,
    door_nama       VARCHAR(100) NULL,                   -- SNAPSHOT
    controller_id   INT NULL,
    result          ENUM('GRANTED','DENIED') NOT NULL,
    reason          VARCHAR(50) NULL,                    -- 'UNKNOWN_CARD', 'NO_ACCESS', 'OK'
    server_ts       DATETIME(3) NOT NULL,                -- otoritatif (UTC)
    device_uptime_ms BIGINT NULL,                        -- diagnosa
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL,
    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE SET NULL,
    INDEX idx_ts (server_ts),
    INDEX idx_kartu_ts (kartu, server_ts),
    INDEX idx_ctrl_ts (controller_id, server_ts)
);
```

Denormalisasi `user_nama`/`door_nama` di sini **disengaja dan benar** — log adalah
catatan historis, bukan data live.

Kolom `reason` mempertahankan invariant v0.1 (kartu tak dikenal tetap tercatat).
Controller kirim: `AABBCCDD,2,DENIED,UNKNOWN_CARD`.

---

## P1-4. `is_online` akan basi — pakai LWT

`controllers.is_online BOOLEAN` adalah **derived state** yang disimpan. Kalau Backend
crash atau controller mati mendadak, kolom ini akan selamanya menunjukkan `TRUE`.

Dua perbaikan, keduanya murah:

**1. MQTT Last Will & Testament** — mekanisme bawaan MQTT untuk ini, dan proposal
tidak menyebutnya sama sekali. Controller mendaftarkan LWT saat connect:

```cpp
mqttClient.connect(deviceId, user, pass,
                   "access/ctrl-A/status/lwt",  // will topic
                   1,                            // will QoS
                   true,                         // will retain
                   "offline");                   // will payload
// Setelah connect sukses:
mqttClient.publish("access/ctrl-A/status/lwt", "online", true);
```

Broker otomatis mem-publish `offline` kalau controller hilang — tanpa polling.

**2. Jangan simpan `is_online`, hitung:**

```sql
SELECT device_id,
       (last_seen > NOW() - INTERVAL (heartbeat_s * 3) SECOND) AS is_online
FROM controllers;
```

Toleransi 3× heartbeat mencegah false alarm karena satu heartbeat telat.

---

## P1-5. Tidak ada `users/update` — apakah `add` itu upsert?

v0.1 punya `users/add`, `users/update`, `users/delete`. Proposal v0.2 **menghapus
`update`** tanpa penjelasan.

Kalau admin mengubah akses John dari pintu [1,3] menjadi [1] saja, apa yang dikirim?

- `users/add` dengan `AABBCCDD,1`? → Controller harus tahu ini **replace**, bukan tambah
- Atau `delete` lalu `add`? → ada jendela waktu di mana John tidak bisa masuk **pintu mana pun**

**Harus dinyatakan eksplisit di kontrak.** Rekomendasi: `users/add` adalah **upsert**
(replace penuh berdasarkan `kartu`), dan namanya diganti jadi `users/set` supaya
tidak menyesatkan. Hilangkan jendela waktu, dan hilangkan ambiguitas.

Dokumentasikan di tabel topic:

| Topic | Semantik |
|-------|----------|
| `access/{id}/users/set` | **Upsert**. Ganti total hak akses kartu ini. Kartu belum ada → buat. |
| `access/{id}/users/delete` | Hapus kartu ini. Idempoten (hapus yang tak ada = sukses). |

---

## P1-6. Backend & Frontend tidak punya autentikasi

Tidak ada satu pun penyebutan login, session, role, atau token di seluruh proposal.
REST API `/api/users`, `/api/controllers/{id}/config`, dan `WS /ws/live-feed` semuanya
terbuka.

Untuk aplikasi yang mengendalikan pintu fisik, ini harus ada di v0.2, bukan ditunda:

- **Login** + JWT/session
- **Role minimal**: `admin` (CRUD user + config controller) vs `viewer` (lihat log saja)
- **WebSocket juga diautentikasi** — token saat handshake, bukan hanya REST
- **Audit trail admin**: siapa menambah/menghapus user siapa, kapan. Tabel `admin_logs`.

Yang terakhir sering dilupakan, tapi untuk access control justru krusial: Anda perlu
tahu siapa yang memberi akses ruang server ke seseorang, bukan hanya bahwa aksesnya ada.

---

# P2 — SEBAIKNYA

## P2-1. Log hilang saat Controller offline

Kalau MQTT putus, Controller tetap bisa memutuskan akses (data ada di LittleFS — bagus),
tapi log-nya **menguap**. Untuk audit, itu lubang.

Buffer log ke LittleFS saat offline (ring buffer, misal 500 entri), replay saat
reconnect. Tandai `replayed=true` di DB supaya bisa dibedakan.

## P2-2. Payload CSV tanpa versi

CSV memang lebih hemat (`AABBCCDD,1|3` = 12 byte vs ~60 byte JSON), dan menghindari
fragmentasi heap ArduinoJson. Keputusan yang wajar.

Tapi CSV tidak self-describing. Kalau nanti Anda menambah field (misal masa berlaku
kartu), Controller lama akan salah parse tanpa sadar.

Murah untuk dicegah — taruh versi di field pertama:

```
v1,AABBCCDD,1|3
```

Controller menolak versi yang tidak dikenal, dan melaporkannya. Satu byte sekarang,
menghemat migrasi yang menyakitkan nanti.

Catatan: alasan utama pindah ke CSV adalah ukuran payload. Tapi dengan sync streaming
per-user (P0-3), batas 4096 byte **tidak lagi relevan** — tidak ada lagi payload besar.
Manfaat CSV yang tersisa adalah hemat flash & heap di ESP32, yang tetap valid. Cuma
perlu disadari bahwa justifikasi aslinya sudah berubah.

## P2-3. Upload CSV memakai `door_id` — buruk untuk admin

Baris 344: "Kolom `doors` berisi ID pintu dari database". Admin harus tahu bahwa
"Lab Komputer" adalah `6`. Itu detail internal yang bocor ke user.

Pakai nama pintu:
```csv
kartu,nama,doors
AABBCCDD,John Doe,Lobby Utama|Lab Komputer
```
Backend yang me-resolve nama → `door_id` → `door_number`. Kalau nama tidak ketemu,
tolak baris itu dengan pesan jelas.

## P2-4. Indeks dan tipe data

- `access_logs.id` → `BIGINT` (INT habis di ~2 miliar; 10 pintu × 100 tap/hari = aman lama, tapi murah untuk diamankan)
- Indeks pada `server_ts`, `(kartu, server_ts)`, `(controller_id, server_ts)` — lihat P1-3
- Rencanakan **retensi/partisi** log sejak awal (misal partisi per bulan). Menambahkannya setelah tabel besar itu menyakitkan.
- `users.kartu VARCHAR(20)` — pastikan collation **case-insensitive** (`utf8mb4_general_ci`) supaya konsisten dengan invariant v0.1 (`findByKartu` case-insensitive). Kalau collation-nya `_bin`, DB dan Controller akan berbeda pendapat soal `aabbccdd` vs `AABBCCDD`.

## P2-5. Scope: ini menggabungkan v0.2, v0.3, dan v0.4 sekaligus

Roadmap di instruction set: v0.2 = hardware RFID + relay, v0.3 = REST API, v0.4 = dashboard.

Proposal ini mengerjakan ketiganya **plus** multi-controller, config push, dan MySQL —
dalam satu lompatan. Itu risiko besar: kalau ada yang tidak jalan, Anda tidak akan tahu
lapisan mana yang salah.

Saran pentahapan:

| Versi | Isi | Kriteria selesai |
|-------|-----|------------------|
| **v0.2** | Hardware RFID + relay, **satu** controller, kontrak MQTT lama | Kartu fisik membuka pintu fisik |
| **v0.3** | Backend FastAPI + MySQL + log collector. Masih satu controller. | Log tersimpan permanen, user dikelola via REST |
| **v0.4** | Multi-controller + auth MQTT + protokol sync baru | Dua controller jalan bersamaan tanpa saling ganggu |
| **v0.5** | Frontend React + WebSocket + config push | Admin bisa kerja tanpa terminal |

Setiap tahap bisa diuji terpisah. Multi-controller (yang mengandung bug P0-1) tidak
akan tercampur dengan debugging hardware RFID.

---

# Yang Sudah Bagus

Supaya seimbang — ini keputusan yang tepat dan sebaiknya dipertahankan:

- **`nama` tidak dikirim ke Controller.** Benar. Controller tidak butuh PII untuk memutuskan akses, dan ini mengurangi permukaan kebocoran data kalau unit dicuri dari dinding.
- **Hapus user pakai `kartu`, bukan `uid`.** Benar. `uid` adalah artefak database; Controller memang mencocokkan berdasarkan kartu.
- **`{device_id}` di dalam topic.** Benar, dan ini yang memungkinkan ACL per-controller di P0-2. Tanpa ini, isolasi keamanan antar controller tidak mungkin.
- **Normalisasi `user_access` sebagai tabel relasi.** Benar — many-to-many memang butuh ini, dan ini yang memungkinkan satu user punya akses lintas-controller.
- **Backend yang memetakan pintu → controller.** Benar, dan admin memang tidak perlu tahu topologi hardware.

---

# Checklist Sebelum Implementasi

- [ ] **P0-1** Backend menerjemahkan `door_id` → `door_number` sebelum publish. Diagram diperbaiki.
- [ ] **P0-2** Auth MQTT + ACL per-controller. `wifi_pass` tidak pernah dikirim balik.
- [ ] **P0-3** Protokol sync dengan count + staging atomik + QoS 1.
- [ ] **P1-1** Timestamp otoritatif dari Backend, bukan Controller.
- [ ] **P1-2** Config rollback (last-known-good) untuk wifi/broker.
- [ ] **P1-3** `access_logs` menyimpan snapshot `user_nama`/`door_nama` + `reason`.
- [ ] **P1-4** LWT + `is_online` dihitung dari `last_seen`, bukan disimpan.
- [ ] **P1-5** `users/add` → `users/set`, semantik upsert dinyatakan eksplisit.
- [ ] **P1-6** Auth REST + WebSocket, role admin/viewer, tabel `admin_logs`.
- [ ] **P2** Buffer log offline, versi payload CSV, CSV pakai nama pintu, indeks DB, pentahapan versi.

---

# Catatan Proses

Sesuai instruction set §8: proposal ini mengubah kontrak MQTT, format penyimpanan user,
dan skema data secara **breaking**. Saat diimplementasikan, wajib:

- Naikkan versi di **tiga tempat**: banner tiap file, `SerialSim::_printBanner()`, pesan boot `main.cpp`
- Update `README.md` (kontrak MQTT berubah total)
- Tambahkan entri `CHANGELOG.md` dengan bagian **BREAKING CHANGES** yang eksplisit
- Dokumentasikan jalur migrasi dari `users.json` (JSON, uid-based) ke format CSV baru
