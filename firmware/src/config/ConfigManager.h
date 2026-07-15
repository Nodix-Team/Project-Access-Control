// ============================================================
//  ConfigManager.h
//  Mengelola konfigurasi sistem dari/ke LittleFS (config.json)
//  ESP32 Access Control System — v0.2.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

// ============================================================
//  Struct konfigurasi sistem
// ============================================================
struct SystemConfig {
    String wifi_ssid;
    String wifi_password;
    String mqtt_broker;
    int    mqtt_port;
    String mqtt_user;      // Baru di v0.2
    String mqtt_password;  // Baru di v0.2
    String device_id;
    int    heartbeat_s;    // Baru di v0.2 (detik, default 30)
    int    total_doors;    // Baru di v0.2 (lokal 1-N, default 4)
    String door_names[4];  // Nama pintu lokal 1-4
    String ip_mode;        // Baru di v0.2 ("dhcp" atau "static")
    String ip_address;     // Baru di v0.2
    String subnet_mask;    // Baru di v0.2
    String gateway;        // Baru di v0.2
};

// ============================================================
//  Class ConfigManager
//  - Load config dari LittleFS saat boot
//  - Mendukung rollback ke konfigurasi last known good jika koneksi gagal
// ============================================================
class ConfigManager {
public:
    ConfigManager();

    /**
     * Inisialisasi config. Harus dipanggil setelah LittleFS.begin().
     * Jika config.json belum ada, akan dibuat dari nilai default.
     * @return true jika berhasil
     */
    bool begin();

    /**
     * Set nilai default (hardcoded) ke dalam struct config.
     */
    void setDefaults(
        const String& wifiSsid,
        const String& wifiPass,
        const String& mqttBroker,
        int            mqttPort,
        const String& mqttUser,
        const String& mqttPass,
        const String& deviceId,
        int            heartbeatS,
        int            totalDoors,
        const String  doorNames[4]
    );

    /**
     * Simpan config saat ini ke config.json di LittleFS.
     * @return true jika berhasil
     */
    bool saveConfig();

    /**
     * Salin config.json ke config_last_known_good.json di LittleFS.
     * @return true jika berhasil
     */
    bool saveLastKnownGood();

    /**
     * Pulihkan config_last_known_good.json kembali ke config.json.
     * @return true jika berhasil
     */
    bool rollbackToLastKnownGood();

    /**
     * Akses config saat ini.
     */
    SystemConfig& getConfig();

    /**
     * Cek status apakah config baru sedang pending pembuktian koneksi.
     */
    bool isPending() const;

    /**
     * Set status pending config.
     */
    void setPending(bool pending);

private:
    SystemConfig _config;
    bool         _pending;

    bool _loadFromFile();
};
