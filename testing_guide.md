# 🧪 Panduan Praktis Pengujian dengan MQTT Explorer & Serial Monitor

Dokumen ini berisi panduan langkah-demi-langkah beserta format payload JSON yang siap di-copy-paste untuk menguji sistem akses kontrol ESP32 Anda.

---

## 💻 1. Penggunaan di MQTT Explorer

Gunakan bagian **Publish** di MQTT Explorer (berada di pojok kanan bawah atau panel samping) untuk mengirim perintah ke ESP32.

### A. Tambah User Baru (`access/users/add`)
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

### B. Update Data User (`access/users/update`)
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

### C. Hapus User (`access/users/delete`)
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

### D. Bulk Sync / Menambah Banyak User Sekaligus (`access/users/sync`)
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

## 🖥️ 2. Penggunaan di Serial Monitor

Buka Serial Monitor di PlatformIO (Baud rate: `115200`). Di sini Anda dapat mensimulasikan scan kartu dan menjalankan perintah khusus.

### A. Simulasi Scan Kartu RFID
1. Ketik UID Kartu yang ingin disimulasikan (misal: `AABBCCDD`), lalu tekan **Enter**.
2. Serial Monitor akan merespon dengan nama user (jika terdaftar) dan bertanya:
   `Masuk pintu mana? (1-4):`
3. Masukkan nomor pintu (misal: `1`), lalu tekan **Enter**.
4. Sistem akan menampilkan apakah akses **GRANTED** (Diterima) atau **DENIED** (Ditolak).

---

### B. Perintah Khusus (Ketik langsung di Serial Monitor)

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
