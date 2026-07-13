# ESP32 Access Control System

**Versi**: v0.1.0 (Prototype — Serial Simulation)  
**Platform**: ESP32 + PlatformIO  
**Framework**: Arduino

---

## Deskripsi

Sistem akses kontrol berbasis ESP32 yang melayani **4 pintu** dengan **4 reader RFID**.  
Prototype v0.1 menggunakan simulasi via Serial Monitor karena hardware reader dan doorlock belum tersedia.  
Data user dikirim dari laptop via **MQTT (EMQX local)** dan disimpan secara **persisten di Flash ESP32 (LittleFS)**.

---

## Arsitektur

```
[Laptop]
  ├── EMQX MQTT Broker (local, port 1883)
  └── MQTT Client (publish user data / subscribe logs)
          │
          │ MQTT over WiFi
          ▼
       [ESP32]
          ├── LittleFS (Flash Storage)
          │     ├── config.json   ← konfigurasi sistem
          │     └── users.json    ← database user (persisten)
          ├── Serial Monitor
          │     ├── INPUT  : simulasi scan kartu & pilih pintu
          │     └── OUTPUT : hasil akses + log
          └── MQTT Subscriber/Publisher
                ├── Subscribe: user management
                └── Publish:   logs & status
```

---

## Struktur Project

```
Project-Access_control/
├── platformio.ini
├── README.md
├── CHANGELOG.md
└── src/
    ├── main.cpp
    ├── config/
    │   ├── ConfigManager.h
    │   └── ConfigManager.cpp
    ├── storage/
    │   ├── UserStorage.h
    │   └── UserStorage.cpp
    ├── mqtt/
    │   ├── MqttManager.h
    │   └── MqttManager.cpp
    ├── access/
    │   ├── AccessControl.h
    │   └── AccessControl.cpp
    └── serial/
        ├── SerialSim.h
        └── SerialSim.cpp
```

---

## Konfigurasi (Hardcoded di main.cpp)

Edit nilai berikut di `src/main.cpp` sebelum upload:

```cpp
#define WIFI_SSID       "YourWiFiSSID"
#define WIFI_PASSWORD   "YourWiFiPassword"
#define MQTT_BROKER     "192.168.1.100"   // IP laptop yang menjalankan EMQX
#define MQTT_PORT       1883
#define DEVICE_ID       "esp32-ac-001"
```

---

## MQTT Topics

| Topic | Arah | Payload | Fungsi |
|-------|------|---------|--------|
| `access/users/add` | Laptop → ESP32 | JSON user | Tambah user baru |
| `access/users/delete` | Laptop → ESP32 | `{"uid": 1}` | Hapus user |
| `access/users/update` | Laptop → ESP32 | JSON user lengkap | Update user |
| `access/users/sync` | Laptop → ESP32 | JSON array semua user | Sync ulang semua |
| `access/logs` | ESP32 → Laptop | JSON log transaksi | Log setiap akses |
| `access/status` | ESP32 → Laptop | JSON status device | Heartbeat (30 detik) |

### Format Payload

**Add/Update User:**
```json
{
  "kartu": "AABBCCDD",
  "nama": "John Doe",
  "doors": [1, 3]
}
```

**Delete User:**
```json
{ "uid": 1 }
```

**Sync (semua user sekaligus):**
```json
[
  { "uid": 1, "kartu": "AABBCCDD", "nama": "John Doe", "doors": [1, 3] },
  { "uid": 2, "kartu": "11223344", "nama": "Jane Smith", "doors": [1, 2, 3, 4] }
]
```

**Log Transaksi (ESP32 → Laptop):**
```json
{
  "timestamp": 12345678,
  "uid": 1,
  "kartu": "AABBCCDD",
  "nama": "John Doe",
  "pintu": 1,
  "status": "GRANTED"
}
```

---

## Simulasi Serial Monitor

Buka Serial Monitor di PlatformIO dengan baud rate **115200**.

### Cara Penggunaan

```
=== ACCESS CONTROL v0.1 ===
Masukkan UID Kartu (atau LIST/STATUS): AABBCCDD
Masuk pintu mana? (1-4): 1

[PINTU 1 - Pintu Utama] ✓ ACCESS GRANTED
User  : John Doe
Kartu : AABBCCDD
```

### Commands Khusus

| Command | Fungsi |
|---------|--------|
| `LIST` | Tampilkan semua user terdaftar |
| `STATUS` | Tampilkan info device (uptime, user count, IP) |
| `RESTART` | Restart ESP32 |

---

## Upload & Running

```bash
# Build dan upload firmware
pio run --target upload

# Upload LittleFS (jika ada file di /data folder)
pio run --target uploadfs

# Buka Serial Monitor
pio device monitor
```

---

## Versi Roadmap

| Versi | Scope |
|-------|-------|
| **v0.1** *(current)* | Serial sim + MQTT user management + LittleFS |
| **v0.2** | Hardware RFID reader + relay doorlock |
| **v0.3** | Backend REST API + database |
| **v0.4** | Frontend dashboard |
| **v1.0** | Full integrated production system |
