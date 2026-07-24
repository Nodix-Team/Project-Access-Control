# PRD — Access Control Engine v0.2

**Produk**: Sistem Akses Kontrol Multi-Controller
**Cakupan dokumen**: Backend (FastAPI) + Database (MySQL) + Frontend (React+Vite)
**Di luar cakupan**: Firmware ESP32 (dikerjakan orang kedua, kontraknya di `01_KEPUTUSAN_ARSITEKTUR_v0.2.md`)
**Tanggal**: 2026-07-14

---

## 1. Masalah & Tujuan

Sistem v0.1 hanya bisa dikelola lewat Serial Monitor dan MQTT Explorer, dengan satu ESP32, dan datanya hanya hidup di flash ESP32. Tidak ada riwayat akses permanen, tidak ada UI, tidak bisa nambah gedung.

**Tujuan v0.2:**

| # | Tujuan | Ukuran keberhasilan |
|---|--------|---------------------|
| G1 | Admin non-teknis bisa mengelola user tanpa terminal | Tambah user + kasih akses pintu selesai < 60 detik, tanpa buka MQTT Explorer |
| G2 | Riwayat akses permanen & tahan audit | Log tetap benar walaupun kartu dipindahtangankan |
| G3 | Sistem bisa tumbuh ke banyak gedung | Tambah controller ke-2 tanpa ubah kode |
| G4 | Hak akses dikelola per-department, bukan per-orang | Ubah akses 1 department → 25 user ikut berubah, 1 aksi |
| G5 | Kegagalan sync tidak pernah mengunci pintu | Sync gagal ⇒ controller pakai daftar lama |

**Non-goals v0.2**: TLS, mobile app, anti-passback, jadwal akses berbasis waktu, integrasi HRIS.

---

## 2. Persona

| Persona | Kebutuhan | Frekuensi |
|---------|-----------|-----------|
| **Admin Fasilitas** | Tambah/hapus karyawan, atur pintu mana boleh dimasuki siapa | Harian |
| **Petugas Security** | Lihat siapa masuk pintu mana, kapan. Tidak boleh mengubah apa pun | Harian (read-only) |
| **Teknisi/IT** | Daftarkan controller baru, pantau online/offline, push config | Sesekali |

---

## 3. Model Domain (inti yang harus dipahami sebelum ngoding)

### 3.1 Dua sistem penomoran pintu — SUMBER BUG P0-1

```
doors.id           = 6    ← ID GLOBAL database. TIDAK PERNAH keluar dari Backend.
doors.door_number  = 2    ← nomor LOKAL di controller (1..total_doors). INI yang dikirim MQTT.
doors.controller_id = 2   ← milik ctrl-B
```

Aturan tunggal yang harus dihafal:
> **Controller tidak tahu apa itu `door_id`. Controller hanya bicara `door_number`.**

Setiap kali Backend mau publish, wajib lewat fungsi ini — jangan ada jalur lain:

```python
def resolve_doors_for_publish(user_id) -> dict[str, list[int]]:
    """Return {device_id: [door_number, ...]} — TIDAK PERNAH door_id."""
    rows = db.execute("""
        SELECT c.device_id, d.door_number
        FROM effective_access ea
        JOIN doors d       ON d.id = ea.door_id
        JOIN controllers c ON c.id = d.controller_id
        WHERE ea.user_id = :uid
    """, uid=user_id)
    by_ctrl = defaultdict(list)
    for device_id, door_number in rows:
        by_ctrl[device_id].append(door_number)
    return by_ctrl
```

### 3.2 Hak akses berlapis

```
is_custom_access = TRUE  → pakai tabel user_access (override, dept diabaikan)
is_custom_access = FALSE → pakai tabel department_access dari department_id
                           department_id NULL → TIDAK BISA AKSES APA PUN
```

Konsekuensi yang harus ada di UI: mengubah `department_access` **otomatis** mempengaruhi semua user di dept itu yang `is_custom_access = FALSE`, dan **tidak** mempengaruhi yang TRUE.

### 3.3 Waktu

Controller tidak punya jam. **Backend adalah sumber waktu.**
`server_ts = NOW()` saat log diterima. `device_uptime_ms` disimpan hanya untuk diagnosa.
Semua waktu di DB **UTC**. Konversi timezone hanya di frontend.

---

## 4. Requirement Fungsional

### FR-1 — User Management
| ID | Requirement | Prioritas |
|----|-------------|-----------|
| FR-1.1 | CRUD user (kartu, nama, department) | P0 |
| FR-1.2 | Kartu unik, **case-insensitive** (`AABBCCDD` == `aabbccdd`) | P0 |
| FR-1.3 | Toggle sumber akses: Ikut Department ↔ Custom | P0 |
| FR-1.4 | Simpan user → otomatis publish ke **semua controller terkait** | P0 |
| FR-1.5 | Upload CSV bulk, kolom `doors` pakai **nama pintu**, bukan ID | P1 |
| FR-1.6 | CSV: baris invalid ditolak per-baris dengan pesan jelas, baris valid tetap masuk | P1 |
| FR-1.7 | Hapus user → publish `users/delete` ke semua controller yang pernah dapat kartu itu | P0 |

### FR-2 — Department
| ID | Requirement | Prioritas |
|----|-------------|-----------|
| FR-2.1 | CRUD department | P0 |
| FR-2.2 | Set default akses pintu per department (checkbox per controller) | P0 |
| FR-2.3 | Tombol "Sync semua user dept ini" → publish hanya untuk user `is_custom_access = FALSE` | P0 |
| FR-2.4 | Hapus department → user-nya jadi `department_id = NULL` (akses hilang, harus ada konfirmasi eksplisit) | P1 |

### FR-3 — Controller & Door
| ID | Requirement | Prioritas |
|----|-------------|-----------|
| FR-3.1 | CRUD controller (device_id, nama, lokasi, total_doors, heartbeat_s) | P0 |
| FR-3.2 | CRUD pintu, tiap pintu terikat 1 controller + `door_number` unik dalam controller | P0 |
| FR-3.3 | Status online **dihitung**: `last_seen > NOW() - (heartbeat_s * 3)` + LWT retained | P0 |
| FR-3.4 | Full sync manual ke satu controller (protokol staging, §5) | P0 |
| FR-3.5 | Baca config controller (`config/request` → `config/response`) | P1 |
| FR-3.6 | Push config **aman** (`heartbeat_s`, `total_doors`) — langsung apply | P1 |
| FR-3.7 | Push config **berbahaya** (`wifi_*`, `mqtt_*`) — butuh ketik nama controller untuk konfirmasi | P2 |

### FR-4 — Log & Dashboard
| ID | Requirement | Prioritas |
|----|-------------|-----------|
| FR-4.1 | Terima log dari MQTT → simpan **snapshot** `user_nama` + `door_nama` + `reason` | P0 |
| FR-4.2 | Kartu tak dikenal tetap tersimpan (`user_id = NULL`, `reason = UNKNOWN_CARD`) | P0 |
| FR-4.3 | Live feed via WebSocket, latency < 1 detik | P0 |
| FR-4.4 | Halaman log: filter tanggal/controller/pintu/hasil, pagination, export CSV | P1 |
| FR-4.5 | Log yang di-replay dari buffer offline ditandai `replayed = TRUE` | P2 |

### FR-5 — Auth (Sprint 6)
| ID | Requirement | Prioritas |
|----|-------------|-----------|
| FR-5.1 | Login + JWT, role `admin` / `viewer` | P1 |
| FR-5.2 | WebSocket ikut diautentikasi saat handshake | P1 |
| FR-5.3 | `admin_logs`: siapa memberi akses apa ke siapa, kapan (before/after) | P1 |

---

## 5. Protokol Sync (paling rawan — tulis test-nya duluan)

```
Backend                                   Controller
   │  sync/start   v1,{sync_id}              │  buat daftar BARU di RAM
   ├────────────────────────────────────────►│  (daftar LAMA masih dipakai)
   │  users/set    v1,AABBCCDD,1|3   (QoS 1) │
   ├────────────────────────────────────────►│  masuk daftar baru
   │  ... N kali ...                         │
   │  sync/end     v1,{sync_id},{N}          │
   ├────────────────────────────────────────►│  bandingkan count
   │                                         │  cocok    → commit atomik + tulis LittleFS
   │                                         │  tidak    → BUANG daftar baru, pertahankan lama
   │  sync/result  v1,{sync_id},OK,{N}       │
   │◄────────────────────────────────────────┤
```

Aturan Backend:
- `sync_id` = UUID, disimpan dengan status `PENDING`.
- Tidak ada `sync/result` dalam **30 detik** ⇒ `TIMEOUT`.
- Terima `MISMATCH` atau `TIMEOUT` ⇒ retry **maksimal 2×**, lalu tandai controller `SYNC_FAILED` dan tampilkan banner merah di UI.
- Sync yang gagal **tidak boleh** membuat pintu tak bisa diakses. Ini kriteria terima yang tidak bisa ditawar (G5).

---

## 6. Requirement Non-Fungsional

| ID | Requirement |
|----|-------------|
| NFR-1 | Semua topik `users/#` dan `config/#` pakai **QoS 1** |
| NFR-2 | MQTT pakai username/password **per-controller** + ACL per-topic (controller X hanya boleh sub `access/X/#`) |
| NFR-3 | Kredensial ada di `.env`, tidak pernah di-commit |
| NFR-4 | `users.kartu` collation `utf8mb4_general_ci` — harus konsisten dengan `findByKartu` case-insensitive di firmware |
| NFR-5 | `access_logs.id` = `BIGINT`. Index: `server_ts`, `(kartu, server_ts)`, `(controller_id, server_ts)` |
| NFR-6 | Backend harus jalan **tanpa broker hidup** (mode degraded: REST + DB jalan, publish di-queue/di-log) |
| NFR-7 | Semua payload Server→Controller diawali `v1,`. Versi tak dikenal ditolak controller |

---

## 7. Kriteria Terima v0.2 (Definition of Done)

- [ ] Admin bisa tambah user via web → 2 mock controller menerima `door_number` yang **benar** (bukan `door_id`)
- [ ] Ubah akses department → semua user `is_custom_access=FALSE` di dept itu ter-update; yang `TRUE` **tidak berubah**
- [ ] Tap kartu di mock controller → muncul di live feed web < 1 detik
- [ ] Kartu tak dikenal tetap tercatat di log
- [ ] Simulasi 20% pesan `users/set` di-drop saat sync → controller balas `MISMATCH` → Backend retry → akhirnya `OK`
- [ ] Matikan mock controller → status berubah `offline` ≤ 3× heartbeat
- [ ] Ganti pemilik kartu → log lama tetap menampilkan nama pemilik lama
- [ ] Upload CSV dengan 1 nama pintu salah → baris itu ditolak, sisanya masuk

---

## 8. Risiko

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Bug P0-1 lolos ke produksi | Pintu diam-diam tidak bisa diakses, tanpa error | Uji dengan **2 mock controller sejak hari pertama** — bug ini tidak muncul dengan 1 controller |
| Kontrak MQTT berubah di tengah jalan | Kerja paralel 2 orang jadi sia-sia | Bekukan kontrak (dok 01) sebelum baris kode pertama. Perubahan = naik versi payload |
| Sync tidak atomik | Semua pintu terkunci saat sync putus | Pola staging + kriteria terima §7 |
| Firmware telat | Backend tidak bisa dites | **Mock controller** — jalur Anda tidak bergantung pada ESP32 sama sekali |
