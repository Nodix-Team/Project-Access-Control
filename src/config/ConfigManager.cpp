// ============================================================
//  ConfigManager.cpp
//  ESP32 Access Control System — v0.1.0
// ============================================================
#include "ConfigManager.h"
#include <LittleFS.h>

#define CONFIG_FILE "/config.json"

ConfigManager::ConfigManager() {
    // Default values dikosongkan, akan diisi via setDefaults()
    _config.mqtt_port = 1883;
}

bool ConfigManager::begin() {
    // Coba load dari file terlebih dahulu
    if (_loadFromFile()) {
        return true;
    }

    // File belum ada atau error → simpan nilai default ke file
    Serial.println("[Config] Membuat config.json dengan nilai default...");
    return saveConfig();
}

void ConfigManager::setDefaults(
    const String& wifiSsid,
    const String& wifiPass,
    const String& mqttBroker,
    int            mqttPort,
    const String& deviceId,
    const String  doorNames[4]
) {
    _config.wifi_ssid     = wifiSsid;
    _config.wifi_password = wifiPass;
    _config.mqtt_broker   = mqttBroker;
    _config.mqtt_port     = mqttPort;
    _config.device_id     = deviceId;
    for (int i = 0; i < 4; i++) {
        _config.door_names[i] = doorNames[i];
    }
}

bool ConfigManager::_loadFromFile() {
    File f = LittleFS.open(CONFIG_FILE, "r");
    if (!f) {
        Serial.println("[Config] config.json tidak ditemukan");
        return false;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, f);
    f.close();

    if (err) {
        Serial.printf("[Config] Parse error: %s\n", err.c_str());
        return false;
    }

    // Load nilai dari file, gunakan nilai default jika key tidak ada
    _config.wifi_ssid     = doc["wifi_ssid"]     | _config.wifi_ssid;
    _config.wifi_password = doc["wifi_password"] | _config.wifi_password;
    _config.mqtt_broker   = doc["mqtt_broker"]   | _config.mqtt_broker;
    _config.mqtt_port     = doc["mqtt_port"]     | _config.mqtt_port;
    _config.device_id     = doc["device_id"]     | _config.device_id;

    JsonArray names = doc["door_names"].as<JsonArray>();
    for (int i = 0; i < 4 && i < (int)names.size(); i++) {
        _config.door_names[i] = names[i].as<String>();
    }

    Serial.println("[Config] config.json berhasil dimuat dari LittleFS");
    return true;
}

bool ConfigManager::saveConfig() {
    File f = LittleFS.open(CONFIG_FILE, "w");
    if (!f) {
        Serial.println("[Config] Gagal membuka config.json untuk write");
        return false;
    }

    JsonDocument doc;
    doc["wifi_ssid"]     = _config.wifi_ssid;
    doc["wifi_password"] = _config.wifi_password;
    doc["mqtt_broker"]   = _config.mqtt_broker;
    doc["mqtt_port"]     = _config.mqtt_port;
    doc["device_id"]     = _config.device_id;

    JsonArray names = doc["door_names"].to<JsonArray>();
    for (int i = 0; i < 4; i++) {
        names.add(_config.door_names[i]);
    }

    size_t written = serializeJson(doc, f);
    f.close();

    if (written == 0) {
        Serial.println("[Config] Gagal menulis config.json");
        return false;
    }

    Serial.printf("[Config] config.json tersimpan (%d bytes)\n", (int)written);
    return true;
}

SystemConfig& ConfigManager::getConfig() {
    return _config;
}
