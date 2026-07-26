# 📋 Bill of Materials (BOM) & Spesifikasi Manufaktur - Sprint 7

Dokumen ini memuat draf *Bill of Materials* (BOM) dan Kriteria Enclosure (Casing) untuk **ESP32 Access Control v0.3.0**. Daftar komponen di bawah ini telah disesuaikan dengan 19 Poin Proteksi Elektrikal dari dokumen `HARDWARE-AUDIT-REVIEW-V0.3.md`.

---

## 1. Daftar Komponen Inti (Bill of Materials)

Estimasi harga dibuat berdasarkan pembelian grosir (batch 100 unit) dari pemasok komponen (Mouser / LCSC / Tokopedia).

### A. Mikrokontroler & Inti (Logic & Control)
| Part Name / Number | Fungsi | Qty / Board | Est. Harga/pcs |
|---|---|:---:|---|
| **ESP32-S3-WROOM-1-N16R8** | MCU Utama (16MB Flash, 8MB PSRAM) untuk OTA lega | 1 | Rp 45.000 |
| **MCP23017-E/SO** | IC Port Expander (I2C) (SMD) | 1 | Rp 15.000 |
| **DS3231SN** | IC RTC Presisi (SMD) | 1 | Rp 20.000 |
| **CR2032 SMD Holder** + BAT54C | Baterai RTC & Dioda Proteksi | 1 set | Rp 5.000 |
| **TPS3823-33DBVR** | IC External Watchdog Timer (SMD) | 1 | Rp 8.000 |

### B. Manajemen Daya (Power & Battery)
| Part Name / Number | Fungsi | Qty / Board | Est. Harga/pcs |
|---|---|:---:|---|
| **MP2315** (atau setara) | DC-DC Buck Converter 12V ke 3.3V (Mengganti LDO) | 1 | Rp 7.500 |
| **CN3768** | Dedicated SLA Battery Charger IC | 1 | Rp 12.000 |
| **AO4407A** (P-Channel) | MOSFET Proteksi Reverse Polarity (Input 12V) | 1 | Rp 2.500 |
| **AO4407A** (P-Channel) | MOSFET Hardware Interlock (Fire Release) | 1 | Rp 2.500 |
| **Resettable PTC 5A** (2920) | Sekering Utama Input 12V | 1 | Rp 3.000 |

### C. Output & Aktuator (Pintu)
| Part Name / Number | Fungsi | Qty / Board | Est. Harga/pcs |
|---|---|:---:|---|
| **SRD-12VDC-SL-C** | Relay 10A untuk Magnetic Lock/Dropbolt | 4 | Rp 4.500 (18k) |
| **ULN2003ADR** | IC Relay Driver (Dikendalikan MCP23017 & EN WDT) | 1 | Rp 3.500 |
| **1N4007 / SS14** | Dioda Flyback (Proteksi Relays) | 4 | Rp 500 (2k) |
| **MOV 14D390K** | Metal Oxide Varistor (Proteksi L+/L- Relay) | 4 | Rp 1.500 (6k) |

### D. Input, Sensor, & Proteksi Jalur Data
| Part Name / Number | Fungsi | Qty / Board | Est. Harga/pcs |
|---|---|:---:|---|
| **SMBJ15CA** + **MOV 14D220K** | Proteksi Surge Utama (TVS + Varistor) 12V Input | 1 set | Rp 5.000 |
| **PESD5V0U1BA** | TVS Diode untuk Pin Input Wiegand, Sensor, REX | 16 | Rp 1.000 (16k) |
| **SMD 1812L050PR** (PTC) | Resettable Fuse 500mA per Jalur Power Wiegand | 4 | Rp 1.500 (6k) |
| **Resistor 2.2kΩ** | End-of-Line (EOL) Resistors untuk Door Sensor/Tamper | 8 | Rp 100 (800) |
| **USBLC6-2SC6** | IC ESD Protection untuk Port Native USB ESP32-S3 | 1 | Rp 4.000 |

> **Estimasi Total Komponen Aktif/Pasif per Board: ~Rp 181.800** (Belum termasuk PCB Cetak, Terminal Block, Kabel, dan Casing Enclosure).

---

## 2. Kriteria Enclosure (Casing Fisik)

Sesuai standar industrial access control, PCB harus dilindungi dengan kotak khusus (Enclosure).

1. **Bahan Material:**
   - Plat Besi *Cold Rolled Steel* 1.2mm (Powder Coated, warna Beige/Abu-abu).
   - Tahan terhadap benturan fisik (Vandal-proof) dan api ringan.
2. **Dimensi Ruang:**
   - Area PCB Utama: Min. 15cm x 15cm.
   - Area Baterai SLA: Cukup untuk menampung Baterai Aki 12V 7Ah (Dimensi aki ~151x65x94 mm).
   - Area Trafo/Power Supply: Cukup untuk Switching Power Supply (SMPS) 12V 5A jaring.
3. **Interlock & Keamanan Fisik:**
   - Wajib memiliki **Microswitch Tamper** di bagian penutup pintu (dihubungkan ke `TAMPER_OPEN` backend).
   - Dilengkapi dengan Kunci Camlock Silinder fisik.
4. **Sirkulasi Suhu & Jalur Kabel:**
   - Kisi-kisi ventilasi pasif di sisi kiri dan kanan (tanpa kipas aktif agar tahan debu).
   - Minimal 4 buah lubang *Knock-out* 20mm untuk *Cable Gland* (masuk kabel UTP/Kelistrikan) di bagian bawah/atas.

---

## 3. Catatan Manufaktur & Sertifikasi

*   **PCB (Printed Circuit Board):** Wajib dicetak menggunakan standar **4-Layer** dengan *Ground Plane* utuh di layer dalam untuk memenuhi syarat **EMC Filtering** (mengurangi noise dari relay dan mematuhi batas radiasi CE/FCC).
*   **Quality Control (QC):** Terdapat 6-Pin *Pogo-Pin Pad* di bagian bawah (*bottom layer*) untuk mempercepat *flashing firmware* secara massal di pabrik tanpa mencolokkan kabel USB.

*Draf ini akan menjadi patokan dasar sebelum kita memanggil vendor perangkat keras atau insinyur PCB.*
