# Changelog — ESP32 Access Control System

Semua perubahan signifikan pada project ini didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v0.1.0] - 2026-07-13

### Prototype v0.1 — Serial Simulation + MQTT User Management

**Scope**: Prototype awal tanpa hardware fisik. Semua simulasi dilakukan via Serial Monitor.

### Added
- Struktur project PlatformIO untuk ESP32
- **LittleFS persistent storage**:
  - `config.json` — konfigurasi sistem (WiFi, MQTT, nama pintu)
  - `users.json` — database user (persisten, tidak hilang saat restart)
- **ConfigManager** — load/save konfigurasi dari/ke LittleFS
- **UserStorage** — CRUD user dengan auto-increment uid, persisten di Flash
- **AccessControl** — logika pengecekan akses user ke pintu tertentu
- **MqttManager** — koneksi EMQX local, subscribe & publish:
  - Subscribe: `access/users/add`, `access/users/delete`, `access/users/update`, `access/users/sync`
  - Publish: `access/logs`, `access/status`
- **SerialSim** — simulasi 4 reader & 4 doorlock via Serial Monitor:
  - Input UID kartu → pilih pintu (1-4) → hasil akses
  - Command `LIST` untuk melihat semua user
  - Command `STATUS` untuk info device
- Auto-reconnect WiFi dan MQTT
- Heartbeat status ke MQTT setiap 30 detik
- Log transaksi (GRANTED/DENIED) dikirim ke laptop via MQTT

### Architecture
```
Laptop (EMQX MQTT) ←→ ESP32 (WiFi)
                         ├── LittleFS: config.json, users.json
                         └── Serial Monitor: simulasi scan & doorlock
```

### Known Limitations (v0.1)
- Tidak ada hardware RFID reader (simulasi Serial)
- Tidak ada hardware doorlock (output Serial only)
- Config WiFi/MQTT hardcoded di source code
- Tidak ada autentikasi MQTT
- Timestamp log menggunakan `millis()` (bukan RTC/NTP)

---

## [Planned] v0.2.0

- Integrasi hardware RFID RC522 / MFRC522
- Integrasi relay untuk doorlock fisik
- NTP time sync untuk timestamp akurat
- MQTT autentikasi (username/password)
