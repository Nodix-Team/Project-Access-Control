// ============================================================
//  ConfigManager.h
//  Mengelola konfigurasi sistem dari/ke LittleFS (config.json)
//  ESP32 Access Control System — v0.1.0
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
    String device_id;
    String door_names[4];  // Nama pintu 1-4
};

// ============================================================
//  Class ConfigManager
//  - Load config dari LittleFS saat boot
//  - Jika belum ada, buat dengan nilai default (hardcoded)
//  - Save config ke LittleFS
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
     * Dipanggil dari begin() sebelum load dari file.
     */
    void setDefaults(
        const String& wifiSsid,
        const String& wifiPass,
        const String& mqttBroker,
        int            mqttPort,
        const String& deviceId,
        const String  doorNames[4]
    );

    /**
     * Simpan config saat ini ke config.json di LittleFS.
     * @return true jika berhasil
     */
    bool saveConfig();

    /**
     * Akses config saat ini.
     */
    SystemConfig& getConfig();

private:
    SystemConfig _config;

    bool _loadFromFile();
};
