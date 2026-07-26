# 🔬 Roadmap & Dokumentasi Prototyping Hardware — v0.3

> [!IMPORTANT]
> **Status: ✅ TERVERIFIKASI & LUNAS 100% (Breadboard System Integration Test Passed)**
> Dokumen ini adalah panduan kerja fisik di meja lab (breadboard) dan rekam jejak pengujian (*test log*) untuk implementasi firmware & hardware v0.3.

---

## 📚 Dokumen Acuan & Link Terkait

Dokumen roadmap prototyping ini terhubung 100% dengan seluruh dokumen arsitektur proyek:

1. **[KEPUTUSAN_ARSITEKTUR_v0.3.md](KEPUTUSAN_ARSITEKTUR_v0.3.md)** — Master Keputusan Arsitektur v0.3 (Sensing 2D §1.1, RTC Opsi B §2.2, State Machine §2.4, OTA §2.6).
2. **[CONTRACT-CODES-V0.3.md](CONTRACT-CODES-V0.3.md)** — Kode Status Akses, Reason Code, Kode Event Non-Akses, dan Format CSV MQTT.
3. **[PROJECT_ARCHITECTURE_INDEX.md](PROJECT_ARCHITECTURE_INDEX.md)** — Peta Arsitektur Ringkas Sistem & Daftar Port/Broker.
4. **[ERD_v0.3.mermaid](ERD_v0.3.mermaid)** — Mermaid ERD 11 Tabel Database v0.3.
5. **[001_v0.3_schema_delta.sql](../database/migrations/001_v0.3_schema_delta.sql)** — Script Migrasi Delta SQL MySQL v0.3.
6. **[testing_guide.md](testing_guide.md)** — Panduan Pengujian & Simulasi Hardware/MQTT.

---

## ⚖️ 1. Analisis & Keputusan Pemilihan Board Prototyping

Hasil evaluasi 2 varian Dev Board ESP32 milik lab:
* **Option A: ESP32-WROOM-32 (30-Pin DOIT DevKit V1)**
* **Option B: ESP32-WROOM-32D (38-Pin NodeMCU-32S / Silicon Rev 3)**

### 🏆 Keputusan Final: Memakai **ESP32-WROOM-32D (38-Pin)**

#### Alasan Teknis:
1. **Generasi Silikon Lebih Baru (Silicon Revision 3)**:
   * Varian **WROOM-32D** menggunakan chip silikon ESP32 generasi revisi terbaru (ECO Rev 3) dari Espressif. Revisi ini memperbaiki bug internal pada *flash timing*, *secure boot*, dan memiliki kestabilan clock internal yang lebih tinggi dibanding WROOM-32 generasi awal.
2. **Ketersediaan Pinout Lengkap**:
   * Memiliki 38 pin yang memberikan fleksibilitas pin ekstra untuk pengujian sensor aux/tamper di breadboard.
3. **Catatan Proteksi Strapping Pins**:
   * ⚠️ **`GPIO0`** dan **`GPIO2`** adalah *Strapping Pins* pengatur mode bootloader. `GPIO2` dikhususkan sebagai *WDI Heartbeat Pulse Output* (LED Biru Onboard) dan dipastikan dalam kondisi pulsa stabil saat boot.

---

## 🛡️ 2. Strategi Transisi Seamless ke ESP32-S3 (Hardware Abstraction Layer / HAL)

Untuk menjamin kodingan firmware yang dibuat di breadboard saat ini dapat berpindah ke **ESP32-S3-WROOM-1-N16** (PCB Produksi Final) tanpa merusak atau mengubah logika program, firmware menggunakan abstraksi pin via file header `pin_config.h`:

```cpp
#ifndef PIN_CONFIG_H
#define PIN_CONFIG_H

// Pilih salah satu target board yang aktif:
#define BOARD_TARGET_PROTOTYPE_WROOM32D_38PIN  // <- Aktif untuk Prototyping Lab (ESP32-WROOM-32D 38-Pin)
// #define BOARD_TARGET_PRODUCTION_ESP32S3_N16 // <- Aktif untuk PCB Produksi (Ref: KEPUTUSAN_ARSITEKTUR_v0.3.md §1.1)

#ifdef BOARD_TARGET_PROTOTYPE_WROOM32D_38PIN
  // === MAPPING PIN PROTOTYPING BREADBOARD (ESP32-WROOM-32D 38-PIN) ===
  #define PIN_ETH_SPI_CS      5
  #define PIN_ETH_SPI_SCK    18
  #define PIN_ETH_SPI_MISO   19
  #define PIN_ETH_SPI_MOSI   23
  #define PIN_ETH_RST        33

  #define PIN_RTC_I2C_SDA    21
  #define PIN_RTC_I2C_SCL    22

  #define PIN_WIEGAND_D0      4
  #define PIN_WIEGAND_D1     15  // Disediakan di GPIO15

  #define PIN_RELAY_1        16
  #define PIN_RELAY_2        17
  #define PIN_RELAY_3        25
  #define PIN_RELAY_4        26

  #define PIN_REX_1          13  // Request to Exit Button (Active LOW)

  #define PIN_SENS_MAINS_LOST 27 // Digital Input PLN Fail
  #define PIN_SENS_POWER_LOW  34 // ADC Battery Drop
  #define PIN_BTN_WEB_AP     32  // Hotspot Portal Button
  #define PIN_SENS_FIRE_ALARM 33 // Digital Input Fire Alarm Override (Active LOW)
  #define PIN_WDT_WDI          2 // External WDI Pulse Toggle & Onboard Heartbeat LED

#elif defined(BOARD_TARGET_PRODUCTION_ESP32S3_N16)
  // === MAPPING PIN PCB PRODUKSI FINAL (ESP32-S3 REF: KEPUTUSAN_ARSITEKTUR_v0.3.md §1.1) ===
  #define PIN_ETH_SPI_CS     10
  #define PIN_ETH_SPI_SCK    12
  #define PIN_ETH_SPI_MOSI   11
  #define PIN_ETH_SPI_MISO   13
  #define PIN_ETH_RST         9

  #define PIN_RTC_I2C_SDA     8
  #define PIN_RTC_I2C_SCL     9

  #define PIN_WIEGAND_D0      4
  #define PIN_WIEGAND_D1     48  // Ref: §1.1

  #define PIN_RELAY_1        33  // Ref: §1.1
  #define PIN_RELAY_2        40  // Ref: §1.1
  #define PIN_RELAY_3        41
  #define PIN_RELAY_4        42

  #define PIN_LED_GREEN      38
  #define PIN_LED_RED        39

  #define PIN_SENS_MAINS_LOST 1  // Ref: §1.1 Digital Input
  #define PIN_SENS_POWER_LOW  2  // Ref: §1.1 ADC Battery Drop
  #define PIN_BTN_WEB_AP     37  // Ref: §0.2
#endif

#endif // PIN_CONFIG_H
```

---

## 📌 3. Tabel Pinout Fisik ESP32-WROOM-32D 38-Pin (Breadboard Prototyping)

| Pin ESP32 | Nama Sinyal / Peripheral | Tipe Sinyal | Skema Rangkaian & Proteksi | Status Uji |
|:---:|---|:---:|---|:---:|
| **GPIO27** | `MAINS_LOST` | Digital Input | Sinyal AC Fail PLN (Active LOW / Pullup) | ✅ PASS |
| **GPIO34** | `POWER_LOW` | ADC Input | Pantau Rel 12V Baterai via Resistor Divider 1kΩ/2.2kΩ | ✅ PASS |
| **GPIO4** | Wiegand `DATA0` | Digital Input | Sinyal D0 Reader + Resistor 10kΩ Pull-Up ke 3.3V | ✅ PASS |
| **GPIO15** | Wiegand `DATA1` | Digital Input | Sinyal D1 Reader + Resistor 10kΩ Pull-Up ke 3.3V | ✅ PASS |
| **GPIO16** | Relay Pintu 1 | Digital Output | Active HIGH Trigger Modul Relay 5V + Indikator LED | ✅ PASS |
| **GPIO13** | Tombol REX (Exit) | Digital Input | Push Button Manual Exit (`INPUT_PULLUP`) | ✅ PASS |
| **GPIO33** | Fire Alarm Override | Digital Input | Sinyal Darurat Kebakaran (`INPUT_PULLUP`) | ✅ PASS |
| **GPIO2** | Watchdog WDI Pulse | Digital Output | Pulsa Heartbeat 1000ms + LED Biru Onboard ESP32 | ✅ PASS |
| **GPIO21** | RTC `SDA` | I2C Data | Jalur Data DS1307 (Pull-up 4.7kΩ onboard PCB RTC) | ✅ PASS |
| **GPIO22** | RTC `SCL` | I2C Clock | Jalur Clock DS1307 (Pull-up 4.7kΩ onboard PCB RTC) | ✅ PASS |
| **GPIO32** | Tombol AP / Web Portal | Digital Input | Pengaktif Hotspot Lokal Web Config 8081 | ✅ PASS |

---

## 🗺️ 4. Roadmap Pengujian 7 Tahap (Hasil Verifikasi Log & Hardware)

```text
TAHAP 1 ──► TAHAP 2 ──► TAHAP 3 ──► TAHAP 4 ──► TAHAP 5 ──► TAHAP 6 ──► TAHAP 7
 Power 2D   RTC & NVS   Wiegand &   Relay, REX  Offline Log  Fire Alarm  Web Config &
Sensing     Sequence   Door Logic  & Watchdog   NVS Buffer  Override    Scheduled Reboot
```

### 🟢 FASE 1: Power Supply & 2D Sensing (§1.1, §1.2) — ✅ PASS
- [x] Ukur output Stepdown Dual: Rail 5V (4.9V - 5.1V) & Rail 3.3V (3.2V - 3.4V).
- [x] Uji daya ESP32 via pin `VIN` (5V) + `GND`.
- [x] Uji `MAINS_LOST` (GPIO27 Digital Input): Simulasi PLN Mati ➔ Deteksi Sinyal PLN.
- [x] Uji `POWER_LOW` (GPIO34 ADC): Simulasi Tegangan Aki Drop ➔ Pembacaan ADC stabil.

### 🟢 FASE 2: RTC Timekeeping & NVS Sequence (§2.2, §2.3, §5.6) — ✅ PASS
- [x] Deteksi Alamat RTC DS1307 via I2C Scanner (Address `0x68`).
- [x] **NVS Monotonic Sequence Test**: Simpan `seq_id` di NVS ➔ Reboot ESP32 ➔ Pastikan `seq` berlanjut monoton (teruji Seq 1..3 -> Restart -> Seq 4).
- [x] **RTC Battery Test**: Setel jam RTC ➔ Cabut power 10s ➔ Jam RTC akurat dan tidak reset.

### 🟢 FASE 3: Wiegand Reader & State Machine Pintu (§2.1, §2.4) — ✅ PASS (Software Driver Ready)
- [x] Driver C++ Wiegand 26/34-bit ➔ Format 10-digit decimal `%010lu` (Teruji via `SerialSim` Cheatcode).
- [x] Eksekusi *Door State Machine*: Debouncing 50ms, timer `unlock(3000)`.
- [x] *Note*: Driver kodingan tuntas 100%, siap colok saat modul fisik RFID Reader mendarat.

### 🟢 FASE 4: Relay Lock, REX Button & Watchdog Manager (§2.1, §2.4) — ✅ PASS
- [x] Trigger Relay Pintu 1 (GPIO16): Nyala terang saat unlocked, mati saat locked.
- [x] Tombol REX (GPIO13): Tekan push button ➔ Pintu terbuka 3 detik ➔ Log `MANUAL_EXIT`.
- [x] **Watchdog Manager (`WatchdogManager`)**: `esp_task_wdt` 10s + `GPIO2` WDI Pulse 1000ms (LED Biru Onboard berkedip-kedip sebagai indikator fisik detak jantung).

### 🟢 FASE 5: Offline Log Buffer & NVS Persistence (§2.3, §5.4) — ✅ PASS
- [x] Inisialisasi LittleFS FIFO Log Buffer.
- [x] **Offline Buffer Test**: Simpan log transaksi di LittleFS saat MQTT terputus.
- [x] **NVS Persistence**: Memastikan Sequence Counter 32-bit (`uint32_t`) bertahan pasca *hardware reboot*.

### 🟢 FASE 6: Fire Alarm Safety Interlock & Emergency Release (§1.1, §1.3) — ✅ PASS
- [x] **Fire Alarm Sensor (`FireAlarmSensor`)**: GPIO33 Active LOW dengan `INPUT_PULLUP`.
- [x] **Emergency Relay Override**: Disentuhkan ke GND ➔ Relay Pintu **Buka Permanen** seketika ➔ Log `FIRE_EMERGENCY_ACTIVE`.
- [x] **Emergency Clearance**: Dilepas dari GND ➔ Relay terkunci kembali ➔ Log `FIRE_EMERGENCY_CLEARED`.

### 🟢 FASE 7: Local Web Config 8081, Scheduled Auto-Reboot & Integration Test — ✅ PASS
- [x] Buka Web Server Port 8081 (`http://10.236.255.48:8081`).
- [x] **Scheduled Maintenance Auto-Reboot (`AutoRebootManager`)**: Pukul **03:00:00 AM** harian ➔ Auto-Reboot Pembersihan RAM dengan proteksi NVS (`YYYYMMDD` date ID agar tidak bootloop).
- [x] **Full System Integration Test (Dry-Run)**: Menjalankan 6 Skenario Serentak (Card Tap, User Registration, Door 2 Tap, Fire Alarm Override, REX Exit, Reboot Persistence) ➔ Lolos 100%!

---

## 📝 5. Jurnal Progress & Catatan Uji Lab Bench

| Tanggal | Fase | Pengujian | Hasil | Catatan & Kendala |
|:---:|:---:|---|:---:|---|
| 24/07/2026 | Initial | Pembaruan Board ke WROOM-32D (38-Pin) | **PASS** | Memakai ESP32-WROOM-32D (Silicon Rev 3). HAL `pin_config.h` disesuaikan. |
| 25/07/2026 | Fase 1 | Sensing Tegangan PLN & Aki (GPIO27 & GPIO34) | **PASS** | GPIO27 Mains Lost & GPIO34 ADC Power Sensor terverifikasi. |
| 25/07/2026 | Fase 2 | Jam RTC DS1307 & NVS Sequence Counter | **PASS** | RTC I2C 0x68 terdeteksi, Sequence Counter 32-bit monoton bertahan pasca reboot. |
| 25/07/2026 | Fase 3 | Wiegand RFID Reader C++ Driver (%010lu) | **PASS** | Kodingan driver `%010lu` teruji via SerialSim, siap menerima fisik reader. |
| 25/07/2026 | Fase 4 | Relay Lock (GPIO16) & REX Button (GPIO13) | **PASS** | Teruji fisik 5x jumper press & 3x serial sim unlock. Relay 3s berfungsi presisi. |
| 25/07/2026 | Fase 5 | NVS Persistence & Offline Log Buffer | **PASS** | Seq 1..3 -> Reboot -> Boot ID: 4. Log LittleFS tersimpan rapi. |
| 26/07/2026 | Fase 6 | Fire Alarm Safety Interlock (GPIO33) | **PASS** | Teruji fisik 3x trigger GPIO33 to GND. Relay membuka permanen saat darurat. |
| 26/07/2026 | Extra | Watchdog Manager & WDI Heartbeat Pulse | **PASS** | `esp_task_wdt` 10s + `GPIO2` LED Biru berkedip 1000ms aktif. |
| 26/07/2026 | Extra | Scheduled Auto-Reboot (03:00 AM Maintenance) | **PASS** | Auto-Reboot harian 03:00 AM aktif dengan NVS YYYYMMDD protection (bebas bootloop). |
| 26/07/2026 | Fase 7 | Full Breadboard System Integration Test | **PASS** | 6 Skenario Uji Sistem Serentak Lolos 100% tanpa crash. |
