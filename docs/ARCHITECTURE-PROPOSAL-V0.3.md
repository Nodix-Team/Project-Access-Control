# 🏗️ Arsitektur Access Control System — Proposal v0.3 (Revisi 2)

> [!WARNING]
> **DOKUMEN PROPOSAL OUTDATED:** Dokumen ini bersifat historis/proposal awal. Beberapa konfigurasi teknis (seperti alokasi pin dan format payload MQTT) yang tertulis di sini telah diubah demi keandalan sistem.
> Acuan keputusan final yang mengikat dan wajib digunakan adalah **[`docs/KEPUTUSAN_ARSITEKTUR_v0.3.md`](KEPUTUSAN_ARSITEKTUR_v0.3.md)**.

---

## Gambaran Umum Arsitektur v0.3 (Modern, Grade Industri)

```
                       ┌──────────────────────┐
                       │   ESP32-S3 Board     │
                       │ (W5500 Eth / WiFi AP)│
                       └──────────┬───────────┘
                                  │
                       MQTT (CSV, QoS 1 / TLS)
                                  ▼
                            ┌───────────┐
                            │   EMQX    │
                            │ (Broker)  │
                            └─────┬─────┘
                                  │
                         REST API + WebSocket
                                  ▼
                            ┌───────────┐
                            │  Backend  │
                            │ (FastAPI) │
                            └─────┬─────┘
                                  │
                              SQL / REST
                                  ▼
                         ┌────────────────┐
                         │ MySQL Database │
                         └────────────────┘
```

### ✨ Ringkasan Pembaruan Utama (v0.2.0 ──► v0.3.0)

1. **Mikrokontroler & Hardware (ESP32-S3)**: Migrasi dari ESP32 Klasik 4MB ke **ESP32-S3-WROOM-1-N16** dengan **16MB Flash Internal**. Menghapus kebutuhan chip memori SPI eksternal pada PCB.
2. **Koneksi Tunggal Ethernet W5500 untuk MQTT**: Menggunakan chip Ethernet SPI **W5500** onboard sebagai **satu-satunya jalur komunikasi MQTT & Backend Server**. Fitur WiFi **TIDAK DIGUNAKAN UNTUK TRAFIK MQTT**, dan hanya difungsikan secara terisolasi sebagai WiFi Hotspot AP Lokal saat tombol **`GPIO37`** ditekan untuk akses Web Config Local Port 8081 teknisi.
3. **I/O Expander Tunggal (MCP23017)**: Menggunakan 1 chip MCP23017 pada bus I2C untuk membaca door sensor, auxiliary input, buzzer onboard, dan LED indikator. Pin native ESP32-S3 dihemat untuk interupsi kecepatan tinggi (Wiegand Data & tombol REX).
4. **Sirkuit Pengondisian Logika Wiegand**: Menambahkan chip **74LVC245ADW** sebagai pengondisi logika Wiegand 5V ke 3.3V GPIO ESP32-S3, dilindungi TVS diode dari lonjakan statis.
5. **Real Time Clock (DS3231)**: Menambahkan modul RTC DS3231 via I2C untuk penanda waktu riil saat perangkat offline. Log offline kini menggunakan **Timestamp Unix Epoch** menggantikan relative `uptime_ms`.

---

## 1. Spesifikasi Hardware & Alokasi Pin ESP32-S3 (Opsi A)

Total I/O yang digunakan untuk melayani 4 pintu lengkap dengan REX, Reader Wiegand, LED/Buzzer feedback, Door Sensor, Auxiliary Input, Fire, dan Tamper adalah **43 jalur**.

### A. Alokasi Port MCP23017-E/SO (Bus I2C, Address 0x20)
Untuk input berkecepatan rendah dan output indikator, dialihkan ke chip IO Expander:

| Pin MCP23017 | Tipe | Fungsi | Rangkaian Proteksi / Interface |
|---|---|---|---|
| **`GPA0`** | Input | Door Sensor 1 | Optocoupler TLP291-4 |
| **`GPA1`** | Input | Door Sensor 2 | Optocoupler TLP291-4 |
| **`GPA2`** | Input | Door Sensor 3 | Optocoupler TLP291-4 |
| **`GPA3`** | Input | Door Sensor 4 | Optocoupler TLP291-4 |
| **`GPA4`** | Input | Auxiliary Input 1 | Optocoupler EL817 (Dry Contact) |
| **`GPA5`** | Input | Auxiliary Input 2 | Optocoupler EL817 (Dry Contact) |
| **`GPA6`** | Output | Buzzer Onboard | Driver Transistor NPN |
| **`GPA7`** | Output | LED Status AP Mode | Resistor Limiter LED |
| **`GPB0` - `GPB3`**| Output | LED Reader 1–4 | MOSFET BSS138 (Active-Low) |
| **`GPB4` - `GPB7`**| Output | Buzzer Reader 1–4| MOSFET BSS138 (Active-Low) |

### B. Alokasi Native Pin Langsung pada ESP32-S3
Digunakan untuk jalur komunikasi cepat, interupsi hardware (Wiegand & REX), dan aktuator relay:

| Pin ESP32-S3 | Tipe / Protokol | Fungsi | Keterangan |
|---|---|---|---|
| **`GPIO11`** | SPI MOSI | W5500 Ethernet Data Out | Bus SPI Utama |
| **`GPIO13`** | SPI MISO | W5500 Ethernet Data In | Bus SPI Utama |
| **`GPIO12`** | SPI SCK | W5500 Ethernet Clock | Bus SPI Utama |
| **`GPIO10`** | SPI CS | W5500 Ethernet Chip Select| Kendali Bus SPI |
| **`GPIO8`** | I2C SDA | Data Bus I2C | Terhubung ke MCP23017 & RTC DS3231 |
| **`GPIO9`** | I2C SCL | Clock Bus I2C | Terhubung ke MCP23017 & RTC DS3231 |
| **`GPIO1` - `GPIO4`**| Output | Lock Relay 1–4 | Drive ULN2003ADR (Wet/Dry via Jumper) |
| **`GPIO5` - `GPIO7`, `GPIO14`**| Input (Interrupt)| REX Input 1–4 | Tombol keluar (Optocoupler TLP291-4) |
| **`GPIO15`, `GPIO16`** | Input (Interrupt)| Wiegand Rdr 1 D0 & D1 | Reader Pintu 1 (Native Interrupt) |
| **`GPIO17`, `GPIO18`** | Input (Interrupt)| Wiegand Rdr 2 D0 & D1 | Reader Pintu 2 (Native Interrupt) |
| **`GPIO38`, `GPIO39`** | Input (Interrupt)| Wiegand Rdr 3 D0 & D1 | Reader Pintu 3 (Dipindah dari GPIO19/20 - Bebas Konflik USB) |
| **`GPIO21`, `GPIO22`** | Input (Interrupt)| Wiegand Rdr 4 D0 & D1 | Reader Pintu 4 (Native Interrupt) |
| **`GPIO1`** | Analog Input (ADC)| Sensing Tegangan PLN 12V| Pembagi Tegangan R1=100k/R2=10k |
| **`GPIO2`** | Analog Input (ADC)| Sensing Tegangan Aki 12V| Deteksi Low Battery & Missing Battery |
| **`GPIO35`** | Input | Tamper Box Input | Sakelar Limit Box (Optocoupler EL817) |
| **`GPIO36`** | Input | Fire Alarm Input | Input Failsafe (Optocoupler EL817) |
| **`GPIO37`** | Input | Tombol Fungsi Lokal | Uji coba manual lapangan / AP toggle |

> [!NOTE]
> Pemindahan pin Reader 3 dari `GPIO19/20` ke `GPIO38/39` dilakukan agar modul USB Native JTAG/OTG internal ESP32-S3 tetap dapat digunakan secara aman untuk flashing program kecepatan tinggi dan debugging serial tanpa memicu benturan elektrikal dengan sinyal Wiegand. `GPIO2` (ADC) membaca masukan daya 12V dari External PSU untuk mengategorikan 2 status sederhana: `POWER_NORMAL` (≥ 11.5V) dan `POWER_LOW` (< 11.5V).

---

## 2. Lapisan Firmware & Penyimpanan Data

### A. Format Penyimpanan Data User di LittleFS
Penyimpanan user tetap menggunakan protocol sync atomik. Kapasitas partisi LittleFS dinaikkan menjadi **10 MB** pada memori 16MB Internal Flash, memuat skema partisi custom:

```ini
[env:esp32s3_16mb]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
board_build.flash_size = 16MB
board_build.partitions = default_16MB.csv
```

### B. Format Penanda Waktu Log Offline (Unix Epoch)
Saat status offline, logger tidak lagi membubuhkan uptime relative `millis()`. Chip **DS3231** akan memasok waktu Unix Epoch UTC secara instan.

**Struktur format log offline di `/logs/offline_buffer.csv`**:
```
{timestamp_epoch},{card_id},{door_number},{status},{reason}
```
*Contoh*: `1784567890,0000123456,1,GRANTED,Valid Access`

### F. Fitur Web Serial Monitor, Test Output, & Dual-Network OTA Update

1. **Portal Web Config Local & Diagnostic Tools (Port 8081)**:
   * Portal web admin lokal (`HTTP Port 8081`) dapat diakses via **Ethernet LAN W5500** maupun via **WiFi Hotspot AP** (saat tombol `GPIO37` ditekan).
   * **Cakupan Menu Web Config Local**:
     *   **Tab System Status & Hardware Health**: Menampilkan diagnosa lengkap kesehatan controller:
         *   *Database User*: **Jumlah User Terdaftar** (`total_users`) dalam memori internal controller & status sinkronisasi.
         *   *Internal Flash & LittleFS*: Memori Total Flash (16MB), Partisi LittleFS (10MB), Terpakai (KB / %), Sisa Kapasitas Buffer Log Offline.
         *   *RAM Memory*: Free Heap RAM (KB), Minimum Free Heap, Sisa SRAM Internal.
         *   *Konektivitas & Network*: Status Ethernet W5500 (Link UP 100Mbps / Down), IP Address, Subnet, Gateway, MAC Address (`EC:64:C9:87:1C:74`), WiFi AP SSID, Jumlah Client Terhubung.
         *   *Kesehatan Perangkat Peripheral*: Status I2C MCP23017 (`OK`/`ERR`), RTC DS3231 (`OK`/`ERR`), SPI W5500 (`OK`/`ERR`), Uptime RTC Timestamp.
     *   **Tab Konfigurasi Jaringan**: Mengatur IP address, DHCP/Static, subnet, gateway, serta kredensial MQTT Broker (parameter spesifik pintu `dX_` dikelola terpusat via Web Dashboard Frontend).
     *   **Tab Test Output (Diagnosa Lapangan)**: Menyediakan tombol-tombol interaktif (*Test Relay 1–4*) untuk menguji pembukaan relay kunci pintu 1, 2, 3, dan 4 secara manual tanpa perlu tap kartu RFID.
     *   **Tab Web Serial Monitor Live**: Memantau log debug serial secara *real-time* via WebSocket (`/ws/serial`).
     *   **Tab Firmware Upgrade**: Mengunggah file `firmware.bin` (HTTP OTA Update).

2. **Dual-Network OTA Update (Ethernet W5500 & WiFi Hotspot AP)**:
   * **Skema Partisi Dual-APP (16MB Flash)**:
     ```ini
     # Partisi Flash ESP32-S3 16MB
     # nvs (20KB), otadata (8KB), app0 (3MB), app1 (3MB), littlefs (10MB)
     ```
   * **Dukungan Jalur Ganda**: Pembaruan firmware berkas `.bin` dapat diunggah secara Over-The-Air (OTA) baik melalui antarmuka **Ethernet LAN W5500** maupun melalui **WiFi Hotspot AP** (pancaran mandiri tombol `GPIO37`).
   * **Dua Metode Pengkinian**:
     * *Metode Web Upload*: Pengunggahan langsung berkas `firmware.bin` melalui form portal admin web lokal (Port 8081) menggunakan modul `Update.h`.
     * *Metode Push Network OTA*: Pengunggahan jarak jauh dari server backend pusat.
   * **Perlindungan Safe Rollback**: Jika firmware baru gagal booting atau memicu reset watchdog dalam 30 detik pasca-update, ESP32-S3 akan otomatis melakukan *rollback* ke partisi firmware sebelumnya yang aman.

---
Untuk mendeteksi apakah pintu benar-benar dimasuki atau tidak, controller menerapkan logika waktu tunggu sensor magnet:
1. **Otorisasi valid (Card Tap / REX)**:
   * Ketika otorisasi disetujui (`GRANTED`), controller mengaktifkan relay lock dan memulai timer **`door_open_timeout_s`** (default 10 detik).
   * **Kasus Pintu Dibuka**: Jika door sensor mendeteksi pintu dibuka sebelum timer habis, controller mengirimkan log dengan alasan **`Valid Access`** (untuk tap kartu) atau **`Exit via REX`** (untuk REX).
   * **Kasus Pintu Tetap Tertutup**: Jika timer habis dan pintu tetap tertutup rapat, controller menonaktifkan relay lock dan mengirimkan log alasan **`Valid Access - Unopened`** (untuk tap kartu) atau **`Exit REX - Unopened`** (untuk REX).
2. **Kejadian Alarm (Sensor Aktif Tanpa Otorisasi)**:
   * **Pintu Dibuka Paksa (Door Forced Open)**: Jika door sensor berubah menjadi terbuka tanpa dipicu tap kartu sukses atau tombol REX, controller mengirim log status `ALARM` dengan alasan **`Door Forced Open`**.
   * **Pintu Terbuka Terlalu Lama (Door Held Open)**: Jika pintu telah terbuka secara sah tetapi tidak tertutup kembali setelah batas waktu **`door_held_timeout_s`** terlampaui, controller mengirim log status `ALARM` dengan alasan **`Door Held Open`** dan membunyikan alarm fisik di sisi reader (default selama 30 detik).

### D. Parameter Konfigurasi Baru (Konfigurasi per Pintu)
Untuk fleksibilitas operasional di lapangan, parameter waktu sensor pintu **diatur secara spesifik per-pintu (1–4)**, bukan bersifat global. Struktur data `SystemConfig` ditambahkan parameter array berikut:
*   `door_active[4]`: Menentukan status aktif pintu fisik di lapangan (Boolean, default `true`). Jika di-set `false`, controller akan mengabaikan/menonaktifkan seluruh peripheral pintu tersebut (sensor, REX, reader Wiegand, relay lock, dan pelaporan alarm).
*   `door_open_timeout_s[4]`: Batas waktu tunggu pintu dibuka fisik setelah otorisasi (default `10` detik).
*   `door_held_timeout_s[4]`: Batas waktu toleransi pintu terbuka sebelum alarm berbunyi (default `30` detik).
*   `reader_alarm_duration_s[4]`: Durasi aktifnya alarm fisik (buzzer/LED) di reader pintu tersebut (default `30` detik).

Pada pesan sinkronisasi MQTT, parameter pintu diidentifikasi menggunakan awalan nomor pintu (`d1_`, `d2_`, `d3_`, atau `d4_`).

### E. Protokol Rekonsiliasi Otomatis & Verifikasi (Auto-Reconciliation)
Untuk menjamin integritas data tanpa intervensi manual, sistem menerapkan logika penyelarasan otomatis di sisi backend server ketika controller kembali terhubung (*reconnect/online*):

1. **Rekonsiliasi Database User (User DB Reconciliation)**:
   * Setiap kali controller mengirimkan detak jantung (*heartbeat*) di topik `access/{device_id}/heartbeat`, backend membandingkan parameter `total_users` yang dilaporkan dengan jumlah riil user yang terdaftar di database MySQL server untuk controller tersebut.
   * Jika jumlahnya tidak cocok (mismatch), backend secara otomatis memicu sesi sinkronisasi penuh (*Full Sync*) melalui topik `/users/sync/start`.
2. **Rekonsiliasi Konfigurasi (Config Reconciliation & Force Sync)**:
   * Setiap kali mendeteksi perubahan status konektivitas controller menjadi `ONLINE` (baik via LWT atau status publish), backend langsung mempublikasikan perintah cek ke topik `access/{device_id}/config/request`.
   * Controller membalas parameter aktifnya ke topik `access/{device_id}/config/response` untuk divalidasi oleh backend.
   * Sebagai langkah penyelarasan mutlak, backend akan **selalu mengirimkan (push)** konfigurasi terbaru dari database server ke topik `access/{device_id}/config/sync`, **tanpa peduli apakah ada perubahan parameter atau tidak** di database server. Hal ini menjamin status parameter controller selalu 100% konsisten dengan server pasca-reboot/reconnect.
3. **Mekanisme Failsafe (Anti-Loop Protection)**:
   * Jika proses sinkronisasi otomatis gagal atau berulang secara tidak wajar sebanyak **3 kali berturut-turut** dalam interval pendek (kurang dari 5 menit), backend akan menonaktifkan auto-sync untuk controller tersebut.
   * Status controller di database diubah menjadi `SYNC_ERROR_ATTENTION_REQUIRED` dan alarm merah dikirimkan ke dashboard admin frontend untuk mencegah kerusakan fisik tulis pada memori flash.
4. **Pemisahan Menu Sinkronisasi di Frontend React**:
   Pada antarmuka pengguna dashboard web, menu controller dipisahkan menjadi dua opsi tombol manual terpisah:
   *   **Tombol "Sync Database"**: Sinkronisasi massal seluruh data user/pemegang kartu.
   *   **Tombol "Sync Config"**: Sinkronisasi massal seluruh konfigurasi parameter per pintu (`dX_`) dan jaringan.

---

## 3. Komunikasi MQTT & Kontrak Topik v0.3

Topik MQTT diamankan secara ketat menggunakan otentikasi per-kredensial perangkat dan validasi TLS.

### A. Payload Log Transaksi Akses (`access/{device_id}/logs`)
Log dikirimkan secara sekuensial (QoS 1).
```
<card_id>,<door_number>,<status>,<reason>,<timestamp_epoch>[,REPLAYED]
```
*   `<card_id>`: String numerik 10-digit (padding nol di depan). Kolom ini **dikosongkan** jika kejadian tidak dipicu kartu RFID (seperti REX atau alarm sensor). Contoh: `,1,GRANTED,Exit via REX,1784567890`.
*   `<door_number>`: Angka pintu lokal (1–4).
*   `<status>`: `GRANTED`, `DENIED`, atau `ALARM`.
*   `<reason>`: Alasan status akses (dalam bahasa Inggris standar industri). Nilai yang didukung meliputi:
    *   `Valid Access`: Tap kartu disetujui dan pintu berhasil dibuka sebelum timeout.
    *   `Valid Access - Unopened`: Tap kartu disetujui, tetapi pintu tidak dibuka hingga timeout habis.
    *   `Exit via REX`: Tombol REX ditekan dan pintu berhasil dibuka sebelum timeout.
    *   `Exit REX - Unopened`: Tombol REX ditekan, tetapi pintu tidak dibuka hingga timeout habis.
    *   `Door Forced Open`: Sensor mendeteksi pintu dibuka paksa secara fisik tanpa otorisasi.
    *   `Door Held Open`: Sensor mendeteksi pintu dibiarkan terbuka melewati durasi toleransi (Held Open).
    *   `Unauthorized Door`: Kartu terdaftar tetapi tidak memiliki hak akses untuk pintu lokal tersebut (status `DENIED`).
    *   `Unknown Card`: Kartu tidak terdaftar dalam memori internal controller (status `DENIED`).
    *   `Invalid Door Number`: Permintaan akses pintu di luar jangkauan lokal 1–4 (status `DENIED`).
*   `<timestamp_epoch>`: Epoch timestamp UTC (10 digit).
*   `[,REPLAYED]`: Ditambahkan jika log diambil dari buffer offline.

> [!IMPORTANT]
> Karakter string pada kolom `<reason>` **sama sekali tidak boleh mengandung karakter koma (`,`)** agar tidak merusak struktur penulisan kolom pada berkas CSV saat parsing payload.


### B. Last Will and Testament (LWT)
Topik LWT didaftarkan oleh controller saat terhubung ke broker:
*   **Topik**: `access/{device_id}/status`
*   **Payload offline**: `OFFLINE`
*   **Payload online**: `ONLINE` (dikirimkan oleh controller sesaat setelah berhasil terhubung).

---

## 4. Skema Database & Sinkronisasi Waktu

### A. Skema Dasar Database (MySQL)
Database MySQL melayani 8 tabel utama yang telah dioptimalkan dengan indeks pencarian log:
*   **`controllers`**: device_id, ip_address, status, last_heartbeat.
*   **`doors`**: door_number (1-4 lokal), controller_id, location.
*   **`users`**: name, card_id (10-digit), department_id, status.
*   **`user_access`**: mapping user_id ke door_id.
*   **`departments`**: departemen user.
*   **`department_access`**: mapping department_id ke door_id.
*   **`access_logs`**: card_id, door_id, status, is_replayed, timestamp (GMT+7).
*   **`admins`**: login dashboard.

### B. Penanganan Waktu Lokal (GMT+7)
Log akses yang dikirim controller disamakan menjadi format GMT+7 sebelum disimpan ke database:
```python
# backend/app/services/log_service.py
from datetime import datetime, timezone, timedelta

# Standardisasi zona waktu ke GMT+7 (WIB)
gmt_plus_7 = timezone(timedelta(hours=7))

def save_log(card_id: str, door_id: int, status: str, epoch: int):
    log_time = datetime.fromtimestamp(epoch, tz=gmt_plus_7)
    # Simpan log_time ke kolom timestamp MySQL (GMT+7)
```

---

## 5. Matriks Perbandingan (Sebelum vs Sesudah)

Berikut adalah tabel pembanding antara arsitektur dan sistem lama (v0.2.0) dengan arsitektur baru (v0.3.0):

| Komponen / Fitur | Sebelum (v0.2.0) | Sesudah (v0.3.0) |
|---|---|---|
| **MCU & Flash Board** | ESP32 Klasik (4MB Flash Internal + 16MB SPI Flash eksternal pada PCB) | **ESP32-S3-WROOM-1-N16** (16MB Flash Internal, sirkuit memori eksternal PCB dihapus) |
| **Konektivitas Backbone** | Wi-Fi (Utama) | **W5500 Ethernet SPI** (Satu-satunya jalur komunikasi MQTT/Backend. WiFi tidak dipakai untuk MQTT, hanya untuk Hotspot AP via tombol GPIO37) |
| **I/O Expander** | 2x MCP23017 (Address 0x20 & 0x21) | **1x MCP23017** (Address 0x20, pin native dihemat untuk interrupt REX & Wiegand) |
| **Logika Pembukaan Pintu** | Langsung mengirim log `GRANTED` saat tap kartu (tanpa mendeteksi status fisik pintu) | Menunggu sensor magnetik mendeteksi pintu dibuka atau timeout habis sebelum mengirim log status |
| **Logika Keluar (REX)** | Hanya memicu relay lokal | Memantau sensor pintu, mengirim log **`VALID_EXIT`** jika pintu dibuka, atau **`VALID_EXIT_UNOPENED`** jika tidak dibuka |
| **Logika Alarm Pintu** | Deteksi lokal tanpa pencatatan status formal di log MQTT | Mengirimkan log status `ALARM` dengan reason **`DOOR_FORCED_OPEN`** & **`DOOR_HELD_OPEN`** ke server |
| **Akurasi Waktu Log Offline** | Uptime relatif (`uptime_ms` menggunakan `millis()`) | **Unix Epoch Timestamp** riil yang dipasok dari chip RTC **DS3231** onboard |
| **Format Log Transaksi (MQTT)**| `<card_id>,<door_number>,<status>,<uptime_ms>` | `<card_id>,<door_number>,<status_code>,<reason_code>,<timestamp_epoch>` (Encoding Angka 3-Lapis per [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md)) |
| **Format Status/Heartbeat (MQTT)**| `total_doors,user_count,free_heap,uptime_ms` (Topik `status`) | `uptime_s,rssi,free_heap,total_users` (Topik `heartbeat`) |
| **Pilihan Nilai Reason (Logs)** | `OK`, `Tidak punya akses ke pintu ini`, `Kartu tidak terdaftar`, `Nomor pintu tidak valid` | `VALID_ACCESS`, `VALID_ACCESS_UNOPENED`, `VALID_EXIT`, `VALID_EXIT_UNOPENED`, `DOOR_FORCED_OPEN`, `DOOR_HELD_OPEN`, `UNAUTHORIZED_DOOR`, `UNKNOWN_CARD`, `INVALID_DOOR_NUMBER` |
| **Parameter Konfigurasi Baru** | - | **`dX_active`**, **`dX_open_timeout_s`**, **`dX_held_timeout_s`**, **`dX_alarm_duration_s`** (diatur spesifik per pintu `dX` 1–4) |
| **Skema Database (Logs)** | Hanya mencatat status `GRANTED`/`DENIED` dan `is_replayed` | Mendukung status `GRANTED`/`DENIED`/`ALARM` dengan kode DB netral, serta penyesuaian zona waktu dinamis |

### A. Perbandingan Detail Reason Code (Sebelum vs Sesudah)

Berikut adalah matriks pemetaan alasan status akses (*reason code*) antara protokol v0.2.0 dengan v0.3.0 untuk acuan implementasi:

| Skenario Kejadian / Event | Status Sebelum | Reason Sebelum (v0.2.0) | Status Sesudah | Reason Kode DB (v0.3.0) | Teks Display UI |
|---|---|---|---|---|---|
| Tap kartu disetujui, pintu fisik dibuka | `GRANTED` | `OK` | `GRANTED` | **`VALID_ACCESS`** | `VALID ACCESS` |
| Tap kartu disetujui, pintu tetap tertutup hingga timeout | `GRANTED` | `OK` | `GRANTED` | **`VALID_ACCESS_UNOPENED`** | `VALID ACCESS UNOPENED` |
| Tombol REX ditekan, pintu fisik dibuka | - (tidak ada log MQTT) | - | `GRANTED` | **`VALID_EXIT`** | `VALID EXIT` |
| Tombol REX ditekan, pintu tetap tertutup hingga timeout | - (tidak ada log MQTT) | - | `GRANTED` | **`VALID_EXIT_UNOPENED`** | `VALID EXIT UNOPENED` |
| Pintu dibuka paksa tanpa otorisasi (Sabotase) | - (tidak ada log MQTT) | - | `ALARM` | **`DOOR_FORCED_OPEN`** | `DOOR FORCED OPEN` |
| Pintu tertahan terbuka melebihi durasi batas waktu | - (tidak ada log MQTT) | - | `ALARM` | **`DOOR_HELD_OPEN`** | `DOOR HELD OPEN` |
| Kartu terdaftar, tetapi tidak punya izin untuk pintu tersebut | `DENIED` | `Tidak punya akses ke pintu ini` | `DENIED` | **`UNAUTHORIZED_DOOR`** | `UNAUTHORIZED DOOR` |
| Kartu tidak terdaftar dalam memori internal | `DENIED` | `Kartu tidak terdaftar` | `DENIED` | **`UNKNOWN_CARD`** | `UNKNOWN CARD` |
| Permintaan nomor pintu lokal di luar jangkauan 1–4 | `DENIED` | `Nomor pintu tidak valid` | `DENIED` | **`INVALID_DOOR_NUMBER`** | `INVALID DOOR NUMBER` |

### B. Riwayat Perbaikan Spesifikasi v0.3 (Changelog)

Berikut adalah daftar revisi penyesuaian detail parameter spesifikasi v0.3 selama proses review rancangan:

| Komponen / Fitur | Sebelum Perbaikan (Draft Awal v0.3) | Sesudah Perbaikan (Revisi Terakhir v0.3) | Alasan & Dampak Perbaikan |
|---|---|---|---|
| **Batas Log Offline** | `MAX_LOG_LINES = 2000` | `MAX_LOG_LINES = 5000` | Diselaraskan dengan batas buffer pada driver C++ firmware (`OfflineLogBuffer.cpp`). |
| **Alokasi Pin Wiegand** | Menggunakan GPIO19/20 untuk Reader 3 (konflik dengan Native USB). | Dipindahkan ke **`GPIO38`** dan **`GPIO39`**. | Membebaskan port USB Native JTAG/OTG internal agar dapat digunakan flashing/debugging tanpa gangguan sinyal Reader. |
| **Karakter Kolom Reason** | Bebas/tidak dibatasi. | Dilarang keras menggunakan karakter koma (`,`) pada string reason. | Menjamin integritas pemisahan data CSV MQTT agar tidak merusak parsing kolom di backend. |
| **Format Status/Heartbeat** | Payload bertipe uptime milidetik dan total pintu. | Diubah menjadi uptime detik, RSSI WiFi, dan jumlah user (`total_users`). | Memungkinkan backend melakukan deteksi selisih data user (*drift check*) secara berkala saat heartbeat diterima. |
| **Konfigurasi Aktif Pintu** | Bersifat global/seluruh pintu aktif secara default. | Menambahkan parameter **`dX_active`** per-pintu (1-4). | Memungkinkan admin menonaktifkan pemantauan kabel/peripheral pintu yang tidak terpasang di lapangan. |



