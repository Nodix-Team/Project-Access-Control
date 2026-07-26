# Proposal Rancangan Board Access Control 4-Pintu (Grade Industri)

> [!WARNING]
> **DOKUMEN PROPOSAL OUTDATED:** Dokumen ini bersifat historis/proposal awal. Beberapa alokasi pin GPIO (seperti Relay 1-2, Watchdog, dan Reader 4) telah dipindahkan demi keandalan sirkuit.
> Skema hardware final siap cetak wajib merujuk ke dokumen **[`docs/KEPUTUSAN_ARSITEKTUR_v0.3.md`](KEPUTUSAN_ARSITEKTUR_v0.3.md) §1 & §2**.

**Ditujukan Untuk: Bapak Rizal**  
**Penyusun: Tim Technical Engineering**  
**Tanggal Dokumen: 21 Juli 2026 (Revisi Final: 22 Juli 2026 - Production Grade)**  

---

## Ringkasan Dokumen
Dokumen ini merupakan proposal spesifikasi teknis dan analisis biaya rancangan board access control 4-pintu siap produksi berbasis mikrokontroler ESP32-S3. Proposal ini memuat perbandingan arsitektur, skema alokasi pin, arsitektur distribusi daya 3-rel, sirkuit proteksi *field wiring* industri, serta penanganan keselamatan (*safety-critical hardware interlock*).

---

## 1. Pemilihan Microcontroller & Arsitektur IO Expander

Untuk mendukung 4 pintu lengkap dengan **2 Auxiliary Input (Dry Contact)**, **Tamper Input**, **Fire Input**, **Onboard Buzzer**, **Line Supervision (EOL)**, serta **kontrol LED/Buzzer Reader Wiegand**, total kebutuhan I/O adalah **43 pin**.

* **ESP32-S3 (WROOM-1/1U)**: Menggunakan varian **ESP32-S3-WROOM-1-N16** (16MB Flash Internal, tanpa PSRAM). Menggunakan **1 chip IO Expander MCP23017-E/SO** di bus I2C (dengan jalur interrupt `INTA` ke `GPIO34`) untuk mengalihkan indikator LED, buzzer, dan door sensor.
* **ESP32 Klasik (WROOM-32)**: Menggunakan modul standar **ESP32-WROOM-32E** (4MB Flash Internal) dengan 2 chip IO Expander MCP23017-E/SO.

---

## 2. Arsitektur A: Alokasi Pin ESP32-S3 (1x MCP23017-E/SO, Tanpa Memori Luar)

Penyimpanan data user dan log (~3,4 MB) ditangani langsung oleh **Internal Flash 16MB** menggunakan partisi LittleFS sebesar 10MB. Sirkuit eksternal flash pada PCB dihapus untuk efisiensi jalur.

### A. Alokasi Port MCP23017-E/SO (Address 0x20)
* **Port A (GPA0 - GPA7) - INPUT & OUTPUT**:
  * `GPA0` - `GPA3`: Input Door Sensor 1, 2, 3, 4 (via Optocoupler TLP291-4 & EOL Supervision).
  * `GPA4` - `GPA5`: Input **Auxiliary Input 1, 2** (via Optocoupler EL817).
  * `GPA6`: Output Kontrol **Buzzer Onboard** (via Driver Transistor).
  * `GPA7`: Output Kontrol **LED AP Mode** (Indikator Hotspot).
* **Port B (GPB0 - GPB7) - OUTPUT FEEDBACK WIEGAND**:
  * `GPB0` - `GPB3`: Output Kontrol LED Wiegand Reader 1, 2, 3, 4 (Active-Low via MOSFET BSS138).
  * `GPB4` - `GPB7`: Output Kontrol Buzzer Wiegand Reader 1, 2, 3, 4 (Active-Low via MOSFET BSS138).

### B. Alokasi Langsung pada ESP32-S3 (Native Pins)
* **4 GPIO**: W5500 Ethernet SPI (`GPIO11` MOSI, `GPIO13` MISO, `GPIO12` SCK, `GPIO10` CS).
* **2 GPIO**: I2C Bus (`GPIO8` SDA & `GPIO9` SCL) ke MCP23017-E/SO & RTC DS3231SN.
* **4 GPIO**: 4 Relay Lock Utama (`GPIO1`–`GPIO4` via Driver ULN2003ADR).
* **4 GPIO**: **4 Input REX** (`GPIO5`–`GPIO7`, `GPIO14` via Optocoupler TLP291-4 & TVS Protection).
* **8 GPIO**: 8 Pin Wiegand Data (Native Interrupt & Level Shifter 74LVC245ADW):
  * Reader 1: `GPIO15` (D0), `GPIO16` (D1)
  * Reader 2: `GPIO17` (D0), `GPIO18` (D1)
  * Reader 3: `GPIO38` (D0), `GPIO39` (D1) *(Bebas Konflik USB Native)*
  * Reader 4: `GPIO21` (D0), `GPIO22` (D1)
* **2 GPIO (ADC1)**: `GPIO1` (Sensing Tegangan Adaptor PLN 12V) & `GPIO2` (Sensing Tegangan Aki 12V via Voltage Divider).
* **1 GPIO**: `GPIO34` (MCP23017 `INTA` Hardware Interrupt & External Watchdog WDI Kick).
* **1 GPIO**: `GPIO35` Tamper Input (via Optocoupler EL817).
* **1 GPIO**: `GPIO36` Fire Alarm Input (via Optocoupler EL817 & Hardware Interlock).
* **1 GPIO**: `GPIO37` Tombol Fungsi Lokal.
* *Total Pin ESP32-S3 Terpakai*: **27 GPIO** (Masih tersisa 7 GPIO longgar).

---

## 3. Arsitektur B: Alokasi Pin ESP32 Klasik (2x MCP23017-E/SO, Memori Luar W25Q128)

Menggunakan modul **ESP32-WROOM-32E** (4MB Flash Internal) dan memori eksternal **Winbond W25Q128 (16MB)** pada PCB.

### A. Chip MCP23017-E/SO Pertama (Address 0x20)
* `GPA0` - `GPA3`: Input REX 1–4.
* `GPA4` - `GPA7`: Input Door Sensor 1–4.
* `GPB0` - `GPB3`: Tamper, Fire Alarm, Aux 1, Aux 2.
* `GPB4` - `GPB7`: LED Indikator Status.

### B. Chip MCP23017-E/SO Kedua (Address 0x21)
* `GPA0` - `GPA3`: Output Lock Relay 1–4 (via ULN2003ADR).
* `GPB0` - `GPB7`: Output LED & Buzzer Reader 1–4.

---

## 4. Deskripsi & Cara Kerja Komponen Utama Board (Grade Industri)

### A. Blok Input Sensor & Fire Release Interlock
* **Hardware Fire Release Interlock (Safety-Critical)**: Sinyal masukan Fire Alarm tidak hanya dibaca oleh `GPIO36` ESP32-S3, tetapi secara langsung memutus VCC +12V Relay/Lock secara fisik melalui P-Channel Power MOSFET interlock terpisah. Jika ESP32 hang/crash saat kebakaran, pintu dipastikan **otomatis terbuka (Failsafe Cut-Off)** tanpa menunggu software.
* **Line Supervision (EOL Resistors)**: Menggunakan Dual Resistor 2.2kΩ pada jalur Door Sensor & Tamper untuk membedakan 4 kondisi kabel: *Normal*, *Alarm*, *Short-Circuit*, dan *Kabel Dipotong (Open)*.
* **REX & Aux Inputs**: Dilengkapi resistor seri 220Ω + Dioda TVS PESD5V0U1BA pada tiap terminal sebelum optokopler.

### B. Blok Output Relay & Proteksi Snubber Induktif
* **Lock Relays (4 Unit)**: Relay mekanis **Songle SRD-12VDC-SL-C** (koil 12V disuplai dari Rel 12V dikendalikan IC ULN2003ADR).
* **Snubber & Flyback Lock Output**: Kontak relay `L+`/`L-` yang mengendalikan beban induktif pengunci (Magnetic Lock / Dropbolt) dilindungi oleh **Dioda Flyback Fast-Recovery 1N4007/SS14** + **MOV 14D390K** melintang di terminal output untuk mencegah lonjakan back-EMF (*contact welding*).
* **External Watchdog IC (TPS3823-33)**: IC Watchdog eksternal SOT-23 terhubung ke `GPIO34`. Jika firmware hang >1.6 detik, IC Watchdog menarik pin `RESET` ESP32 ke LOW dan mematikan ULN2003 (`ENABLE` pin) agar relay kembali ke posisi aman.

---

## 5. Arsitektur Distribusi Daya & Proteksi Listrik (3-Rail Power System)

```text
Adaptor 12V / Aki 12V 7Ah (Reverse Polarity P-MOSFET AO4407A + TVS SMBJ15CA + Fuse 5A)
          │
          ├──► [Rel 12V DC] ───► Power Kunci Pintu (WET 12V), Charger Aki (CN3768), & Koil Relay SRD-12V
          │
          └──► [DC-DC Buck Converter 5V] ──► [Rel 5V DC] ──► PTC Fuse 500mA per Reader VCC & Optocoupler
                                                 │
                                                 └──► [DC-DC Buck 3.3V MP2315] ──► [Rel 3.3V DC]
                                                                                          │
                                                                     ┌────────────────────┴────────────────────┐
                                                                     ▼                                         ▼
                                                             ESP32-S3, W5500,                         VCC Level Shifter
                                                             MCP23017, DS3231                           (74LVC245ADW)
```

### A. Rincian Rel Tegangan Utama
1. **Rel Tegangan 12V DC (Power Utama & Aktuator)**:
   * **Proteksi Input**: P-Channel Power MOSFET (**AO4407A**) sebagai pelindung balik polaritas (*Reverse Polarity*), TVS Diode **SMBJ15CA**, MOV **14D220K**, serta Resettable PTC Fuse **5A (SMD 2920)**.
   * **Beban**: Koil relay 12V, Magnetic Lock WET contact (+12V L+/L-), dan Dedicated SLA Battery Charger IC (**CN3768** 3-stage charge + kompensasi suhu).
2. **Rel Tegangan 5V DC (Penggerak Reader & Indikator)**:
   * **Sumber**: Diturunkan dari Rel 12V menggunakan **DC-DC Buck Converter 5V** (LM2596 / MP1584).
   * **Beban & Proteksi**: Menyuplai VCC Reader RFID 1–4 yang masing-masing dilindungi **PolySwitch PTC Fuse 500mA (SMD 1812L050PR)** per jalur port.
3. **Rel Tegangan 3.3V DC (Mikrokontroler & Komunikasi)**:
   * **Sumber**: Diturunkan dari Rel 5V menggunakan **DC-DC Synchronous Buck Converter 3.3V (MP2315 / SY8089)** dengan efisiensi >90% (mengganti LDO linear agar bebas panas berlebih saat WiFi TX peak 500mA + W5500 150mA).
   * **Beban**: ESP32-S3, W5500 Ethernet, MCP23017, RTC DS3231SN, dan VCC IC 74LVC245ADW.

### B. Proteksi Sinyal Wiegand & Port USB
* **Level Shifter 5V → 3.3V**: Sinyal D0/D1 5V TTL dari reader luar diturunkan ke 3.3V via IC Buffer **74LVC245ADW** (VCC 3.3V) dan dilindungi TVS Diode **PESD5V0U1BA**.
* **Proteksi ESD USB Native**: Port USB Native ESP32-S3 dilindungi IC ESD khusus **USBLC6-2SC6** pada jalur D+ dan D-.
* **Bob Smith Termination RJ45**: Port Ethernet RJ45 dilindungi terminasi Bob Smith (4x R 75Ω + C 2kV 1nF) yang dihubungkan ke Chassis Earth Ground untuk kelulusan uji EMC/EMI.
### C. Sirkuit Sensing Tegangan Input Daya 12V (Deteksi POWER_NORMAL & POWER_LOW)
1. **Dua Terminal Input Daya Utama (+12V & GND)**:
   * Board controller hanya menerima 2 baut input daya utama **`+12V`** dan **`GND`**. Fungsi pengisian baterai dan pemindahan baterai cadangan ditangani secara terpisah oleh **External Access Control Power Supply Unit (PSU 12V 5A / Smart UPS)**. Suku cadang charger internal CN3768 ditiadakan dari PCB untuk menghemat ruang board.
2. **Rangkaian Hardware Pembagi Tegangan ADC (`GPIO2`)**:
   * Tegangan Rel 12V utama dibaca oleh **`GPIO2`** (ADC Internal ESP32-S3) via pembagi tegangan $R_1=100\text{ k}\Omega$ / $R_2=10\text{ k}\Omega$ (Faktor skala $\frac{1}{11}$, aman untuk kisaran 0–3.3V ADC), dilindungi TVS Diode `PESD5V0U1BA`.
3. **Logika 2 Parameter Status Catu Daya (Simple Threshold)**:
   * **$V_{\text{IN}} \ge 11.5\text{V}$**: 🟢 **`POWER_NORMAL`** (Listrik PLN hidup dari PSU 12V atau Baterai Backup eksternal terisi penuh).
   * **$V_{\text{IN}} < 11.5\text{V}$**: 🔴 **`POWER_LOW`** (Listrik PLN mati dan Baterai Backup eksternal di PSU melemah di bawah 11.5V, memicu alarm log MQTT `POWER_LOW` ke server).

---

## 6. Desain Sirkuit Output Relay & Selektor Terminal Pintu (Single Jumper WET/DRY & Terminal NO/NC/COM)

Untuk efisiensi PCB dan kemudahan instalasi 100% di lapangan, tiap output pintu (Pintu 1–4) dilengkapi **Terminal Block Screw 3-Pin (`NO`, `NC`, `COM/GND`)** dan **1 buah Header Jumper `JP_MODE` (WET vs DRY)**:

```text
               ┌─────────────────────────────────────────────────────────────┐
               │           TERMINAL SCREW BLOCK PINTU (3-PIN)                │
               │                                                             │
               │        [  NO  ]           [  NC  ]        [  COM / GND  ]   │
               │    (Normally Open)    (Normally Closed)   (Common / Ground) │
               └───────────┬───────────────────┬────────────────────┬────────┘
                           │                   │                    │
                           ▼                   ▼                    ▼
                    Electric Strike /   Magnetic Lock /        Return Ground (WET)
                    Barrier Gate (DRY)  Dropbolt 12V (WET)    atau Common (DRY)
```

### A. Satu Selektor Jumper Mode di PCB (`JP_MODE` per Pintu 1–4)
* **[Mode WET] (Header Pin 1-2)**:
  * Terminal **`NO`** ➔ Berfungsi sebagai **NO (+12V Active-HIGH)** untuk *Electric Strike*.
  * Terminal **`NC`** ➔ Berfungsi sebagai **NC (+12V Active-LOW)** untuk *Magnetic Lock / Dropbolt*.
  * Terminal **`COM/GND`** ➔ Berfungsi sebagai **Ground 0V Power Return**.
* **[Mode DRY] (Header Pin 2-3)**:
  * Terminal **`NO`** ➔ Berfungsi sebagai **NO (Dry Normally Open)** untuk *Barrier Gate / Sliding Door*.
  * Terminal **`NC`** ➔ Berfungsi sebagai **NC (Dry Normally Closed)** untuk *Power Supply Eksternal*.
  * Terminal **`COM/GND`** ➔ Berfungsi sebagai **Dry Common (Potential-Free)**.

### B. Pengabelan Terminal Screw 3-Pin oleh Teknisi Lapangan
1. **Magnetic Lock 12V (Mode WET)**: Jumper `WET`. Colok Kabel `+` ke **`NC`**, Kabel `-` ke **`COM/GND`**.
2. **Electric Strike 12V (Mode WET)**: Jumper `WET`. Colok Kabel `+` ke **`NO`**, Kabel `-` ke **`COM/GND`**.
3. **Barrier Gate / Sliding Door (Mode DRY NO)**: Jumper `DRY`. Colok Kabel 1 ke **`COM/GND`**, Kabel 2 ke **`NO`**.
4. **External Power Maglock (Mode DRY NC)**: Jumper `DRY`. Colok Kabel 1 ke **`COM/GND`**, Kabel 2 ke **`NC`**.

---

## 7. Sistem LED Indikator & Manufaktur Massal (Test Point Jig)

### A. Indikator LED SMD (0805)
* **LED Daya**: 12V (Merah), 5V (Kuning), 3.3V (Hijau).
* **LED Status**: Relay 1–4 (Hijau), REX 1–4 (Biru), Door Sensor 1–4 (Kuning), AP Mode (Biru).

### C. Pemeliharaan Lapangan: Web Config Local, System Status, Test Output, & OTA Update
* **Aturan Jaringan Communication Role**: **Ethernet W5500 SPI adalah SATU-SATUNYA jalur komunikasi MQTT & Backend Server**. Fitur WiFi **TIDAK DIGUNAKAN UNTUK TRAFIK MQTT**, dan hanya difungsikan secara terisolasi sebagai WiFi Hotspot AP Lokal saat tombol **`GPIO37`** ditekan untuk kebutuhan diagnosa Web Config Port 8081 teknisi.
* **Portal Web Config Local (Port 8081)**: Dapat diakses via **Ethernet LAN W5500** maupun **WiFi Hotspot AP (GPIO37)**. Menyediakan:
  * **Tab System Status & Hardware Health**: Menampilkan **Jumlah User Terdaftar (`total_users`)**, status memori Flash 16MB (LittleFS 10MB), Free Heap RAM, status Link Ethernet W5500, MAC Address, Uptime RTC DS3231, serta *health check* IC peripheral (MCP23017, DS3231, W5500).
  * **Tab Konfigurasi Jaringan & Broker MQTT**: Pengaturan IP/DHCP dan kredensial EMQX Broker *(Parameter spesifik pintu `dX_` dikelola terpusat dari Web Dashboard Frontend)*.
  * **Tab Test Output**: Tombol manual uji coba Relay Lock Pintu 1–4 untuk mempermudah teknisi di lapangan tanpa tap kartu.
  * **Tab Web Serial Monitor Live** (`/ws/serial`) & **Tab Firmware Upgrade** (HTTP OTA).
* **Dual-Network OTA Update**: Mendukung pembaruan firmware Over-The-Air (`firmware.bin`) baik melalui koneksi **W5500 Ethernet SPI** maupun **WiFi Hotspot AP (GPIO37)**. Dilengkapi mekanisme *Safe OTA Rollback* otomatis ke partisi pabrik jika firmware baru mengalami crash.

---

## 8. Analisis Biaya Komponen Utama (BOM Cost) - Grade Industri

| Nama Komponen | Kode Part Number | Harga Grosir China (Bulk 1K+) | Keterangan Proteksi / Fitur |
| :--- | :--- | :--- | :--- |
| **ESP32-S3 Module** | ESP32-S3-WROOM-1-N16 | ~$2.40 (Rp 38.400) | 16MB Flash Internal |
| **IC IO Expander** | MCP23017-E/SO | ~$0.65 (Rp 10.400) | Bus I2C + INTA Interrupt (`GPIO34`) |
| **Relay Kunci Pintu** | Songle SRD-12VDC-SL-C | ~$0.20 (Rp 3.200) | Koil 12V + Dioda 1N4007 + MOV 14D390K |
| **IC Ethernet** | WIZnet W5500 | ~$1.20 (Rp 19.200) | SPI Bus + Bob Smith RJ45 |
| **IC RTC + Battery** | DS3231SN# + CR2032 Holder | ~$1.35 (Rp 21.600) | Backup Baterai Koin |
| **DC-DC Buck 3.3V** | MP2315 / SY8089 | ~$0.45 (Rp 7.200) | Efisiensi >90% (Mengganti LDO) |
| **Dedicated SLA Charger**| CN3768 | ~$0.70 (Rp 11.200) | 3-Stage Smart Charger SLA 12V |
| **Watchdog IC** | TPS3823-33DBVR | ~$0.30 (Rp 4.800) | HW Reset + ULN2003 Disable |
| **Reverse Polarity** | P-MOSFET AO4407A | ~$0.15 (Rp 2.400) | Protection Input +12V |
| **ESD & TVS Protection** | TVS SMBJ15CA + USBLC6 + PESD5V | ~$0.60 (Rp 9.600) | Proteksi Lapangan & USB Native |
| **Total Estimasi BOM Board Complete** | **Production-Grade v0.3** | **~$9.50 (Rp 152.000)** | **Siap Produksi Massal Industri** |

---

## 9. Kesimpulan Akhir
Dengan pengintegrasian **19 Poin Proteksi & Safety Grade-Industri** ini, board access control ESP32-S3 v0.3 siap diproduksi secara massal dengan ketahanan tinggi terhadap lonjakan listrik, kegagalan sistem, benturan induktif pengunci pintu, serta memenuhi standar keselamatan kebakaran gedung (*Life-Safety Compliant*).
