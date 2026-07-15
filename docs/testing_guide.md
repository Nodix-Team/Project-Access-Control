# 🧪 Panduan Praktis Pengujian (ESP32 Access Control)

Dokumen ini berisi panduan langkah-demi-langkah beserta format payload JSON yang siap di-copy-paste untuk menguji sistem akses kontrol ESP32 Anda menggunakan **MQTT Explorer** dan **PuTTY**.

---

## 💻 BAGIAN 1: PENGUJIAN VIA MQTT EXPLORER

### A. Pengaturan Koneksi MQTT Explorer
1. Klik **`+`** (New Connection) untuk membuat profil koneksi baru.
2. Atur parameter koneksi berikut:
   - **Name**: `ESP32 Access Control` (atau bebas)
   - **Protocol**: `mqtt://`
   - **Host**: `10.212.228.153` (IP Laptop Anda)
   - **Port**: `1883`
3. Klik **`Connect`**. Setelah terhubung, amati topic tree `access/` di sisi kiri.

---

### B. Daftar Perintah MQTT (Publish Payload)

#### 1. Tambah User Baru
Kirim data satu user baru ke ESP32.
* **Topic**: `access/users/add`
* **Payload JSON**:
```json
{
  "kartu": "AABBCCDD",
  "nama": "John Doe",
  "doors": [1, 3]
}
```
> *John Doe hanya memiliki akses ke Pintu 1 dan Pintu 3.*

#### 2. Update Data User
Perbarui informasi user berdasarkan User ID (`uid`).
* **Topic**: `access/users/update`
* **Payload JSON**:
```json
{
  "uid": 1,
  "kartu": "AABBCCDD",
  "nama": "John Doe Updated",
  "doors": [1, 2, 3, 4]
}
```
> *Memperbarui User ID `1` agar memiliki hak akses ke semua pintu [1, 2, 3, 4].*

#### 3. Hapus User
Hapus data user dari memori ESP32 menggunakan User ID (`uid`).
* **Topic**: `access/users/delete`
* **Payload JSON**:
```json
{
  "uid": 1
}
```

#### 4. Bulk Sync (Tambah Banyak User Sekaligus)
Mengirimkan banyak daftar user sekaligus ke database lokal ESP32.
* **Topic**: `access/users/sync`
* **Payload JSON**:
```json
[
  { "uid": 1, "kartu": "AABBCCDD", "nama": "John Doe", "doors": [1, 3] },
  { "uid": 2, "kartu": "11223344", "nama": "Jane Smith", "doors": [1, 2, 4] },
  { "uid": 3, "kartu": "55667788", "nama": "David Miller", "doors": [2, 3] }
]
```
> [!WARNING]
> Perintah `sync` ini berbentuk Array `[...]`. Perintah ini akan menghapus seluruh database user lama di memori ESP32, lalu menggantikannya secara total dengan daftar baru di atas.

---

## 🖥️ BAGIAN 2: PENGUJIAN VIA SERIAL MONITOR (PUTTY)

Agar input ketikan Anda dapat dikirimkan dengan benar dan tulisan Anda terlihat di layar terminal, lakukan konfigurasi PuTTY berikut ini.

### A. Pengaturan Koneksi PuTTY
1. **Connection Type**: Pilih **`Serial`**.
2. **Serial Line**: Isi dengan **`COM6`** (sesuaikan dengan port USB ESP32 Anda).
3. **Speed (Baudrate)**: Isi dengan **`115200`**.
4. **Flow Control** (di menu `Connection` -> `Serial` di panel kiri): Ubah dari `XON/XOFF` menjadi **`None`**.
5. **Terminal Options** (di menu `Terminal` di panel kiri):
   - Centang **`Implicit CR in every LF`** (supaya baris teks tidak bergeser miring ke kanan).
   - Pada bagian **Local echo**, pilih **`Force on`** (supaya tulisan yang Anda ketik langsung muncul di layar).
   - Pada bagian **Local line editing**, pilih **`Force on`**.
6. Klik **`Open`**.
7. Tekan tombol fisik **`RST/EN`** di ESP32 satu kali untuk melihat proses inisialisasi boot.

---

### B. Simulasi Scan Kartu RFID
1. Ketik **UID Kartu** (misal: `AABBCCDD`) di jendela PuTTY, lalu tekan **Enter**.
2. Serial Monitor akan membalas dengan nama user dan bertanya:
   `Masuk pintu mana? (1-4):`
3. Masukkan **Nomor Pintu** (misal: `1`), lalu tekan **Enter**.
4. Sistem akan menampilkan status akses **GRANTED** atau **DENIED**.

---

### C. Perintah Konsol Khusus
Ketik perintah berikut (menggunakan huruf kapital) di terminal PuTTY lalu tekan **Enter**:
* **`LIST`** : Menampilkan seluruh database user terdaftar beserta hak akses pintunya.
* **`STATUS`** : Menampilkan kesehatan ESP32 (Uptime, User count, Free memory heap).
* **`RESTART`** : Memaksa modul ESP32 melakukan reboot.

---

## 📡 BAGIAN 3: MEMANTAU TRANSMIT DATA (LOGS & STATUS)

Anda dapat memantau pesan keluaran dari ESP32 di panel kiri **MQTT Explorer**:

### A. Heartbeat (`access/status`)
Otomatis dipublish oleh ESP32 setiap 30 detik:
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

### B. Log Transaksi Akses (`access/logs`)
Otomatis terkirim setiap kali scan kartu disimulasikan:
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

---

## 🤖 BAGIAN 4: PENGUJIAN OTOMATIS & SIMULATOR MULTI-CONTROLLER (v0.2)

Untuk mempermudah pengembangan Backend tanpa hardware fisik, disediakan dua script Python di folder `tools/`:

### A. Menjalankan Simulator ESP32
Script ini akan berpura-pura menjadi 2 buah ESP32 (Controller A dan B) secara bersamaan (multi-threading).
1. Buka terminal di folder project.
2. Jalankan: `python tools/simulate_esp32.py`
3. Simulator akan login ke MQTT broker (IP localhost `127.0.0.1`) menggunakan kredensial:
   - **Controller A**: `ctrl-A` / `ctrlA123` (`esp32-ac-001`)
   - **Controller B**: `ctrl-B` / `ctrlB123` (`esp32-ac-002`)
4. Simulator akan mengirim *heartbeat* otomatis setiap 10 detik dan siap menerima perintah *sync* dari backend.

### B. Menjalankan Automated Test
Script ini akan bertindak sebagai Backend untuk mengirimkan perintah add/update/delete/sync dan membaca heartbeat.
1. Pastikan EMQX sudah berjalan dan autentikasi aktif (lihat Sprint 1 di Roadmap).
2. Jalankan: `python tools/test_mqtt.py`
3. Script akan menggunakan user `backend` / `backend123` dan mengirimkan serangkaian aksi. Jika simulator sedang berjalan, Anda akan melihat simulator bereaksi terhadap perintah tersebut.
