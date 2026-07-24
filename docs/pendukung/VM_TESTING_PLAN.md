# Skema Pengujian: VirtualBox (Debian) + ESP32 Fisik

Rencana pengujian backend/MQTT di VM Linux terisolasi, dengan ESP32 fisik asli (tanpa sensor RFID) sebagai sumber transaksi. Dibuat sebagai referensi praktis — ikuti berurutan, jangan loncat ke bagian 6/7 sebelum bagian 5 (prasyarat) selesai.

---

## 1. Spek Host & Alokasi VM

**Host:** Ryzen 5 2200G (4 core / 4 thread, tanpa SMT), RAM 16 GB.

Host ini sudah menjalankan Docker Desktop (yang sendiri butuh WSL2/Hyper-V), VSCode, browser, dan backend/frontend dev server secara bersamaan — dari pengecekan barusan, RAM bebas saat idle-development cuma ~4.6 GB dari 16 GB. Jadi alokasi VM harus konservatif.

| Resource | Rekomendasi | Alasan |
|---|---|---|
| vCPU | **2** | Sisakan minimal 2 core fisik buat host (Windows + Docker Desktop + VSCode). Ryzen 2200G tidak punya SMT, jadi tidak ada "core cadangan" dari hyperthreading — jangan alokasikan lebih dari 2 kalau host tetap dipakai aktif selama pengujian. |
| RAM | **4 GB** (fixed, bukan dynamic) | MySQL + EMQX + FastAPI/uvicorn untuk dataset kecil (puluhan user, ratusan log) nyaman di 4 GB. Kalau host lagi idle (tutup Docker Desktop sisi Windows), boleh naik ke 6 GB. |
| Disk | 25 GB, dynamically allocated (VDI) | Debian minimal (server, tanpa desktop environment) + Docker Engine + image MySQL/EMQX muat nyaman, sisa ruang untuk log/data testing. |
| Network Adapter | **Bridged**, bukan NAT | ESP32 fisik harus bisa konek LANGSUNG ke IP VM di jaringan WiFi yang sama. NAT akan menyembunyikan VM di belakang IP Windows host, butuh port-forwarding manual yang rawan salah konfig untuk MQTT (port 1883) + REST (8000) + WS sekaligus. Bridged jauh lebih simpel untuk skenario ini. |

**Penting — konflik virtualisasi:** karena Docker Desktop di host ini pakai backend WSL2 (yang mengaktifkan Hyper-V/VBS), VirtualBox otomatis jatuh ke mode eksekusi "Hyper-V" (bukan native VT-x langsung). Ini **normal, VM tetap jalan**, tapi performa CPU-nya turun ~10-20% dibanding kalau VirtualBox punya akses VT-x eksklusif. Untuk beban kerja pengujian ini (MySQL kecil + EMQX kecil + REST API ringan) dampaknya tidak signifikan — tidak perlu mematikan Hyper-V/WSL2 di host.

**Distro:** Debian 12 (bookworm), install minimal — pilih **"SSH server"** saja saat tasksel, TANPA desktop environment. Akses VM lewat SSH dari Windows host (hemat RAM, tidak perlu GUI).

**Software di dalam VM** (biar konsisten dengan setup existing di Windows host, bukan install native MySQL/EMQX):
```bash
# Di dalam VM Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin python3-pip python3-venv git
sudo usermod -aG docker $USER   # logout/login setelah ini
```
Lalu jalankan container MySQL + EMQX dengan image yang sama (`mysql:8.0` dan `emqx/emqx:5.8`) — **di dalam VM ini saja**, pakai Docker Engine yang baru diinstall di atas, clone repo, `pip install -r backend/requirements.txt`, `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

**Docker di Windows TIDAK diperlukan untuk pengujian ini.** VM ini berdiri sendiri sepenuhnya — hanya butuh Docker Engine di dalam Debian, tidak ada ketergantungan ke Docker Desktop Windows sama sekali. Justru sebaiknya **matikan Docker Desktop di Windows** selama sesi pengujian VM berlangsung:
- Hindari bentrok port (3306/1883/8000 dipakai kedua sisi kalau jalan bersamaan)
- RAM host lebih lega, VM bisa dialokasikan lebih besar dari 4 GB kalau perlu
- VirtualBox berpeluang dapat akses VT-x native (lebih cepat) alih-alih fallback mode "Hyper-V" — asalkan tidak ada software Windows lain yang masih butuh Hyper-V/WSL2 aktif

(Docker Desktop Windows yang dipakai sepanjang sesi kerja sebelumnya di percakapan ini adalah untuk setup dev **lama**, terpisah total dari rencana VM ini.)

---

## 2. Jaringan: Lokal Dulu, Bukan Tailscale

**Rekomendasi: mulai dari jaringan lokal (WiFi/LAN yang sama), Tailscale belakangan.**

Alasan: sistem ini belum pernah divalidasi jalan di VM Linux terisolasi sama sekali (selama ini semua testing di Windows host langsung + Docker Desktop). Kalau langsung lompat ke Tailscale, begitu ada masalah koneksi kamu tidak akan tahu apakah penyebabnya:
- bug di kode/config sistem itu sendiri, atau
- karakteristik jaringan overlay Tailscale (latency tambahan, NAT traversal lewat DERP relay kalau direct connection gagal, MTU lebih kecil dari LAN biasa)

Uji di LAN lokal dulu sampai semua skenario di bagian 6/7 lolos bersih. Baru setelah itu, sebagai **fase terpisah**, ulangi pengujian koneksi (bukan seluruh skema) lewat Tailscale — kamu sudah punya Tailscale aktif di host ini (`100.94.159.52`, domain `taile0be3c.ts.net`), jadi tinggal install Tailscale juga di VM Debian dan di ESP32... **catatan: ESP32 firmware ini tidak mendukung Tailscale** (butuh WireGuard client, tidak ada di firmware v0.2). Jadi kalaupun lanjut ke fase Tailscale, itu hanya relevan untuk akses **frontend/admin dari luar LAN** — ESP32 fisik tetap wajib di LAN lokal yang sama dengan broker MQTT-nya.

---

## 3. Prasyarat Kritis: `device_id` ESP32 Tidak Cocok dengan Database — ✅ SUDAH DIBERESKAN

Firmware fisik semula pakai `DEVICE_ID = "esp32-ac-001"`, tidak cocok dengan controller manapun di seed data (`ctrl-A`/`ctrl-B`), dan backend tidak punya endpoint untuk daftar controller baru — jadi device tidak pernah "dikenali" (is_online selalu false, log masuk controller_id NULL).

**Sudah diperbaiki** (branch `fix/firmware-device-id`, [PR #11](https://github.com/danskiv/Project-Access-Control/pull/11), belum di-merge — menunggu review): `DEVICE_ID`/`MQTT_USER`/`MQTT_PASSWORD` diubah ke `ctrl-B` ([main.cpp:24-30](../firmware/src/main.cpp#L24-L30)). `ctrl-B` dipilih (bukan `ctrl-A`) supaya tidak bentrok kalau `tools/simulate_esp32.py` turut dijalankan bersamaan sebagai simulasi software terpisah.

**Diverifikasi live pada device fisik:**
- `GET /api/controllers` → `ctrl-B` (`id=2`) `is_online: true`, `last_seen` ter-update
- `POST /api/controllers/2/sync` → `status: OK`, 49 user
- Serial `STATUS` di device → `Device ID: ctrl-B`, `User count: 49` (cocok persis dengan hasil sync)

Butuh **full erase + reflash** untuk menerapkan `device_id` baru (bukan cuma upload biasa) — sama seperti kasus WiFi sebelumnya, `device_id` juga tersimpan permanen di `config.json` LittleFS device, jadi upload biasa tidak akan mengganti nilai yang sudah tersimpan. Setelah erase, WiFi ("Kenziie") dan `mqtt_broker` (`192.168.100.4`) perlu di-set ulang (WiFi lewat reflash sementara, `mqtt_broker` lewat `POST http://<ip-esp32>:8081/save`) — kredensial WiFi TIDAK di-commit ke git, cuma `device_id`/`mqtt_user`/`mqtt_password` yang permanen.

---

## 4. Kriteria Pengujian ESP32 Tanpa Sensor RFID

Firmware v0.2 **sudah punya** mode simulasi bawaan buat kondisi ini — `SerialSim` ([firmware/src/serial/SerialSim.cpp](../firmware/src/serial/SerialSim.cpp)). Tidak perlu sensor RC522 fisik sama sekali; "tap kartu" disimulasikan lewat input Serial Monitor dengan protokol 2 langkah:

1. Kirim UID kartu (string apa saja) + Enter → device balas "Terdaftar"/"Tidak terdaftar"
2. Kirim nomor pintu `1`-`4` + Enter → device jalankan `AccessControl.checkAccess()` beneran (pakai data user LOKAL yang tersimpan di device, bukan tanya balik ke backend), lalu publish hasilnya ke MQTT lewat `MqttManager.publishLog()`

**Implikasi penting:** `checkAccess()` cuma tahu user yang **sudah pernah di-sync** ke device (lewat protokol Full Sync `POST /api/controllers/{id}/sync`, yang push `users/set` via MQTT ke device dan device simpan ke `users.json` lokal di LittleFS). Cek boot log terakhir: `[UserStorage] users.json belum ada, mulai dari kosong` — device **belum punya user tersimpan sama sekali**. Kalau tap kartu sebelum sync, semua hasilnya pasti "Tidak terdaftar"/`UNKNOWN_CARD`.

**Kriteria pengujian yang valid untuk kondisi tanpa sensor ini:**

| # | Kriteria | Cara verifikasi |
|---|---|---|
| K1 | Device bisa terima Full Sync dan menyimpan user secara lokal | Kirim `STATUS` lewat serial sebelum & sesudah sync → `User terdaftar: N` harus berubah dari 0 ke N |
| K2 | Tap kartu **terdaftar + punya akses** ke pintu yang ditap → `ACCESS GRANTED`, log sampai ke backend dengan `result=GRANTED, reason=OK` | Bandingkan output serial dengan `GET /api/logs` |
| K3 | Tap kartu **terdaftar tapi TIDAK punya akses** ke pintu itu → `ACCESS DENIED`, `reason=NO_ACCESS` | sama seperti K2 |
| K4 | Tap kartu **tidak terdaftar sama sekali** → `ACCESS DENIED`, `reason=UNKNOWN_CARD`, `user_id=NULL` di log backend | sama seperti K2 |
| K5 | Device tetap kirim `STATUS` (heartbeat) berkala meski tidak ada tap → `is_online` tetap `true` di `GET /api/controllers` | Diamkan device 1-2 menit, cek dashboard |
| K6 | Command `LIST` dan `RESTART` di serial tidak merusak state MQTT (device reconnect otomatis setelah restart) | Kirim `RESTART`, cek `[MQTT] Terhubung!` muncul lagi di boot berikutnya |

---

## 5. Daftar Pengujian & Program yang Dipakai

Tiga skenario yang kamu minta, masing-masing pakai "program"/tool yang berbeda karena tujuannya beda:

### Test A — Tambah 20-40 User

**Tujuan:** validasi CRUD user + CSV upload di skala menengah, bukan simulasi ESP32 sama sekali.

**Program:** frontend (`Users → Upload CSV`) atau langsung `POST /api/users/upload-csv`. Bisa pakai `tools/sample_users.csv` sebagai basis, diperbanyak jadi 20-40 baris (kartu unik, department valid).

**Kriteria lolos:** `success_count` sesuai jumlah baris valid, semua muncul di `GET /api/users`, tidak ada `error_count` yang tidak terduga.

### Test B — Live Connection Controller ↔ ESP32

**Tujuan:** validasi jalur MQTT fisik ESP32 → VM Debian (broker EMQX di dalam VM), bukan simulasi software.

**Program:** firmware asli (setelah prasyarat bagian 3 dibereskan) + `curl`/dashboard buat observasi. Tidak butuh script tambahan — cukup nyalakan device, pantau:
```bash
curl http://<ip-vm>:8000/api/controllers   # is_online: true, last_seen ter-update
```
Lalu jalankan **Full Sync** (`POST /api/controllers/{id}/sync`) dan konfirmasi `status: "OK"` (bukan `SYNC_FAILED`) — ini juga sekaligus memenuhi kriteria K1 di bagian 4.

**Kriteria lolos:** `is_online=true` konsisten selama device menyala, `last_seen` ter-update tiap `heartbeat_s` (default 30 detik), Full Sync berhasil `OK`.

### Test C — Live Transaction Otomatis, 1 Tap/Detik

**Tujuan:** stress-test jalur penuh ESP32 fisik (Serial → AccessControl → MQTT → backend → DB → WebSocket → frontend), pakai user yang sudah ada & sudah tersinkron, bukan data karangan.

**Program: skrip baru `tools/simulate_serial_taps.py`** (dibuat khusus untuk ini — beda dari `tools/simulate_random_taps.py` yang sudah ada, karena yang itu inject langsung ke MQTT dan **melewati ESP32 fisik sama sekali**; yang ini benar-benar mengetik ke Serial Monitor device seolah-olah orang yang tap kartu).

Cara kerja: ambil user nyata dari `GET /api/users` yang resolved access-nya sudah mengandung device_id controller ini (artinya sudah ke-sync ke device), lalu kirim 2 baris (`kartu`, lalu `nomor_pintu`) ke port serial ESP32 setiap detik, gantian dengan sesekali kartu acak yang TIDAK terdaftar (uji K4).

```bash
python tools/simulate_serial_taps.py --port COM3 --interval 1 --controller-device-id ctrl-B
```

**Kriteria lolos:** dalam N detik simulasi, jumlah baris baru di `GET /api/logs` = N (tidak ada yang hilang), rasio GRANTED/DENIED/UNKNOWN_CARD di backend cocok 1:1 dengan yang tercetak di serial, dan tidak ada `device_uptime_ms` yang mundur/duplikat (indikasi race condition di firmware).

---

## 6. Urutan Eksekusi Disarankan

1. Setup VM (bagian 1) → validasi `docker ps` jalan normal di dalam VM
2. Bereskan prasyarat device_id (bagian 3)
3. Pindahkan koneksi ESP32 supaya MQTT broker-nya menunjuk ke IP VM (bukan IP Windows host lagi) — lewat local web config server (`POST http://<ip-esp32>:8081/save`, field `mqtt_broker`), sama seperti yang sudah pernah dilakukan sebelumnya
4. Test B dulu (koneksi hidup + sync) — ini prasyarat K1 untuk Test C
5. Test A (tambah user) — supaya ada variasi kartu buat Test C
6. Test C (transaksi otomatis 1 detik sekali)
7. Kalau semua lolos di LAN lokal → baru pertimbangkan fase Tailscale (bagian 2) untuk akses frontend dari luar
