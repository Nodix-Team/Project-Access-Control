# 📝 Proposal Teknis: Fitur CRUD Controller Dinamis & Otomatisasi Pintu

**Pengusul:** Danskiv (Danas Wara)  
**Penerima:** Rizzalaulia (Emping / Rizal)  
**Status:** Brainstorming (Untuk Diajukan)  

---

## 1. Latar Belakang & Tujuan
Saat ini pada arsitektur v0.2, data **Controller (ESP32)** bersifat statis di database (hanya bisa di-seed secara manual oleh DB Administrator melalui file SQL). Di halaman Web Admin, kita hanya bisa mengubah konfigurasi (*config push*), bukan menambah atau menghapus perangkat controller itu sendiri.

Untuk meningkatkan skalabilitas sistem (misal jika ada penambahan gedung baru atau penggantian perangkat ESP32 di lapangan), kita memerlukan fitur **CRUD Controller Dinamis** langsung dari halaman Web Admin.

---

## 2. Rincian Perubahan Teknis per Sprint

### 🛠️ Sprint 1 — Database (Dampak: Sangat Kecil)
*   **Perubahan**: Tambahkan constraint `ON DELETE CASCADE` pada foreign key `doors.controller_id` di database:
    ```sql
    ALTER TABLE doors 
    DROP FOREIGN KEY doors_ibfk_1,
    ADD CONSTRAINT doors_ibfk_1 
    FOREIGN KEY (controller_id) REFERENCES controllers(id) ON DELETE CASCADE;
    ```
*   **Tujuan**: Menjamin ketika controller dihapus dari sistem, pintu-pintu fisik yang terhubung dengannya otomatis terhapus secara aman untuk menghindari *orphan records*.

### 🛠️ Sprint 2 — Backend Core API (Dampak: Sedang)
*   **Penambahan Schema (`schemas/controller.py`)**:
    *   Buat class `ControllerCreate` (menerima `device_id`, `nama`, `lokasi`, `total_doors`, `ip_mode`, `ip_address`, `mqtt_user`, `mqtt_password`).
*   **Penambahan Endpoints (`routes/controllers.py`)**:
    *   `POST /api/controllers` — Membuat controller baru.
        *   *Otomatisasi*: Ketika controller berhasil disimpan, backend otomatis membuat data pintu baru sebanyak nilai `total_doors` ke tabel `doors` dengan penomoran lokal `1` sampai `N` (misal: "Pintu Lokal 1", "Pintu Lokal 2", dst.) agar admin tinggal mengedit namanya nanti.
    *   `DELETE /api/controllers/{controller_id}` — Menghapus controller.
*   **Pembaruan Router Pintu (`routes/doors.py`)**:
    *   Memastikan endpoint `PUT /api/doors/{door_id}` dapat mengubah `nama` dan `lokasi` pintu secara dinamis (ini sudah terimplementasi).

### 🛠️ Sprint 3 — Backend MQTT & Sync (Dampak: Sangat Kecil)
*   **Koneksi EMQX Auth**: Jika EMQX di-setup menggunakan auth database (MySQL plugin), penambahan baris baru di tabel `controllers` otomatis membuat kredensial MQTT baru tersebut aktif secara instan tanpa perlu restart broker EMQX.
*   **MQTT Protokol**: Tidak ada perubahan alur atau format topik. Protokol sync atomik (`sync/start` -> `set` -> `sync/end`) tetap berjalan normal menggunakan `device_id` yang baru terdaftar.

### 🛠️ Sprint 4 — Firmware ESP32 v0.2 (Dampak: Nol / Zero Impact)
*   **Sisi ESP32**: Sama sekali tidak membutuhkan perubahan kode firmware. 
*   Teknisi di lapangan hanya perlu memasukkan `device_id` dan MQTT credentials yang baru saja dibuat melalui halaman web config lokal ESP32 (`http://ip:8081`) saat booting pertama kali.

### 🛠️ Sprint 5 — Frontend React Web App (Dampak: Kecil)
*   **UI Update**: Tambahkan tombol `[+ Tambah Controller]` beserta modal input di halaman Controller Management, dan tombol `🗑️ Hapus` di baris tabel controller.

---

## 3. Analisis Dampak & Risiko
*   **Keamanan**: Sangat aman karena proses autentikasi MQTT tetap menggunakan username/password unik per controller yang tersimpan di database.
*   **Performa**: Beban kueri ke MySQL minimal. Kueri pengecekan status *online* berbasis waktu (`last_seen`) tidak terganggu.
*   **Timeline Sprint**: Penambahan kode di level backend backend (Sprint 2) hanya memakan waktu sekitar **1-2 jam pengerjaan tambahan** dan tidak memblokir jalannya Sprint 3 yang sedang diselesaikan oleh Rizal saat ini.
