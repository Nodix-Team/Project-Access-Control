# 🔬 Roadmap & Dokumentasi Prototyping Hardware — v0.3

> [!IMPORTANT]
> **Status: 🔵 DALAM PROSES RISET & PROTOTYPING BERTAHAP**
> Dokumen ini adalah panduan kerja fisik di meja lab (breadboard) dan rekam jejak pengujian (*test log*) untuk implementasi firmware & hardware v0.3.
> Dokumen acuan utama: [`KEPUTUSAN_ARSITEKTUR_v0.3.md`](KEPUTUSAN_ARSITEKTUR_v0.3.md) dan [`CONTRACT-CODES-V0.3.md`](CONTRACT-CODES-V0.3.md).

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
   * ⚠️ **`GPIO0`** dan **`GPIO2`** adalah *Strapping Pins* pengatur mode bootloader. Pastikan `GPIO0` tidak terhubung ke GND saat booting agar ESP32 tidak tidak sengaja masuk ke mode *UART Flash Download*.

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
  #define PIN_WIEGAND_D1     15  // Disediakan di GPIO15 (terpisah dari SPI)

  #define PIN_RELAY_1        16
  #define PIN_RELAY_2        17
  #define PIN_RELAY_3        25
  #define PIN_RELAY_4        26

  #define PIN_LED_GREEN      12  // Granted Status LED
  #define PIN_LED_RED        14  // Denied/Alarm Status LED

  #define PIN_SENS_MAINS_LOST 1  // Digital Input PLN Fail
  #define PIN_SENS_POWER_LOW  2  // ADC Battery Drop
  #define PIN_BTN_WEB_AP     32  // Hotspot Portal Button

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
| **GPIO1** | `MAINS_LOST` | Digital Input | Sinyal AC Fail PLN (Pull-Up 10kΩ ke 3.3V) | ⬜ Pending |
| **GPIO2** | `POWER_LOW` | ADC Input | Pantau Rel 12V Baterai via Resistor Divider 1kΩ/2.2kΩ | ⬜ Pending |
| **GPIO4** | Wiegand `DATA0` | Digital Input | Sinyal D0 Reader + Resistor 10kΩ Pull-Up ke 3.3V | ⬜ Pending |
| **GPIO15** | Wiegand `DATA1` | Digital Input | Sinyal D1 Reader + Resistor 10kΩ Pull-Up ke 3.3V | ⬜ Pending |
| **GPIO12** | LED Green (Granted) | Digital Output | Indikator visual akses diterima (+ Resistor 330Ω ke GND) | ⬜ Pending |
| **GPIO14** | LED Red (Denied/Alarm) | Digital Output | Indikator visual ditolak/alarm (+ Resistor 330Ω ke GND) | ⬜ Pending |
| **GPIO16** | Relay Pintu 1 | Digital Output | Active LOW/HIGH Trigger Modul Relay 5V | ⬜ Pending |
| **GPIO17** | Relay Pintu 2 | Digital Output | Active LOW/HIGH Trigger Modul Relay 5V | ⬜ Pending |
| **GPIO25** | Relay Pintu 3 | Digital Output | Active LOW/HIGH Trigger Modul Relay 5V | ⬜ Pending |
| **GPIO26** | Relay Pintu 4 | Digital Output | Active LOW/HIGH Trigger Modul Relay 5V | ⬜ Pending |
| **GPIO18** | W5500 `SCK` | SPI Clock | Jalur Clock SPI Modul Ethernet W5500 | ⬜ Pending |
| **GPIO19** | W5500 `MISO` | SPI MISO | Jalur Master In Slave Out W5500 | ⬜ Pending |
| **GPIO23** | W5500 `MOSI` | SPI MOSI | Jalur Master Out Slave In W5500 | ⬜ Pending |
| **GPIO5** | W5500 `CS` / `SS` | SPI Chip Select | Chip Select Ethernet W5500 | ⬜ Pending |
| **GPIO33** | W5500 `RST` | Digital Output | Reset Hardware Ethernet W5500 | ⬜ Pending |
| **GPIO21** | RTC `SDA` | I2C Data | Jalur Data DS1307 (Pull-up 4.7kΩ onboard PCB RTC) | ⬜ Pending |
| **GPIO22** | RTC `SCL` | I2C Clock | Jalur Clock DS1307 (Pull-up 4.7kΩ onboard PCB RTC) | ⬜ Pending |
| **GPIO32** | Tombol AP / Web Portal | Digital Input | Pengaktif Hotspot Lokal Web Config 8081 | ⬜ Pending |

---

## 🗺️ 4. Roadmap Pengujian 7 Tahap (Step-by-Step)

```text
TAHAP 1 ──► TAHAP 2 ──► TAHAP 3 ──► TAHAP 4 ──► TAHAP 5 ──► TAHAP 6 ──► TAHAP 7
 Power 2D   RTC & NVS   Wiegand &   MQTT CSV    Offline     Web Config    OTA A/B
Sensing     Sequence  Door Logic   Protokol    Buffer      Port 8081     Rollback
```

### 🟢 FASE 1: Power Supply & 2D Sensing (§1.1, §1.2)
- [ ] Ukur output Stepdown Dual: Rail 5V (4.9V - 5.1V) & Rail 3.3V (3.2V - 3.4V).
- [ ] Uji daya ESP32 via pin `VIN` (5V) + `GND`.
- [ ] Uji `MAINS_LOST` (GPIO1 Digital Input): Simulasi PLN Mati ➔ Event 7/8.
- [ ] Uji `POWER_LOW` (GPIO2 ADC): Simulasi Tegangan Aki Drop < 11.5V ➔ Event 5/6.

### 🟢 FASE 2: RTC Timekeeping & NVS Sequence (§2.2, §2.3, §5.6)
- [ ] Deteksi Alamat RTC DS1307/DS3231 via I2C Scanner (Address `0x68`).
- [ ] **NVS Monotonic Sequence Test**: Simpan `last_seq` di NVS ➔ Reboot ESP32 5x ➔ Pastikan `seq` berlanjut monoton (tidak reset ke 0).
- [ ] **RTC Battery Test**: Setel jam UTC ➔ Cabut power 10s ➔ Jam RTC tidak reset.

### 🟢 FASE 3: Wiegand Reader & State Machine Pintu (§2.1, §2.4)
- [ ] Tap Kartu RFID (125kHz / 13.56MHz) ➔ Decode Wiegand 26/34-bit ➔ Format 10-digit decimal `%010lu`.
- [ ] Eksekusi *Door State Machine*: Debouncing 50ms, timer `open_timeout`, `held_timeout`.
- [ ] Pemicuan alarm `DOOR_FORCED_OPEN` & `DOOR_HELD_OPEN`.

### 🟢 FASE 4: Digital Inputs, Relay, & LED Indicators (§2.1, §2.4)
- [ ] Uji Input DIP Switch 12-pin & Push Button REX/Tamper/Aux (`INPUT_PULLUP`).
- [ ] Trigger Relay Pintu 1-4 (suara "klek" relay + indikator LED relay).
- [ ] Respon LED Indikator: LED Hijau berkedip 1x (Granted), LED Merah berkedip 3x (Denied/Alarm).

### 🟢 FASE 5: W5500 SPI & MQTT CSV Protocol v0.3.1 (§3.1, §5.1, §5.2)
- [ ] Inisialisasi W5500 SPI Ethernet ➔ Dapatkan IP via DHCP / Static.
- [ ] Uji Publish CSV: `access/{id}/logs`, `access/{id}/events`, `access/{id}/heartbeat`.
- [ ] Uji Subscribe CSV: `access/{id}/users/set`, `access/{id}/config/sync`.

### 🟢 FASE 6: Resiliensi Non-Blocking & Offline Buffer Replay (§2.3, §2.6, §5.4)
- [ ] **Non-Blocking Test**: Cabut kabel LAN ➔ Tap kartu & REX tetap berfungsi offline 100% tanpa delay/bootloop.
- [ ] **Offline Buffer Test**: Simpan 10 log di LittleFS buffer saat LAN terputus.
- [ ] **Replay Test**: Colok kabel LAN ➔ Reconnect ➔ Push 10 log dengan flag `,REPLAYED` & timestamp RTC (`device_ts`).

### 🟢 FASE 7: Local Web Config 8081, Safe Rollback & OTA A/B (§2.6, §5.2)
- [ ] Buka Web Server Port 8081 (`http://<IP>:8081`) & Hotspot AP (GPIO32).
- [ ] **Safe Rollback Test (60s)**: Salah isi IP Broker ➔ Gagal reconnect 60s ➔ Auto-Rollback ke IP lama.
- [ ] **OTA Update & Watchdog Auto-Rollback**: Unggah firmware v0.3 via Web 8081 + Uji rollback otomatis partisi A/B jika crash 3x.

---

## 📝 5. Jurnal Progress & Catatan Uji Lab Bench

| Tanggal | Fase | Pengujian | Hasil (PASS/FAIL) | Catatan & Kendala |
|:---:|:---:|---|:---:|---|
| 24/07/2026 | Initial | Pembaruan Board ke WROOM-32D (38-Pin) | **PASS** | Memakai ESP32-WROOM-32D (Silicon Rev 3). HAL `pin_config.h` disesuaikan. |
| ... | Fase 1 | ... | ... | ... |
