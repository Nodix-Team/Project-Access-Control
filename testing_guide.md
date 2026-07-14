# 🧪 Panduan Praktis Pengujian dengan MQTT Explorer & Serial Monitor

Dokumen ini berisi panduan langkah-demi-langkah beserta format payload JSON yang siap di-copy-paste untuk menguji sistem akses kontrol ESP32 Anda.

---

## 💻 1. Penggunaan di MQTT Explorer

### A. Pengaturan Koneksi MQTT Explorer
1. Klik **`+`** (New Connection) untuk membuat profil baru.
2. Atur parameter koneksi berikut:
   - **Name**: ESP32 Access Control (bebas)
   - **Protocol**: `mqtt://`
   - **Host**: `10.212.228.153`
   - **Port**: `1883`
3. Klik **`Connect`**. Setelah terhubung, amati topic tree `access/` di sisi kiri.

---

### B. Tambah User Baru (`access/users/add`)
* **Topic**: `access/users/add`
* **Format**: JSON (Raw)
* **Payload**:
```json
{
  "kartu": "AABBCCDD",
  "nama": "John Doe",
  "doors": [1, 3]
}
```
*(John Doe hanya memiliki akses ke Pintu 1 dan Pintu 3)*

---

### C. Update Data User (`access/users/update`)
* **Topic**: `access/users/update`
* **Format**: JSON (Raw)
* **Payload**:
```json
{
  "uid": 1,
  "kartu": "AABBCCDD",
  "nama": "John Doe Updated",
  "doors": [1, 2, 3, 4]
}
```
*(Memperbarui User ID `1` agar memiliki hak akses ke semua pintu [1, 2, 3, 4])*

---

### D. Hapus User (`access/users/delete`)
* **Topic**: `access/users/delete`
* **Format**: JSON (Raw)
* **Payload**:
```json
{
  "uid": 1
}
```
*(Menghapus user dengan ID `1`)*

---

### E. Bulk Sync / Menambah Banyak User Sekaligus (`access/users/sync`)
* **Topic**: `access/users/sync`
* **Format**: JSON (Raw)
* **Payload** (Bisa diisi lebih dari 2 user, cukup tambahkan objek baru di dalam array `[...]`):
```json
[
  { "uid": 1, "kartu": "AABBCCDD", "nama": "John Doe", "doors": [1, 3] },
  { "uid": 2, "kartu": "11223344", "nama": "Jane Smith", "doors": [1, 2, 4] },
  { "uid": 3, "kartu": "55667788", "nama": "David Miller", "doors": [2, 3] }
]
```
> [!IMPORTANT]
> Payload ini berbentuk Array `[...]` dan digunakan untuk memasukkan banyak user sekaligus. Perintah ini akan menghapus seluruh database user lama di flash memory ESP32, lalu menggantikannya dengan daftar user baru di atas.

---

## 🖥️ 2. Penggunaan Serial Monitor (PuTTY / Arduino IDE / PlatformIO CLI)

Agar input ketikan Anda dapat dikirimkan dengan benar dan tulisan Anda terlihat di layar, kami merekomendasikan penggunaan **PuTTY** dengan konfigurasi berikut:

### A. Pengaturan Konfigurasi PuTTY (Paling Nyaman)
1. **Connection Type**: Pilih **`Serial`**.
2. **Serial Line**: Isi dengan **`COM6`** (sesuaikan dengan port ESP32 Anda).
3. **Speed (Baudrate)**: Isi dengan **`115200`**.
4. **Flow Control** (berada di menu `Connection` -> `Serial`): Ubah dari `XON/XOFF` menjadi **`None`**.
5. **Local Echo & Line Newline** (berada di menu `Terminal`):
   - Centang **`Implicit CR in every LF`** (supaya baris teks tidak bergeser miring ke kanan).
   - Pada bagian **Local echo**, pilih **`Force on`** (supaya tulisan yang Anda ketik terlihat di layar).
   - Pada bagian **Local line editing**, pilih **`Force on`**.
6. Klik **`Open`** untuk masuk ke terminal. Tekan tombol fisik **`RST/EN`** di ESP32 satu kali untuk melihat proses boot.

---

### B. Simulasi Scan Kartu RFID
1. Ketik UID Kartu yang ingin disimulasikan (misal: `AABBCCDD`), lalu tekan **Enter**.
2. Serial Monitor akan merespon dengan nama user (jika terdaftar) dan bertanya:
   `Masuk pintu mana? (1-4):`
3. Masukkan nomor pintu (misal: `1`), lalu tekan **Enter**.
4. Sistem akan menampilkan apakah akses **GRANTED** (Diterima) atau **DENIED** (Ditolak).

---

### C. Perintah Khusus (Ketik langsung di Serial Monitor)

* **`LIST`**
  Menampilkan semua user terdaftar beserta UID, Nomor Kartu, Nama, dan Pintu yang dapat mereka akses.
* **`STATUS`**
  Menampilkan informasi sistem saat ini (Device ID, Uptime, Jumlah User terdaftar, Heap Memory kosong).
* **`RESTART`**
  Memaksa ESP32 melakukan reboot / restart.

---

## 📡 3. Memantau Status & Log Transaksi

Di MQTT Explorer, amati panel kiri (Topic Tree) untuk melihat pesan masuk dari ESP32:

### A. Heartbeat (`access/status`)
Otomatis dikirim oleh ESP32 setiap 30 detik. Berisi data kesehatan hardware:
```json
{
  "device_id": "esp32-ac-001",
  "uptime_ms": 30000,
  "user_count": 2,
  "ip": "10.212.228.5",
  "rssi": -55,
  "free_heap": 247856
}
```

### B. Log Akses Pintu (`access/logs`)
Otomatis terbit setiap kali ada simulasi scan kartu di Serial Monitor:
```json
{
  "timestamp": 45120,
  "uid": 1,
  "kartu": "AABBCCDD",
  "nama": "John Doe",
  "pintu": 1,
  "nama_pintu": "pintu1",
  "status": "GRANTED"
}
```
*(Status bernilai `GRANTED` atau `DENIED`)*
