# 🛠️ HASIL AUDIT & REVIEW HARDWARE V0.3 (MASUKAN TEKNIS EMPING / RIZAL)

> [!WARNING]
> **DOKUMEN EVALUASI AWAL:** Dokumen ini memuat kritik dan matriks usulan awal.
> Skema final penyelesaian masalah kelistrikan (seperti GPIO1 Digital Input, GPIO2 ADC, dan PTC per-pintu) wajib merujuk ke dokumen **[`docs/KEPUTUSAN_ARSITEKTUR_v0.3.md`](KEPUTUSAN_ARSITEKTUR_v0.3.md) §1 & §2**.

> *Status: **DISENTUSUI SEPENUHNYA (ALL APPROVED)** oleh Tim Engineering pada 22 Juli 2026. Dokumen ini menjadi acuan spesifikasi final produksi massal.*

---

## ⚠️ 0. INKONSISTENSI SPESIFIKASI DEDIKASI

### 📌 Poin 0: Inkonsistensi Tegangan Koil Relay (SRD-12VDC vs Supplai 5V)
* **Temuan Emping**: Section 9A menyebutkan *"Listrik 5V ini menyuplai koil relay..."*, padahal tipe part number yang tercantum adalah `SRD-12VDC-SL-C` (koil tegangan 12V).
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Koil relay **SRD-12VDC-SL-C** tetap disuplai langsung dari **Rel Tegangan 12V DC** (dikendalikan via IC ULN2003ADR) untuk menghemat arus DC-DC Buck Converter 5V. Naskah narasi di proposal diperbaiki.

---

## 🔴 SAFETY-CRITICAL (KESELAMATAN JIWA & KEANDALAN HARDWARE)

### 📌 Poin 1: Fire Release Wajib Lewat Jalur Hardware Langsung (Failsafe Cut-Off)
* **Temuan Emping**: Sinyal Fire Alarm wajib memiliki jalur pemutus hardware langsung (*Hardware Interlock*) tanpa bergantung pada firmware.
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan P-Channel Power MOSFET interlock. Sinyal Fire Alarm (NC/NO) secara fisik memutus VCC +12V Relay/Lock secara otomatis, sementara `GPIO36` tetap membaca sinyal untuk log peringatan ke server.

### 📌 Poin 2: Proteksi Snubber / Flyback Dioda pada Terminal Output Lock (L+/L-)
* **Temuan Emping**: Wajib ada proteksi back-EMF pada terminal output kontak relay (`L+`/`L-`) ke Magnetic Lock / Dropbolt.
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan Dioda Flyback Fast-Recovery (**1N4007** / **SS14**) paralel terbalik + **MOV (Metal Oxide Varistor 14D390K)** pada terminal `L+`/`L-` tiap pintu.

### 📌 Poin 3: Watchdog IC Eksternal & State Failsafe Relay
* **Temuan Emping**: Penggunaan IC Watchdog Eksternal (TPS3823-33) untuk mereset ESP32-S3 dan mematikan relay jika MCU hang.
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Analisis Effort**: Effort Hardware & Firmware **Sangat Rendah** (hanya 1 IC SOT-23 + 1 baris kode toggle di loop), namun berdampak **Sangat Besar (*High Impact*)** untuk keandalan.
* **Keputusan Teknis Final**: Ditambahkan IC External Watchdog **TPS3823-33DBVR** dihubungkan ke `GPIO34` (WDI) dan pin `RESET` / `ENABLE` ULN2003.

---

## 🟠 PROTEKSI INPUT DAYA & FIELD WIRING (LAPANGAN)

### 📌 Poin 4: Reverse Polarity Protection pada Input Daya 12V
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan P-Channel Power MOSFET (**AO4407A**) pada jalur input +12V utama.

### 📌 Poin 5: Surge / TVS Diode & Filter Induksi pada Input Utama 12V
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan **TVS Diode SMBJ15CA** + **MOV 14D220K** + **Common Mode Choke** di terminal 12V utama.

### 📌 Poin 6: Fuse Utama Eksplisit (PTC Fuse 5A)
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan **Resettable PTC Fuse 5A (SMD 2920)** secara eksplisit di jalur masukan utama.

### 📌 Poin 7: Proteksi TVS + Resistor Seri di Setiap Terminal Lapangan
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan **Resistor Seri 220Ω** + **TVS Diode PESD5V0U1BA** di setiap masukan REX, Door Sensor, Aux Input, dan Tamper.

### 📌 Poin 8: PTC Resettable Fuse per Output Power Reader Wiegand
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan **PolySwitch PTC Fuse 500mA (SMD 1812L050PR)** pada masing-masing jalur VCC Output Reader 1–4.

### 📌 Poin 9: Line Supervision (Resistor End-of-Line / EOL)
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan sirkuit EOL Dual Resistor 2.2kΩ pada jalur Door Sensor & Tamper.

---

## 🟡 DAYA, SENSING AKI, & KOMPONEN LENGKAP

### 📌 Poin 10: Jalur ADC Sensing Tegangan Aki & PLN
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Mengalokasikan **`GPIO1`** (Sensing PLN 12V) dan **`GPIO2`** (Sensing Aki 12V) dengan pembagi tegangan R1=100kΩ / R2=10kΩ.

### 📌 Poin 11: Upgrade IC Charger Baterai Aki SLA (CN3768)
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Mengganti LM317 dengan dedicated SLA Charger IC **CN3768** (3-stage charge + kompensasi suhu).

### 📌 Poin 12: Thermal Management Buck 3.3V (Mengganti LDO)
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Mengganti LDO AMS1117-3.3V dengan **DC-DC Buck Converter 3.3V MP2315** (efisiensi >90%).

### 📌 Poin 13: Baterai Backup RTC (CR2032 Coin Cell Holder)
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Memasukkan **SMD Battery Holder CR2032** + Dioda BAT54C ke BOM.

### 📌 Poin 14: Bob Smith Termination & Chassis Ground RJ45
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan sirkuit Bob Smith Termination (4x R 75Ω + C 2kV 1nF) pada konektor Ethernet RJ45.

### 📌 Poin 15: Proteksi ESD pada Port USB Native ESP32-S3
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan IC **USBLC6-2SC6** pada jalur USB D+ dan D-.

### 📌 Poin 16: EMC Filtering & Layout Grounding Plan (Sertifikasi CE/FCC)
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Ditambahkan Ferrite Bead BLM18PG121SN1D & pedoman layout PCB 4-Layer.

### 📌 Poin 17: Test Point & Jig Pogo-Pin untuk Flashing Massal Pabrik
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Disediakan Pogo-Pin Test Point Pad 6-Pin di bottom layer PCB.

### 📌 Poin 18: Handalitas I2C MCP23017 (Interrupt INTA → GPIO34)
* **Status Persetujuan**: **DISENTUJUAN (APPROVED)**.
* **Keputusan Teknis Final**: Pin `INTA` MCP23017 dihubungkan ke **`GPIO34`** ESP32-S3 untuk instant hardware interrupt.

---

## 📊 MATRIKS KESIMPULAN REVISI AUDIT

| No | Poin Masukan Emping | Status | Tindakan Final |
|:---|:---|:---:|:---|
| **0** | Tegangan Koil Relay | **APPROVED** | SRD-12VDC disuplai langsung dari Rel 12V |
| **1** | Fire Release Hardware Interlock | **APPROVED** | Tambah MOSFET P-Channel Cut-Off VCC Lock |
| **2** | Snubber / Flyback Terminal Lock | **APPROVED** | Dioda 1N4007 + MOV 14D390K per terminal L+/L- |
| **3** | External Watchdog IC (TPS3823) | **APPROVED** | TPS3823-33 terhubung ke GPIO34 (WDI) & RESET |
| **4** | Reverse Polarity Protection | **APPROVED** | P-Channel MOSFET AO4407A di input 12V |
| **5** | Surge / TVS Diode Input 12V | **APPROVED** | TVS SMBJ15CA + MOV 14D220K + Choke |
| **6** | Fuse Utama Eksplisit | **APPROVED** | Resettable PTC Fuse 5A (SMD 2920) |
| **7** | TVS + Resistor Terminal Input | **APPROVED** | Resistor 220Ω + TVS PESD5V0U1BA per terminal |
| **8** | PTC Fuse per Output Reader | **APPROVED** | PolySwitch PTC 500mA per jalur VCC Reader 1-4 |
| **9** | Line Supervision (Resistor EOL) | **APPROVED** | EOL Dual Resistor 2.2kΩ Circuit |
| **10**| Sensing ADC Tegangan Aki & PLN | **APPROVED** | GPIO1 (PLN 12V) & GPIO2 (Aki 12V) via Divider |
| **11**| Charger IC Baterai SLA (CN3768) | **APPROVED** | CN3768 Dedicated SLA Charger IC |
| **12**| DC-DC Buck 3.3V (Ganti LDO) | **APPROVED** | Buck Converter MP2315 3.3V (Efisiensi >90%) |
| **13**| Battery Holder RTC (CR2032) | **APPROVED** | SMD Holder CR2032 + Dioda BAT54C |
| **14**| Bob Smith Termination RJ45 | **APPROVED** | 4x R 75Ω + C 2kV 1nF ke Chassis Ground |
| **15**| ESD Protection Port USB Native | **APPROVED** | IC USBLC6-2SC6 pada USB D+/D- |
| **16**| EMC Filtering & Ground Plane | **APPROVED** | Ferrite Bead BLM18PG121SN1D & PCB 4-Layer |
| **17**| Test Point Jig Pogo-Pin | **APPROVED** | 6-Pin Pogo-Pin Pad di Bottom Layer PCB |
| **18**| MCP23017 Hardware Interrupt | **APPROVED** | Pin INTA MCP23017 terhubung ke GPIO34 |
