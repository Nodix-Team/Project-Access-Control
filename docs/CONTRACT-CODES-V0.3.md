# 📇 Kontrak Kode Status & Reason — v0.3

> [!IMPORTANT]
> **Status dokumen: DRAFT / USULAN** — belum disepakati final. Tabel ini disusun sebagai bahan diskusi
> antara @rizzalaulia dan @danskiv menyusul usulan Danas untuk memakai **kode angka** (bukan teks) pada
> payload MQTT. Perlu review & persetujuan bersama sebelum jadi kontrak resmi dan sebelum firmware/backend
> mulai mengimplementasikannya.

Dokumen ini adalah **satu-satunya sumber kebenaran** pemetaan kode `status` dan `reason` untuk v0.3.
Dirujuk oleh **firmware** (angka → kirim), **backend** (angka → kode simpan), dan **frontend** (kode → teks tampil).
Semangatnya melanjutkan konvensi kode pendek v0.2 (`UNKNOWN_CARD`, `NO_ACCESS`, dst) — bukan perombakan,
hanya menambah anggota baru + lapisan encoding angka di atasnya untuk menghemat payload/memory ESP32.

---

## Latar Belakang Keputusan

Di v0.2, `reason` dikirim sebagai kode string pendek (`OK`, `UNKNOWN_CARD`, ...). Draft awal v0.3 sempat
mengubahnya jadi kalimat Inggris (`Valid Access`, `Door Forced Open`) — ini menimbulkan 2 masalah:

1. Kalimat mengandung spasi/karakter bebas → berisiko merusak parsing CSV MQTT (sampai perlu aturan "reason
   tidak boleh mengandung koma").
2. Kalimat Inggris di-hardcode ke payload + DB → menyulitkan tampilan UI Bahasa Indonesia (dan multi-bahasa
   ke depan).

**Keputusan (usulan):** pakai **3 lapisan representasi** — angka di kabel, kode pendek di DB, teks lokal di layar.
Ini menyelesaikan kedua masalah di atas **sekaligus** menghemat ukuran payload (target memory ESP32, salah satu
isu v0.2).

```
   MQTT (di kabel)        DB (disimpan)              Frontend (ditampilkan)
        5          →       DOOR_FORCED_OPEN     →     "Pintu Dibuka Paksa"
    (angka,                (kode pendek,              (teks Indonesia,
     hemat byte)            stabil & netral bahasa)    bebas diganti bahasa)

     └── backend translate angka→kode ──┘   └── frontend translate kode→teks ──┘
```

- **Firmware** hanya tahu & mengirim **angka**.
- **Backend** menerjemahkan angka → **kode pendek**, lalu menyimpan **kode pendek** itu ke kolom DB (bukan angka, bukan kalimat).
- **Frontend** menerjemahkan **kode pendek** → **teks Bahasa Indonesia** saat menampilkan.

---

## Tabel STATUS

Dikirim sebagai field `<status>` pada payload log. Disimpan di kolom `access_logs.result`
(ENUM sudah diperbarui: `GRANTED`, `DENIED`, `ALARM`).

| Angka | Kode (DB) | Teks Indonesia | Keterangan |
|:---:|---|---|---|
| `0` | `UNKNOWN` | Tidak Dikenal | **Cadangan** — dipakai kalau backend menerima angka status yang belum terdaftar (mis. firmware lebih baru). Jangan crash, catat sebagai unknown. |
| `1` | `GRANTED` | Diizinkan | Akses atau permintaan keluar yang sah |
| `2` | `DENIED` | Ditolak | Akses ditolak |
| `3` | `ALARM` | Alarm | Kejadian sabotase / pelanggaran sensor pintu |

---

## Tabel REASON

Dikirim sebagai field `<reason>` pada payload log. Disimpan di kolom `access_logs.reason` (VARCHAR — isi
dengan **Kode**, bukan teks). Kolom "Status" menunjukkan pasangan status alami tiap reason.

| Angka | Kode (DB) | Status | Teks Indonesia | Kapan terjadi |
|:---:|---|:---:|---|---|
| `0` | `UNKNOWN` | — | Tidak Dikenal | **Cadangan** — angka reason belum terdaftar (firmware lebih baru). Jangan crash. |
| `1` | `VALID_ACCESS` | GRANTED | Akses Sah | Kartu valid di-tap, pintu dibuka sebelum `door_open_timeout_s` habis |
| `2` | `VALID_ACCESS_UNOPENED` | GRANTED | Akses Sah — Tak Dibuka | Kartu valid di-tap, tapi pintu tetap tertutup sampai timeout; relay dikunci lagi |
| `3` | `EXIT_VIA_REX` | GRANTED | Keluar via REX | Tombol REX ditekan, pintu dibuka sebelum timeout |
| `4` | `EXIT_REX_UNOPENED` | GRANTED | Keluar REX — Tak Dibuka | Tombol REX ditekan, tapi pintu tetap tertutup sampai timeout |
| `5` | `DOOR_FORCED_OPEN` | ALARM | Pintu Dibuka Paksa | Sensor mendeteksi pintu terbuka fisik tanpa tap kartu / REX yang sah |
| `6` | `DOOR_HELD_OPEN` | ALARM | Pintu Terlalu Lama Terbuka | Pintu sah dibuka tapi tak ditutup melewati `door_held_timeout_s` |
| `7` | `UNAUTHORIZED_DOOR` | DENIED | Tak Ada Akses ke Pintu Ini | Kartu terdaftar tapi tak punya hak akses ke pintu lokal itu |
| `8` | `UNKNOWN_CARD` | DENIED | Kartu Tak Terdaftar | Kartu tidak ada di memori internal controller |
| `9` | `INVALID_DOOR_NUMBER` | DENIED | Nomor Pintu Tidak Valid | Permintaan akses pintu di luar jangkauan lokal 1–4 |

---

## Format Payload Log di MQTT

Topik: `access/{device_id}/logs` (QoS 1).

```
<card_id>,<door_number>,<status>,<reason>,<timestamp_epoch>[,REPLAYED]
```

| Field | Isi |
|---|---|
| `<card_id>` | String numerik 10-digit (padding nol di depan). **Dikosongkan** untuk kejadian tanpa kartu (REX, alarm sensor) → payload diawali koma. |
| `<door_number>` | Nomor pintu lokal 1–4 |
| `<status>` | Angka status (lihat tabel STATUS) |
| `<reason>` | Angka reason (lihat tabel REASON) |
| `<timestamp_epoch>` | Unix epoch UTC (10 digit) dari RTC controller |
| `[,REPLAYED]` | Ditambahkan bila log diambil dari buffer offline |

### Contoh

| Kejadian | Payload | Terbaca sebagai |
|---|---|---|
| Kartu valid masuk pintu 1 | `0000123456,1,1,1,1784567890` | GRANTED · Akses Sah |
| Pintu 3 dibuka paksa (tanpa kartu) | `,3,3,5,1784567890` | ALARM · Pintu Dibuka Paksa |
| Keluar via REX pintu 2 | `,2,1,3,1784567890` | GRANTED · Keluar via REX |
| Kartu asing di pintu 4 | `0099887766,4,2,8,1784567890` | DENIED · Kartu Tak Terdaftar |
| Replay dari buffer offline | `0000123456,1,1,1,1784560000,REPLAYED` | GRANTED · Akses Sah (REPLAYED) |

---

## Aturan Pemeliharaan Kontrak (WAJIB dijaga)

1. **Angka `0` = "UNKNOWN" disisakan di kedua tabel.** Kalau firmware/backend/frontend menerima kode yang
   belum dikenal (mis. sisi lain sudah versi lebih baru), catat sebagai "Tidak Dikenal" — **jangan pernah
   crash / tolak pesan**. Ini yang membuat sistem tahan beda-versi antar-komponen.

2. **Append-only, jangan pernah menomori ulang.** Kode baru dapat angka berikutnya (`10`, `11`, ...). Dilarang
   menyisipkan di tengah atau mengubah arti angka yang sudah ada — itu merusak log historis dan membuat
   firmware/backend beda versi saling salah paham diam-diam.

3. **DB menyimpan kolom "Kode", bukan "Teks Indonesia" maupun angka mentah.** Alasan: kode pendek stabil &
   netral bahasa, kebaca langsung saat query DB, dan aman kalau terjemahan diubah (log lama tak ikut berubah).
   Angka murni optimasi transport di kabel — tidak perlu masuk DB.

4. **Tabel ini satu-satunya sumber kebenaran.** Firmware & backend WAJIB merujuk angka yang sama persis dari
   sini. Jangan ada tabel tandingan yang di-hardcode terpisah.

5. **Sadar ongkos debugging.** Payload angka (`1,1`) tak sejelas teks saat mengintip MQTT mentah. Mitigasi:
   backend menuliskan log yang meng-expand angka → teks, dan tabel ini ditaruh di tempat mudah dijangkau.

---

## Migrasi dari Log v0.2 (referensi bila memetakan data lama)

Kode v0.2 lama vs padanan v0.3-nya:

| Reason v0.2 lama | → | Kode v0.3 | Catatan |
|---|:---:|---|---|
| `OK` | → | `VALID_ACCESS` | v0.3 memecah lagi jadi opened/unopened; log lama tak punya info itu → petakan ke `VALID_ACCESS` |
| `NO_ACCESS` | → | `UNAUTHORIZED_DOOR` | |
| `UNKNOWN_CARD` | → | `UNKNOWN_CARD` | tak berubah |
| `INVALID_DOOR` | → | `INVALID_DOOR_NUMBER` | |

`VALID_REASONS` di `backend/app/mqtt/handlers.py` saat ini masih menerima **gabungan** kode lama v0.2 + kalimat
Inggris draft v0.3. Setelah kontrak ini disepakati, daftar itu perlu diselaraskan ke **kode** di tabel di atas
(bukan kalimat), dan handler diubah untuk menerjemahkan **angka → kode**.

---

## Catatan Terbuka (perlu diputuskan bersama)

- **`status` vs `reason` — apakah keduanya perlu dikirim terpisah?** Tiap reason sudah menyiratkan status-nya
  (mis. `DOOR_FORCED_OPEN` pasti `ALARM`). Bisa dipertimbangkan status diturunkan dari reason di backend agar
  hemat 1 field. Tetap mengirim keduanya lebih eksplisit/aman. Belum diputuskan.
- **Timezone timestamp** — `<timestamp_epoch>` bersifat UTC (sifat bawaan Unix epoch). Keputusan apakah DB
  menyimpan UTC (konversi ke GMT+7 hanya saat tampil) atau menyimpan GMT+7 langsung **masih dalam diskusi
  terpisah** — lihat catatan di [`ARCHITECTURE-PROPOSAL-V0.3.md`](ARCHITECTURE-PROPOSAL-V0.3.md) §4B. Yang wajib:
  jangan menyimpan campur UTC & lokal di DB yang sama.
