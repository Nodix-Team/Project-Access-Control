# Proposal Rancangan Board Access Control 4-Pintu (Grade Industri)
**Ditujukan Untuk: Bapak Rizal**
**Penyusun: Tim Technical Engineering**
**Tanggal Dokumen: 21 Juli 2026**

---

## Ringkasan Dokumen
Dokumen ini merupakan proposal spesifikasi teknis dan analisis biaya rancangan board access control 4-pintu siap produksi berbasis mikrokontroler ESP32. Proposal ini memuat perbandingan antara arsitektur **ESP32-S3 (Modern & Efisien)** dengan **ESP32 Klasik (Standar Komersial)** untuk membantu pengambilan keputusan Bapak Rizal dalam menentukan basis platform yang akan dikembangkan.

---

## 1. Pemilihan Microcontroller & Arsitektur IO Expander

Untuk mendukung 4 pintu lengkap dengan **2 Auxiliary Input (Dry Contact)**, **Tamper Input**, **Fire Input**, **Onboard Buzzer**, serta **kontrol LED/Buzzer Reader Wiegand**, total kebutuhan I/O kita adalah **43 pin**.

* **ESP32-S3 (WROOM-1/1U)**: Menggunakan varian **ESP32-S3-WROOM-1-N16** (16MB Flash Internal, tanpa PSRAM). Kita menggunakan **1 chip IO Expander MCP23017-E/SO** di bus I2C untuk mengalihkan indikator LED, buzzer, dan door sensor.
* **ESP32 Klasik (WROOM-32)**: Menggunakan modul standar **ESP32-WROOM-32E** (4MB Flash Internal). Kita **wajib menggunakan 2 chip IO Expander MCP23017-E/SO** di bus I2C.

---

## 2. Arsitektur A: Alokasi Pin ESP32-S3 (1x MCP23017-E/SO, Tanpa Memori Luar)

Penyimpanan data user dan log (~3,4 MB) ditangani langsung oleh **Internal Flash 16MB** menggunakan partisi LittleFS sebesar 10MB. Sirkuit eksternal flash pada PCB dihapus untuk efisiensi jalur.

### A. Alokasi Port MCP23017-E/SO (Address 0x20)
* **Port A (GPA0 - GPA7) - INPUT & OUTPUT**:
  * `GPA0` - `GPA3`: Input Door Sensor 1, 2, 3, 4 (via Optocoupler TLP291-4).
  * `GPA4` - `GPA5`: Input **Auxiliary Input 1, 2** (via Optocoupler EL817).
  * `GPA6`: Output Kontrol **Buzzer Onboard** (via Driver Transistor).
  * `GPA7`: Output Kontrol **LED AP Mode** (Indikator Hotspot).
* **Port B (GPB0 - GPB7) - OUTPUT FEEDBACK WIEGAND**:
  * `GPB0` - `GPB3`: Output Kontrol LED Wiegand Reader 1, 2, 3, 4 (Active-Low via MOSFET BSS138).
  * `GPB4` - `GPB7`: Output Kontrol Buzzer Wiegand Reader 1, 2, 3, 4 (Active-Low via MOSFET BSS138).

### B. Alokasi Langsung pada ESP32-S3 (Native Pins)
* **4 GPIO**: W5500 Ethernet SPI (MOSI, MISO, SCK, CS). *Reset terhubung ke pin fisik EN (Reset Board), INT dilepas (polling mode).*
* **2 GPIO**: I2C Bus (SDA & SCL) ke MCP23017-E/SO & RTC DS3231SN.
* **4 GPIO**: 4 Relay Lock Utama (Output via Driver ULN2003ADR).
* **4 GPIO**: **4 Input REX** (REX 1, 2, 3, 4 via Optocoupler TLP291-4 - ditaruh di pin native agar ESP32-S3 bisa merespon tombol exit secara instan via interrupt).
* **8 GPIO**: 8 Pin Wiegand Data (wajib native interrupt) dengan alokasi khusus:
  * Reader 1: `GPIO15` (D0), `GPIO16` (D1)
  * Reader 2: `GPIO17` (D0), `GPIO18` (D1)
  * Reader 3: **`GPIO38`** (D0), **`GPIO39`** (D1) *(Dipindahkan dari GPIO19/20 untuk membebaskan port USB Native JTAG/OTG agar bebas konflik)*
  * Reader 4: `GPIO21` (D0), `GPIO22` (D1)
* **1 GPIO**: Tamper Input (via Optocoupler EL817).
* **1 GPIO**: Fire Alarm Input (via Optocoupler EL817).
* **1 GPIO**: Tombol Hotspot.
* *Total Pin ESP32-S3 Terpakai*: **25 GPIO** (Sisa pin longgar, menyisakan 8 pin kosong pada modul).

---

## 3. Arsitektur B: Alokasi Pin ESP32 Klasik (2x MCP23017-E/SO, Memori Luar W25Q128)

Menggunakan modul standar **ESP32-WROOM-32E** (4MB Flash Internal) dan menambahkan chip memori eksternal **Winbond W25Q128 (16MB)** pada PCB untuk menyimpan data user dan log transaksi.

### A. Chip MCP23017-E/SO Pertama (Address 0x20) - Fokus Input & Indikator
* **Port A (GPA0 - GPA7) - INPUT**:
  * `GPA0` - `GPA3`: Input REX 1, 2, 3, 4 (via Optocoupler TLP291-4).
  * `GPA4` - `GPA7`: Input Door Sensor 1, 2, 3, 4 (via Optocoupler TLP291-4).
* **Port B (GPB0 - GPB7) - INPUT & LED**:
  * `GPB0`: Tamper Input.
  * `GPB1`: Fire Alarm Input.
  * `GPB2` - `GPB3`: **Auxiliary Input 1, 2**.
  * `GPB4` - `GPB7`: LED Indikator Status (Software-Controlled).

### B. Chip MCP23017-E/SO Kedua (Address 0x21) - Fokus Output
* **Port A (GPA0 - GPA7) - OUTPUT RELAY & FEEDBACK**:
  * `GPA0` - `GPA3`: Output Kontrol Lock Relay 1, 2, 3, 4 (via ULN2003ADR).
  * `GPA4`: Output Kontrol Buzzer Onboard (via Transistor).
  * `GPA5`: Output Kontrol LED AP Mode.
  * `GPA6` - `GPA7`: Kosong (Cadangan).
* **Port B (GPB0 - GPB7) - OUTPUT FEEDBACK WIEGAND**:
  * `GPB0` - `GPB3`: Output Kontrol LED Wiegand Reader 1, 2, 3, 4 (Active-Low via MOSFET BSS138).
  * `GPB4` - `GPB7`: Output Kontrol Buzzer Wiegand Reader 1, 2, 3, 4 (Active-Low via MOSFET BSS138).

### C. Alokasi Langsung pada ESP32 Klasik (Native Pins)
* **4 GPIO**: W5500 Ethernet SPI (MOSI, MISO, SCK, CS). *Reset ke EN, INT dilepas.*
* **1 GPIO**: **Flash Eksternal W25Q128 (SPI CS)**.
* **2 GPIO**: I2C Bus (SDA, SCL).
* **8 GPIO**: Wiegand Data (D0 & D1 untuk 4 reader).
* **2 GPIO**: Tombol AP & Tombol Boot.
* *Total Pin ESP32 Klasik Terpakai*: **17 GPIO** (Sisa pin sangat longgar).

---

## 4. Deskripsi & Cara Kerja Komponen Utama Board

Setiap blok komponen pada PCB memiliki peran spesifik untuk menjamin sistem access control bekerja secara andal:

### A. Blok Input Sensor (Deteksi Lapangan)
* **REX (Request to Exit) Input**: Dihubungkan ke tombol tekan keluar (*Exit Button*) atau sensor gerak di dalam ruangan. Saat ditekan, sirkuit optokopler menyala -> mengirim sinyal logika Low ke pin native interrupt ESP32 -> memicu pembukaan kunci pintu secara cepat agar user bisa keluar.
* **Door Sensor / Door Contact Input**: Dihubungkan ke sensor magnet (*magnetic reed switch*) pada pintu untuk mendeteksi apakah daun pintu sedang rapat/terbuka. Digunakan untuk mendeteksi alarm pintu dibuka paksa (*forced open*) atau dibiarkan terbuka terlalu lama (*held open*).
* **Tamper Input**: Terhubung ke sakelar batas (*limit/micro switch*) di dalam box casing. Sinyal dikirim ke ESP32 jika casing dibuka paksa untuk mengirim notifikasi sabotase ke server.
* **Fire Alarm Input**: Jalur khusus dari panel pemadam kebakaran gedung. Saat aktif, sirkuit ini langsung memicu pembukaan seluruh pintu (*Failsafe*).
* **Auxiliary Input 1 & 2**: Dua port input serbaguna terisolasi optokopler. Dapat diprogram secara fleksibel melalui software (misal untuk tombol panic button atau sensor banjir lokal).

### B. Blok Wiegand Reader Port (Antarmuka Kartu)
* **Wiegand Data (D0 & D1)**: Menerima transmisi nomor ID kartu dari reader luar pintu dalam bentuk pulsa biner mikrodetik. Menggunakan pin native interrupt ESP32 untuk pembacaan data yang akurat.
* **LED & Buzzer Control**: Dua jalur *active-low* (dikendalikan lewat MOSFET BSS138) yang ditarik ke Ground untuk mengontrol warna lampu (Merah/Hijau) dan bunyi beeper di reader luar sebagai umpan balik visual dan audio bagi pengguna.

### C. Blok Output & Daya (Aktuator & Power)
* **Lock Relays (4 Unit)**: Relay mekanis 10A SPDT (**Songle SRD-12VDC-SL-C**) yang dikendalikan oleh IC Driver **ULN2003ADR** untuk memutus/menyambung aliran listrik ke kunci elektromagnetik pintu (*Magnetic Lock* / *Dropbolt*).
* **Buzzer Onboard**: Mengeluarkan bunyi peringatan (*beep*) di dalam box panel saat sistem mengalami error koneksi LAN, kegagalan booting, tamper box, atau alarm aki lemah.
* **Sirkuit Power Charger & Switchover**: IC **LM317T** membatasi tegangan pengisian aki kering 12V 7Ah di angka 13.8V. Dioda Schottky **SS34** bertindak sebagai saklar pemindah otomatis (0 ms) agar sistem terus menyala menggunakan aki saat listrik PLN padam. Sirkuit LVD (*Low Voltage Disconnect*) memutus aki jika tegangan turun di bawah 10.5V untuk menjaga sel aki dari kerusakan.

---

## 5. Logika Monitoring Status Pintu (Door Sensor State-Machine)

Saat terjadi transaksi akses atau alarm, sirkuit *Door Sensor* (magnetic reed switch) memantau kondisi fisik pintu dalam durasi waktu tunggu tertentu. Berikut adalah status kejadian (*reason code*) terstandardisasi dalam bahasa Inggris yang dikirimkan ke server pusat:

1. **`Valid Access`**:
   * Pengguna melakukan tap kartu sah, kunci terbuka, dan sensor mendeteksi pintu berhasil dibuka fisik sebelum timeout.
2. **`Valid Access - Unopened`**:
   * Pengguna melakukan tap kartu sah, kunci terbuka, tetapi pintu tidak dibuka secara fisik hingga batas waktu `door_open_timeout_s` (10s) habis. Kunci pintu langsung dikunci kembali (*relock*).
3. **`Exit via REX`**:
   * Tombol keluar REX ditekan, kunci terbuka, dan pintu berhasil dibuka secara fisik sebelum timeout.
4. **`Exit REX - Unopened`**:
   * Tombol REX ditekan, kunci terbuka, tetapi pintu tetap tertutup hingga timeout habis.
5. **`Door Forced Open`** (Status: `ALARM`):
   * Sensor mendeteksi pintu terbuka secara fisik tanpa diawali tap kartu sah atau penekanan tombol REX (indikasi pembukaan paksa/sabotase). Memicu alarm buzzer fisik di reader selama 30 detik.
6. **`Door Held Open`** (Status: `ALARM`):
   * Pintu telah dibuka secara sah (via kartu/REX) namun dibiarkan terbuka terus-menerus melebihi batas waktu toleransi `door_held_timeout_s` (30s). Memicu alarm buzzer fisik di reader.


---

## 6. Fleksibilitas & Kustomisasi Auxiliary Input (Dry Contact)

Dua buah port **Auxiliary Input** (Dry Contact terisolasi optokopler) dirancang agar perilakunya dapat disesuaikan secara bebas melalui software konfigurasi:
* **Custom Local Trigger**: Dapat dipetakan untuk membuka pintu tertentu yang dipilih secara lokal (misal: Aux 1 ditekan -> hanya membuka pintu 3, atau membuka pintu 1 dan 2 bersamaan).
* **Cross-Controller Trigger (Lintas Kontroler)**: Dapat dikonfigurasi untuk mengirim perintah jaringan (MQTT/Websocket) ke board access control lain dalam satu LAN untuk membuka pintunya.
* **Panic Button / Break Glass**: Sebagai input darurat dengan prioritas tinggi untuk langsung membuka seluruh pintu evakuasi (*Failsafe*) dan mengirimkan alarm bahaya ke server pemantau.
* **General Input**: Dibaca sebagai status sensor umum seperti sensor banjir ruang server atau detektor suhu ruangan.

---

## 7. Arsitektur Distribusi Daya & Level Shifter Sinyal (Power & Signal Architecture)

Untuk menjamin keandalan operasional,board membagi penyaluran daya (*power distribution*) menjadi **3 Rel Tegangan Utama (12V, 5V, dan 3.3V)** serta mengisolasi sinyal input/output:

```text
Adaptor 12V / Aki 12V 7Ah
          │
          ├──► [Rel 12V DC] ───► Power Kunci Pintu (WET Contact 12V L+/L-) & Charger Aki
          │
          └──► [DC-DC Buck Converter] ──► [Rel 5V DC] ──► Koil Relay, Optocoupler, & Reader VCC
                                                 │
                                                 └──► [LDO 3.3V Regulator] ──► [Rel 3.3V DC]
                                                                                      │
                                                                 ┌────────────────────┴────────────────────┐
                                                                 ▼                                         ▼
                                                         ESP32-S3, W5500,                         VCC Level Shifter
                                                         MCP23017, DS3231                           (74LVC245ADW)
```

### A. Rincian Rel Tegangan Utama
1. **Rel Tegangan 12V DC (Power Utama & Aktuator)**:
   * **Sumber**: Input adaptor luar 12V DC atau Aki Kering (*Sealed Lead Acid*) 12V 7Ah via sirkuit otomatis switchover (Dioda Schottky SS34).
   * **Beban**: Menyuplai catu daya pengunci pintu (*Magnetic Lock* / *Dropbolt*) pada terminal L+/L- (Mode WET Contact), pengisian aki via LM317T (13.8V), dan catu daya RFID Reader luar (12V).
2. **Rel Tegangan 5V DC (Penggerak Relay & Indikator)**:
   * **Sumber**: Diturunkan dari Rel 12V menggunakan **DC-DC Buck Converter 5V** (LM2596 / MP1584).
   * **Beban**: Menyuplai koil relay mekanis 5V/12V (via IC Driver Transistor ULN2003ADR), sirkuit LED indikator, dan port VCC reader 5V.
3. **Rel Tegangan 3.3V DC (Mikrokontroler & Komunikasi)**:
   * **Sumber**: Diturunkan dari Rel 5V menggunakan **LDO Regulator 3.3V** (AMS1117-3.3).
   * **Beban**: Menyuplai mikrokontroler **ESP32-S3-WROOM-1-N16**, chip Ethernet **WIZnet W5500**, I/O Expander **MCP23017**, RTC **DS3231**, serta tegangan referensi VCC IC Level Shifter.

### B. Proteksi & Level Shifter Sinyal Wiegand (D0 & D1)
* **Pengondisian Logika 5V ke 3.3V**: Sinyal masukan D0 dan D1 dari RFID Reader di luar pintu bernilai **5V TTL (5V Logic)**. Sinyal ini diturunkan secara aman menjadi **3.3V** menggunakan IC Buffer **74LVC245ADW** (8-channel buffer 5V-tolerant) yang diberi daya VCC 3.3V sebelum masuk ke GPIO native ESP32-S3.
* **Proteksi Statis (ESD Protection)**: Setiap jalur data D0 dan D1 dilindungi oleh TVS Diode **PESD5V0U1BA** untuk meredam lonjakan listrik statis (ESD) dari lingkungan luar.

---

## 8. Desain Sirkuit Output Relay & Lock Control (Wet/Dry Terminal 2-Pin)

Baut terminal luar untuk kunci pintu tetap menggunakan **2-pin saja** (L+ dan L-). Pemilihan Wet/Dry contact dipindahkan ke dalam board menggunakan jumper header 2x3 per pintu.

### Pemetaan Pin Jumper Header 2x3 (6-Pin)
```text
       COL 1         COL 2          COL 3
     +---------+   +----------+   +-----------+
Row 1| (1) +12V|   | (2) COM  |   | (3) L+    | ---> Ke Pin 1 Terminal luar L+
Row 2| (4) GND |   | (5) NO   |   | (6) L-    | ---> Ke Pin 2 Terminal luar L-
     +---------+   +----------+   +-----------+
```
* **Pin 1**: `+12V DC` (Jalur Daya Utama setelah sekering)
* **Pin 2**: `Relay COM` (Kaki Common Relay)
* **Pin 3**: `Terminal L+` (Pin Output Terminal Luar L+)
* **Pin 4**: `GND` (Ground Board)
* **Pin 5**: `Relay NO` (Kaki Normally Open Relay)
* **Pin 6**: `Terminal L-` (Pin Output Terminal Luar L-)

#### Konfigurasi Jumper Shunt:
1. **WET CONTACT (Mengeluarkan Tegangan 12V)**:
   * Jumper dipasang horisontal menghubungkan **Pin [1-2]**, **Pin [3-5]**, dan **Pin [4-6]**.
   * *Hasil*: Terminal luar L+ mengeluarkan 12V (saat relay aktif) dan L- terhubung ke Ground.
2. **DRY CONTACT (Kontak Kering - Sakelar Murni)**:
   * Jumper dipasang horisontal menghubungkan **Pin [2-3]** dan **Pin [5-6]**.
   * *Hasil*: Terminal luar L+ menjadi kaki COM dan L- menjadi kaki NO relay. Bebas tegangan.

---

## 9. Sistem LED Indikator & Komponen Bertipe SMD (Surface Mount Device)

Seluruh lampu indikator LED dan komponen pasif dirancang menggunakan tipe komponen **SMD (Surface Mount Device)** dengan paket ukuran **0805** atau **0603** (sangat mudah dirakit secara otomatis).

### A. Alasan Jumlah LED Indikator Daya (3 Unit)
Kami menyediakan 3 lampu LED SMD terpisah untuk masing-masing rel tegangan guna membantu proses pencarian masalah (*troubleshooting*) daya secara instan:
1. **LED Daya 12V** (Paket: **SMD 0805 - Warna Merah**): Menandakan daya 12V dari adaptor luar atau baterai masuk secara fisik ke board.
2. **LED Daya 5V** (Paket: **SMD 0805 - Warna Kuning**): Menandakan output chip DC-DC Buck Converter regulator 5V berfungsi. Listrik 5V ini menyuplai koil relay dan port reader Wiegand.
3. **LED Daya 3.3V** (Paket: **SMD 0805 - Warna Hijau**): Menandakan output LDO regulator 3.3V aktif. Listrik 3.3V ini menyuplai daya ke chip ESP32-S3 dan W5500 Ethernet.

### B. Alokasi LED Indikator Lainnya
* **LED Status Relay Lock 1 - 4** (Paket: **SMD 0805 - Warna Hijau - 4 Unit**): Menunjukkan relay lock mana yang sedang terpicu.
* **LED Status Input REX 1 - 4** (Paket: **SMD 0805 - Warna Biru - 4 Unit**): Menunjukkan tombol keluar pintu mana yang sedang ditekan.
* **LED Status Door Sensor 1 - 4** (Paket: **SMD 0805 - Warna Kuning - 4 Unit**): Mendeteksi pintu mana yang sedang terbuka fisiknya.
* **LED AP Mode** (Paket: **SMD 0805 - Warna Biru - 1 Unit**): Indikator status pancaran sinyal WiFi hotspot.

### C. Alasan Jumlah LED Konektor Ethernet (2 Unit)
Dua buah LED indikator jaringan LAN tidak dipasang terpisah pada PCB, melainkan sudah terintegrasi secara fisik di dalam bodi logam konektor **RJ45 Magjack HanRun HR911105A**:
1. **LED Link** (Warna **Hijau**): Menyala konstan menandakan board terhubung secara fisik ke perangkat jaringan.
2. **LED Activity** (Warna **Kuning**): Berkedip cepat saat terjadi proses transfer paket data masuk atau keluar.

---

## 10. Analisis Biaya Komponen Utama (BOM Cost) - Kurs Rp 16.000/USD

Tabel estimasi biaya komponen utama per board untuk perbandingan opsi arsitektur board:

### A. Perbandingan Harga Satuan Komponen Utama

| Nama Komponen | Kode Part Number | Harga Grosir China (Bulk 1K+) | Harga Eceran Lokal (Tokopedia/Shopee) |
| :--- | :--- | :--- | :--- |
| **ESP32-S3 Module** | ESP32-S3-WROOM-1-N16 | ~$2.40 (Rp 38.400) | Rp 65.000 – Rp 70.000,- |
| **ESP32 Classic Module**| ESP32-WROOM-32E | ~$1.15 (Rp 18.400) | Rp 25.000 – Rp 35.000,- |
| **IC IO Expander** | MCP23017-E/SO | ~$0.65 (Rp 10.400) | Rp 18.000 – Rp 25.000,- |
| **IC SPI Flash (16MB)** | Winbond W25Q128JVSSIQ | ~$0.30 (Rp 4.800) | Rp 7.000 – Rp 9.000,- |
| **Relay Kunci Pintu** | Songle SRD-12VDC-SL-C | ~$0.20 (Rp 3.200) | Rp 5.000,- (per unit) |
| **IC Ethernet Controller**| WIZnet W5500 | ~$1.20 (Rp 19.200) | Rp 25.000 – Rp 28.000,- |
| **IC Real-Time Clock** | DS3231SN# | ~$1.20 (Rp 19.200) | Rp 22.000 – Rp 25.000,- |

---

### B. Perbandingan Total Biaya Utama Board (BOM System)

#### Skala Produksi Massal (Grosir Impor)
* **Opsi A: Board ESP32-S3 (N16 Internal, Tanpa Flash Luar) + 1x MCP23017**
  * Modul ESP32-S3 (N16): Rp 38.400,-
  * 1x IC MCP23017: Rp 10.400,-
  * 4x Relay Songle SRD-12VDC-SL-C: Rp 12.800,-
  * Level Shifter (74LVC245) + W5500 + Power/RTC + Connectors & Passives: Rp 155.480,-
  * **Total Biaya Board Lengkap: Rp 217.080,-**
* **Opsi B: Board ESP32 Klasik (4MB Internal) + W25Q128 (16MB Luar) + 2x MCP23017 + CH340C**
  * Modul ESP32 Klasik (4MB): Rp 18.400,-
  * Chip USB-to-UART (CH340C): Rp 6.400,-
  * 2x IC MCP23017: Rp 20.800,-
  * IC SPI Flash W25Q128 (16MB): Rp 4.800,-
  * 4x Relay Songle SRD-12VDC-SL-C: Rp 12.800,-
  * W5500 + RJ45 + RTC + Power/RTC + Connectors & Passives: Rp 155.480,-
  * **Total Biaya Board Lengkap: Rp 218.680,-**

#### Skala Pembuatan Prototype (Eceran Lokal)
* **Opsi A: Board ESP32-S3 + 1x MCP23017**
  * Modul ESP32-S3 (N16): Rp 65.000,-
  * 1x IC MCP23017: Rp 20.000,-
  * 4x Relay Songle SRD-12VDC-SL-C: Rp 20.000,-
  * Level Shifter + W5500 + Power/RTC + Connectors & Passives: Rp 209.500,-
  * **Total Biaya Pembuatan Prototype: Rp 314.500,-**
* **Opsi B: Board ESP32 Klasik + W25Q128 + 2x MCP23017 + CH340C**
  * Modul ESP32 Klasik (4MB): Rp 30.000,-
  * Chip USB-to-UART (CH340C): Rp 10.000,-
  * 2x IC MCP23017: Rp 40.000,-
  * IC SPI Flash W25Q128 (16MB): Rp 8.000,-
  * 4x Relay Songle SRD-12VDC-SL-C: Rp 20.000,-
  * W5500 + RJ45 + RTC + Power/RTC + Connectors & Passives: Rp 209.500,-
  * **Total Biaya Pembuatan Prototype: Rp 317.500,-**

---

## 11. Faktor Efisiensi Finansial Tambahan pada PCB

1. **Penyusutan Ukuran PCB & Kompleksitas Jalur (Opsi ESP32-S3)**: Karena Opsi ESP32-S3 hanya menggunakan **1 chip MCP23017** (dibandingkan Opsi Klasik yang memakai 2 expander) dan **tidak memerlukan chip Flash eksternal serta chip CH340C** di PCB, ukuran board ESP32-S3 menjadi jauh lebih ringkas, menghemat biaya cetak PCB dan biaya SMT assembly mesin di pabrik.
2. **Kesimpulan Harga Total Akhir**:
   * Pada skala grosir, **Opsi ESP32-S3 justru sedikit lebih murah (Rp 217.080,- vs Rp 218.680,-)** dan menawarkan keandalan sirkuit yang jauh lebih tinggi.
   * Pada skala eceran lokal, **Opsi ESP32-S3 juga lebih murah (Rp 314.500,- vs Rp 317.500,-)**.
