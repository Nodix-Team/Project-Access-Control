# 🛠️ Panduan Instalasi Lapangan & Wiring (Field Technician Guide)

Dokumen ini merupakan referensi resmi bagi Teknisi Lapangan untuk memasang dan mengonfigurasi **ESP32 Access Control v0.3.0** di lokasi instalasi.

---

## 1. Persiapan Alat & Material
Sebelum menuju lokasi, pastikan Anda membawa:
* Obeng plus/minus kecil (untuk Terminal Block).
* Multitester (Avometer) untuk cek tegangan (VDC) dan kontinuitas (Buzzer).
* Tang potong dan tang pengupas kabel.
* Kabel UTP Cat5e/Cat6 (untuk jaringan Wiegand & LAN).
* Kabel Serabut 2x0.75mm atau 2x1.5mm (untuk tegangan Power 12V & Lock pintu).

---

## 2. Standar Wiring Kelistrikan (Perhatikan Polaritas!)

**⚠️ PERINGATAN KERAS:** Papan sirkuit beroperasi pada tegangan **12V DC**. Dilarang keras menghubungkan langsung ke listrik PLN 220V AC!

### A. Sambungan Power Utama
1. Hubungkan Output **+12V** dari Power Supply (SMPS) ke Terminal **VIN (+)** di papan kontrol.
2. Hubungkan Output **GND** dari Power Supply ke Terminal **GND (-)** di papan kontrol.
3. Sambungkan kabel **Baterai Aki SLA 12V 7Ah** ke terminal BATT (Merah ke +, Hitam ke -).

### B. Sambungan Relay ke Kunci Pintu (Magnetic Lock / Dropbolt)
Sistem ini menggunakan relai kontak kering (Dry Contact).
* **Magnetic Lock (Fail-Safe):** Membutuhkan aliran listrik agar terkunci. Saat listrik putus, pintu terbuka.
  * Hubungkan tegangan +12V (dari PSU) ke terminal **COM** pada Relay Pintu.
  * Tarik kabel dari terminal **NC (Normally Closed)** menuju terminal Positif (+) Magnetic Lock.
  * Hubungkan terminal Negatif (-) Magnetic Lock langsung ke Ground (GND) PSU.
* **Dropbolt / Strike (Fail-Secure):** Membutuhkan aliran listrik agar terbuka. Saat listrik putus, pintu terkunci.
  * Gunakan terminal **NO (Normally Open)** sebagai ganti NC.

**Wajib Pasang:** Pastikan **Dioda Flyback (1N4007)** atau Varistor dipasang secara paralel di *terminal kunci pintu* untuk mencegah lonjakan tegangan balik (Back-EMF) yang bisa merusak papan kontrol.

---

## 3. Sambungan Sensor & Pembaca Kartu (Wiegand)

### A. Wiegand Reader (RFID)
Gunakan 4 helai kabel (biasanya menggunakan urat UTP):
* **Merah (VCC):** Hubungkan ke Terminal +12V Reader di papan.
* **Hitam (GND):** Hubungkan ke Terminal GND.
* **Hijau (D0):** Hubungkan ke Terminal D0.
* **Putih (D1):** Hubungkan ke Terminal D1.

### B. Tombol Keluar (Request-to-Exit / REX) & Door Sensor
* **REX Button:** Hubungkan satu kabel ke terminal REX, dan kabel lainnya ke GND.
* **Door Sensor:** Hubungkan sensor magnetik (Magnetic Contact) ke terminal SENSOR dan GND. Pastikan terpasang **Resistor EOL (End-of-Line) 2.2kΩ** jika ditarik jarak jauh.

---

## 4. Prosedur Uji Coba (Commissioning)

Setelah semua kabel terpasang dengan kokoh, lakukan prosedur *First-Boot*:
1. Nyalakan Power Supply Utama.
2. Tunggu sekitar 15-20 detik. Perhatikan lampu indikator (LED) di papan kontrol.
3. Buka HP/Laptop teknisi, cari jaringan Wi-Fi lokal atau hotspot bawaan papan kontrol (jika belum dikonfigurasi).
4. Buka Browser (Chrome/Safari) dan akses ke **`http://<IP_Alat>:8081`** (Login: `admin` / `p@ssw0rd`).
5. Lakukan uji coba *Relay Test* dari halaman web tersebut untuk memastikan kunci pintu terbuka/tertutup dengan benar.
6. Tempelkan kartu pada Reader, periksa apakah suara *beep* berbunyi dan pintu bereaksi (atau log tercatat di web).

---

## 5. Simulasi Kebakaran (Fire Interlock Test)
1. Aktifkan saklar Manual Call Point (MCFA) yang terhubung ke papan kontrol.
2. **Hasil yang diharapkan:** Relay pemutus (P-MOSFET) akan langsung memutus tegangan 12V ke semua pintu. **Semua pintu Magnetic Lock harus terbuka secara fisik**, terlepas dari status *firmware*.
3. Jika pintu tidak terbuka, periksa kembali wiring relai pintu Anda (apakah tertukar antara NC dan NO).
