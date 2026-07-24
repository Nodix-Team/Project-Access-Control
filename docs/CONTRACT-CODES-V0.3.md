# 📇 Kontrak Kode Status & Reason — v0.3.1

> [!IMPORTANT]
> **Status Dokumen: FINAL / DISENTUJUI (APPROVED)** — Kontrak ini telah disetujui bersama oleh @danskiv dan @rizzalaulia pada 22 Juli 2026. Diupdate ke **v0.3.1** pada 24 Juli 2026 untuk menyertakan field `seq` dan tabel event non-akses. Tabel ini adalah **satu-satunya sumber kebenaran (Single Source of Truth)** untuk pemetaan kode status dan reason antara firmware ESP32-S3, backend FastAPI, dan frontend React.

---

## Latar Belakang Keputusan

Di v0.2, `reason` dikirim sebagai kode string pendek (`OK`, `UNKNOWN_CARD`, ...). Draft awal v0.3 sempat mengubahnya jadi kalimat Inggris (`Valid Access`, `Door Forced Open`) — ini menimbulkan 2 masalah:

1. Kalimat mengandung spasi/karakter bebas → berisiko merusak parsing CSV MQTT.
2. Hardcode teks kalimat Inggris di payload → menyulitkan penyesuaian bahasa UI di masa depan.

**Keputusan Final:** Memakai **3 Lapisan Representasi** — Angka di kabel MQTT, Kode Pendek Uppercase di Database, dan Teks Uppercase (Keminggris) di Frontend SPA.

```text
   MQTT (di kabel)        DB (disimpan)              Frontend (ditampilkan)
        3,5        →     DOOR_FORCED_OPEN     →     "DOOR FORCED OPEN"
    (Angka 1-byte,       (Kode pendek netral,        (Teks Uppercase Keminggris,
     super hemat RAM)     stabil & aman untuk SQL)    bebas disesuaikan UI)

     └── backend translate angka→kode ──┘   └── frontend translate kode→teks ──┘
```

- **Firmware ESP32-S3**: hanya tahu & mengirim **Angka Integer** (super hemat memori & cepat).
- **Backend FastAPI**: menerjemahkan **Angka → Kode Pendek**, lalu menyimpan **Kode Pendek** tersebut ke kolom `access_logs.reason` DB.
- **Frontend React**: menerjemahkan **Kode Pendek → Teks Uppercase** saat menampilkan log di dashboard.

---

## Tabel STATUS

Dikirim sebagai field `<status>` pada payload log. Disimpan di kolom `access_logs.result` (ENUM: `GRANTED`, `DENIED`, `ALARM`).

| Angka | Kode (DB) | Teks Tampilan (Frontend) | Keterangan |
|:---:|---|---|---|
| `0` | `UNKNOWN` | `UNKNOWN` | **Cadangan (Failsafe)** — dipakai jika backend menerima angka status yang belum terdaftar. Jangan crash. |
| `1` | `GRANTED` | `GRANTED` | Akses atau permintaan keluar yang sah |
| `2` | `DENIED` | `DENIED` | Akses ditolak |
| `3` | `ALARM` | `ALARM` | Kejadian sabotase / pelanggaran sensor pintu |

---

## Tabel REASON

Dikirim sebagai field `<reason>` pada payload log. Disimpan di kolom `access_logs.reason` (VARCHAR — diisi **Kode DB**, bukan angka mentah/teks UI).

| Angka | Kode (DB) | Status | Teks Tampilan (Frontend) | Kapan Terjadi |
|:---:|---|:---:|---|---|
| `0` | `UNKNOWN` | — | `UNKNOWN` | **Cadangan (Failsafe)** — angka reason belum terdaftar. |
| `1` | `VALID_ACCESS` | GRANTED | `VALID ACCESS` | Kartu valid di-tap, pintu dibuka sebelum `door_open_timeout_s` habis |
| `2` | `VALID_ACCESS_UNOPENED` | GRANTED | `VALID ACCESS UNOPENED` | Kartu valid di-tap, tapi pintu tetap tertutup sampai timeout; relay dikunci lagi |
| `3` | `VALID_EXIT` | GRANTED | `VALID EXIT` | Tombol REX ditekan, pintu dibuka sebelum timeout |
| `4` | `VALID_EXIT_UNOPENED` | GRANTED | `VALID EXIT UNOPENED` | Tombol REX ditekan, tapi pintu tetap tertutup sampai timeout |
| `5` | `DOOR_FORCED_OPEN` | ALARM | `DOOR FORCED OPEN` | Sensor mendeteksi pintu terbuka fisik tanpa tap kartu / REX yang sah |
| `6` | `DOOR_HELD_OPEN` | ALARM | `DOOR HELD OPEN` | Pintu sah dibuka tapi tak ditutup melewati `door_held_timeout_s` |
| `7` | `UNAUTHORIZED_DOOR` | DENIED | `UNAUTHORIZED DOOR` | Kartu terdaftar tapi tak punya hak akses ke pintu lokal itu |
| `8` | `UNKNOWN_CARD` | DENIED | `UNKNOWN CARD` | Kartu tidak ada di memori internal controller |
| `9` | `INVALID_DOOR_NUMBER` | DENIED | `INVALID DOOR NUMBER` | Permintaan akses pintu di luar jangkauan lokal 1–4 |

---

## Format Payload Log di MQTT

Topik: `access/{device_id}/logs` (QoS 1).

```text
<seq>,<card_id>,<door_number>,<status>,<reason>,<timestamp_epoch>[,REPLAYED]
```

| Field | Isi |
|---|---|
| `<seq>` | Nomor urut 32-bit (unsigned) per controller untuk dedup log 100% |
| `<card_id>` | String numerik 10-digit (padding nol di depan). **Dikosongkan** untuk kejadian tanpa kartu (REX, alarm sensor) → payload diawali koma. |
| `<door_number>` | Nomor pintu lokal 1–4 |
| `<status>` | Angka status (1 = GRANTED, 2 = DENIED, 3 = ALARM) |
| `<reason>` | Angka reason (1–9, lihat tabel REASON) |
| `<timestamp_epoch>` | Unix epoch UTC (10 digit) dari RTC controller |
| `[,REPLAYED]` | Ditambahkan bila log diambil dari buffer offline |

### Contoh Payload Real & Terbaca

| Kejadian | Payload | Terbaca di DB | Terbaca di UI Frontend |
|---|---|---|---|
| Kartu valid masuk pintu 1 | `1024,0000123456,1,1,1,1784567890` | `GRANTED` · `VALID_ACCESS` | `GRANTED` · `VALID ACCESS` |
| Pintu 3 dibuka paksa (tanpa kartu) | `1025,,3,3,5,1784567890` | `ALARM` · `DOOR_FORCED_OPEN` | `ALARM` · `DOOR FORCED OPEN` |
| Keluar via REX pintu 2 | `1026,,2,1,3,1784567890` | `GRANTED` · `VALID_EXIT` | `GRANTED` · `VALID EXIT` |
| Kartu asing di pintu 4 | `1027,0099887766,4,2,8,1784567890` | `DENIED` · `UNKNOWN_CARD` | `DENIED` · `UNKNOWN CARD` |
| Replay dari buffer offline | `1023,0000123456,1,1,1,1784560000,REPLAYED` | `GRANTED` · `VALID_ACCESS` | `GRANTED` · `VALID ACCESS (REPLAYED)` |

---

## Tabel EVENTS (Non-Akses)

Dikirim melalui topik `access/{device_id}/events`. Format Payload:
`<seq>,<event_code>,<timestamp_epoch>[,REPLAYED]`

| Angka | Kode (DB) | Status Alarm | Teks Tampilan (Frontend) | Kapan Terjadi |
|:---:|---|:---:|---|---|
| `0` | `UNKNOWN` | — | `UNKNOWN` | Cadangan (Failsafe) |
| `1` | `TAMPER_OPEN` | AKTIF | `TAMPER OPEN` | Tamper switch terbuka |
| `2` | `TAMPER_CLOSED` | CLEAR | `TAMPER CLOSED` | Tamper switch ditutup kembali |
| `3` | `FIRE_ACTIVE` | AKTIF | `FIRE ALARM ACTIVE` | Sinyal fire alarm aktif (fail-safe trigger) |
| `4` | `FIRE_CLEARED` | CLEAR | `FIRE ALARM CLEARED` | Sinyal fire alarm dinonaktifkan |
| `5` | `POWER_LOW` | AKTIF | `POWER LOW (BATTERY)` | Tegangan baterai turun di bawah 11.5V (ADC GPIO2) |
| `6` | `POWER_NORMAL` | CLEAR | `POWER NORMAL` | Tegangan daya kembali normal di atas 11.5V |
| `7` | `MAINS_LOST` | AKTIF | `MAINS LOST (AC FAIL)` | PLN padam (Digital Input GPIO1 dari PSU Pintar/Relay AC) |
| `8` | `MAINS_OK` | CLEAR | `MAINS OK (AC NORMAL)` | PLN kembali menyala (Digital Input GPIO1) |
| `9` | `AUX_ACTIVE` | AKTIF | `AUXILIARY ACTIVE` | Input Aux terbuka |
| `10` | `AUX_CLEARED` | CLEAR | `AUXILIARY CLEARED` | Input Aux tertutup kembali |

---

## Aturan Pemeliharaan Kontrak (WAJIB Dijaga)

1. **Angka `0` = "UNKNOWN" disisakan di kedua tabel.** Jika firmware/backend/frontend menerima kode yang belum dikenal, catat sebagai `UNKNOWN` — **jangan pernah crash / menolak pesan**.
2. **Append-Only, Dilarang Menomori Ulang.** Kode baru dapat angka berikutnya (`10`, `11`, ...). Dilarang mengubah arti angka lama.
3. **DB menyimpan kolom "Kode", bukan Teks UI maupun Angka Mentah.** Kode pendek stabil & netral bahasa.
4. **Tabel ini satu-satunya sumber kebenaran.** Firmware & backend WAJIB merujuk angka yang sama dari sini.

---

## Keputusan Catatan Terbuka

1. **Pengiriman Dua Field (`status` dan `reason`)**: **TETAP DIKIRIM KEDUANYA** pada payload MQTT untuk memberikan *redundancy validation* dan proses parsing instan di backend tanpa lookup tambahan.
2. **Timezone Timestamp**: `<timestamp_epoch>` di kabel bersifat UTC murni. Backend menyimpan dan menampilkan waktu secara **dinamis mengikuti zona waktu lokal Server & Browser User** (tidak di-hardcode kaku ke GMT+7).

---

## Format Payload Command (Server → Controller)

### 1. Fire Override (Buka Paksa Kebakaran)
Topik: `access/{device_id}/fire/override` (QoS 1, Retained)
Payload CSV: `<d1_override>,<d2_override>,<d3_override>,<d4_override>`

| Nilai | Arti |
|---|---|
| `1` | Override AKTIF (buka kunci paksa) |
| `0` | Mode NORMAL (kembali normal, ikuti RFID/REX) |

Contoh Payload: `1,1,0,0` (Membuka paksa Pintu 1 & 2, Pintu 3 & 4 terkunci normal).
