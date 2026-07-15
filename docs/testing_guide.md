# 🧪 Panduan Praktis Pengujian (ESP32 Access Control — v0.2.0)

Dokumen ini berisi panduan langkah-demi-langkah beserta format payload CSV yang siap di-copy-paste untuk menguji sistem akses kontrol ESP32 Anda menggunakan **MQTT Explorer**, **Local Web Server**, dan **PuTTY**.

---

## 💻 BAGIAN 1: PENGUJIAN VIA MQTT EXPLORER

### A. Pengaturan Koneksi MQTT Explorer
1. Klik **`+`** (New Connection) untuk membuat profil koneksi baru.
2. Atur parameter koneksi berikut:
   - **Protocol**: `mqtt://`
   - **Host**: `127.0.0.1` (atau IP broker EMQX lokal Anda)
   - **Port**: `1883`
   - **Username**: `backend` (atau kredensial yang dibuat di EMQX)
   - **Password**: `p@ssw0rd`
3. Klik **`Connect`**. Setelah terhubung, amati topic tree `access/` di sisi kiri.

---

### B. Daftar Perintah MQTT (Publish Payload CSV)
Gantikan `{device_id}` dengan ID ESP32 Anda (default: `esp32-ac-001`). Semua topic di bawah menggunakan **QoS 1** (centang pilihan `qos 1` di panel publish MQTT Explorer).

#### 1. Set User (Upsert)
Menambahkan atau memperbarui hak akses kartu.
* **Topic**: `access/{device_id}/users/set`
* **Payload CSV**:
  ```csv
  AABBCCDD,1|2|3
  ```
  *(Artinya: Kartu `AABBCCDD` dapat mengakses Pintu 1, 2, dan 3 local)*

#### 2. Hapus User
Menghapus hak akses kartu berdasarkan UID kartunya.
* **Topic**: `access/{device_id}/users/delete`
* **Payload CSV**:
  ```csv
  AABBCCDD
  ```

#### 3. Sinkronisasi Atomik (Bulk Sync)
Gunakan urutan publish berikut untuk melakukan sinkronisasi aman:
1. **Start Sync:**
   * **Topic**: `access/{device_id}/users/sync/start`
   * **Payload**: `sync_session_123`
2. **Set User Data (Kirim satu per satu):**
   * **Topic**: `access/{device_id}/users/set`
   * **Payload 1**: `AABBCCDD,1|2`
   * **Payload 2**: `11223344,2`
3. **End Sync (Kirim jumlah data yang diekspektasi):**
   * **Topic**: `access/{device_id}/users/sync/end`
   * **Payload**: `sync_session_123,2`
4. **Verifikasi Hasil:**
   * Amati topic `access/{device_id}/sync/result`. ESP32 akan merespon dengan `sync_session_123,OK,2` jika jumlah data cocok, atau `sync_session_123,MISMATCH,x` jika ada data yang hilang di jalan.

#### 4. Mengubah Config via MQTT
Mengubah setingan sistem pada ESP32.
* **Topic**: `access/{device_id}/config/set`
* **Payload CSV**:
  - `heartbeat_s,10` (Safe: langsung disimpan)
  - `wifi_ssid,SSID_Baru` (Dangerous: memicu backup config, setting baru, reboot, dan uji koneksi 60 detik)

#### 5. Membaca Config Aktif
* **Topic**: `access/{device_id}/config/request`
* **Payload**: *(kosong)*
* Amati tanggapan ESP32 di topic `access/{device_id}/config/response`. Format balasan CSV berisi semua key-value config aktif (tanpa wifi/mqtt password demi keamanan).

---

## 🖥️ BAGIAN 2: PENGUJIAN VIA LOCAL WEB SERVER (Port 8081)

Setiap controller ESP32 menjalankan web server lokal sebagai penyelamat konfigurasi (*anti-brick*).

1. Buka browser Anda dan akses **`http://<IP_ESP32>:8081`** (misal: `http://192.168.1.88:8081`).
2. **Dashboard Status:** Anda akan melihat data realtime RSSI (WiFi), status koneksi MQTT, total user, sisa RAM, dan Uptime.
3. **Uji Safe Rollback:**
   - Coba ubah SSID WiFi atau Broker Host MQTT ke IP asal-asalan yang salah pada form, lalu klik **Simpan & Reboot**.
   - ESP32 akan reboot.
   - Amati terminal Serial: ESP32 akan gagal menghubungkan WiFi/MQTT baru selama 60 detik.
   - Setelah 60 detik gagal, ESP32 akan melakukan **Rollback** ke setingan aman sebelumnya, lalu reboot kembali.
   - ESP32 akan online kembali dengan WiFi lama tanpa perlu flash kabel USB!

---

## 🖥️ BAGIAN 3: PENGUJIAN VIA SERIAL MONITOR (PUTTY)

### A. Pengaturan Koneksi PuTTY
1. **Connection Type**: Pilih **`Serial`**.
2. **Serial Line**: Isi dengan **`COM6`** (sesuaikan port USB ESP32 Anda).
3. **Speed (Baudrate)**: Isi dengan **`115200`**.
4. **Flow Control** (di panel menu kiri `Connection` -> `Serial`): Ubah ke **`None`**.
5. **Terminal Options** (di panel menu kiri `Terminal`):
   - Centang **`Implicit CR in every LF`**.
   - Pada bagian **Local echo**, pilih **`Force on`**.
   - Pada bagian **Local line editing**, pilih **`Force on`**.
6. Klik **`Open`**.

### B. Simulasi Tap Kartu
1. Ketik **UID Kartu** (misal: `AABBCCDD`) di PuTTY, lalu tekan **Enter**.
2. Masukkan **Nomor Pintu** (1-4) (misal: `2`), lalu tekan **Enter**.
3. Terminal akan menampilkan tulisan **ACCESS GRANTED** atau **ACCESS DENIED**.

### C. Konsol Konsol Khusus
Ketik perintah ini di PuTTY saat menunggu input kartu:
* **`LIST`**: Menampilkan database kartu beserta akses pintu di flash.
* **`STATUS`**: Menampilkan detail internal RAM dan Uptime ESP32.
* **`RESTART`**: Memaksa reboot ESP32.

---

## 📡 BAGIAN 4: PENGUJIAN RING BUFFER LOG OFFLINE

Mekanisme ini menjaga agar log tap kartu tidak hilang saat jaringan internet putus.

1. **Simulasi Offline:** Matikan koneksi MQTT Broker Anda atau putuskan jaringan WiFi router Anda.
2. **Tap Kartu:** Lakukan simulasi tap kartu beberapa kali melalui PuTTY.
3. ESP32 akan mencetak status akses, serta menampilkan pesan:
   `[MQTT] Offline, menyimpan log transaksi ke LittleFS...`
4. **Nyalakan Kembali Jaringan:** Hubungkan kembali MQTT Broker / WiFi router Anda.
5. Setelah ESP32 mendeteksi koneksi MQTT aktif kembali:
   - ESP32 akan langsung membaca file `/logs/offline_buffer.csv`.
   - Mengirim semua log tertunda ke topic `access/{device_id}/logs` dengan payload format CSV: `kartu,door_number,status,uptime_ms,REPLAYED`.
   - Setelah sukses terkirim, file buffer offline dibersihkan otomatis.

---

## 🤖 BAGIAN 5: PENGUJIAN OTOMATIS & SIMULATOR MULTI-CONTROLLER (v0.2)

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
