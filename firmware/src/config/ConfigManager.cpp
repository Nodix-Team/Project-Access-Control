// ============================================================
//  ConfigManager.cpp
//  ESP32 Access Control System — v0.2.0
// ============================================================
#include "ConfigManager.h"
#include <LittleFS.h>

#define CONFIG_FILE "/config.json"

ConfigManager::ConfigManager() : _pending(false) {
    _config.mqtt_port = 1883;
    _config.heartbeat_s = 30;
    _config.total_doors = 4;
    _config.ip_mode = "dhcp";
}

bool ConfigManager::begin() {
    if (_loadFromFile()) {
        return true;
    }

    Serial.println("[Config] Membuat config.json dengan nilai default...");
    return saveConfig();
}

void ConfigManager::setDefaults(
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
) {
    _config.wifi_ssid     = wifiSsid;
    _config.wifi_password = wifiPass;
    _config.mqtt_broker   = mqttBroker;
    _config.mqtt_port     = mqttPort;
    _config.mqtt_user     = mqttUser;
    _config.mqtt_password = mqttPass;
    _config.device_id     = deviceId;
    _config.heartbeat_s   = heartbeatS;
    _config.total_doors   = totalDoors;
    for (int i = 0; i < 4; i++) {
        _config.door_names[i] = doorNames[i];
    }
    _config.ip_mode       = "dhcp";
    _config.ip_address    = "";
    _config.subnet_mask   = "";
    _config.gateway       = "";
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

    _config.wifi_ssid     = doc["wifi_ssid"]     | _config.wifi_ssid;
    _config.wifi_password = doc["wifi_password"] | _config.wifi_password;
    _config.mqtt_broker   = doc["mqtt_broker"]   | _config.mqtt_broker;
    _config.mqtt_port     = doc["mqtt_port"]     | _config.mqtt_port;
    _config.mqtt_user     = doc["mqtt_user"]     | _config.mqtt_user;
    _config.mqtt_password = doc["mqtt_password"] | _config.mqtt_password;
    _config.device_id     = doc["device_id"]     | _config.device_id;
    _config.heartbeat_s   = doc["heartbeat_s"]   | _config.heartbeat_s;
    _config.total_doors   = doc["total_doors"]   | _config.total_doors;
    _config.ip_mode       = doc["ip_mode"]       | _config.ip_mode;
    _config.ip_address    = doc["ip_address"]    | _config.ip_address;
    _config.subnet_mask   = doc["subnet_mask"]   | _config.subnet_mask;
    _config.gateway       = doc["gateway"]       | _config.gateway;
    
    _pending              = doc["pending"]       | false;

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
    doc["mqtt_user"]     = _config.mqtt_user;
    doc["mqtt_password"] = _config.mqtt_password;
    doc["device_id"]     = _config.device_id;
    doc["heartbeat_s"]   = _config.heartbeat_s;
    doc["total_doors"]   = _config.total_doors;
    doc["ip_mode"]       = _config.ip_mode;
    doc["ip_address"]    = _config.ip_address;
    doc["subnet_mask"]   = _config.subnet_mask;
    doc["gateway"]       = _config.gateway;
    doc["pending"]       = _pending;

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

bool ConfigManager::saveLastKnownGood() {
    if (!LittleFS.exists(CONFIG_FILE)) return false;

    File src = LittleFS.open(CONFIG_FILE, "r");
    File dest = LittleFS.open("/config_last_known_good.json", "w");
    if (!src || !dest) {
        if (src) src.close();
        if (dest) dest.close();
        return false;
    }

    while (src.available()) {
        dest.write(src.read());
    }
    src.close();
    dest.close();
    
    Serial.println("[Config] Backup config_last_known_good.json berhasil dibuat");
    return true;
}

bool ConfigManager::rollbackToLastKnownGood() {
    if (!LittleFS.exists("/config_last_known_good.json")) {
        Serial.println("[Config] Rollback GAGAL: File backup tidak ditemukan");
        return false;
    }

    File src = LittleFS.open("/config_last_known_good.json", "r");
    File dest = LittleFS.open(CONFIG_FILE, "w");
    if (!src || !dest) {
        if (src) src.close();
        if (dest) dest.close();
        return false;
    }

    while (src.available()) {
        dest.write(src.read());
    }
    src.close();
    dest.close();

    LittleFS.remove("/config_last_known_good.json");
    Serial.println("[Config] Rollback SUKSES: config.json dikembalikan ke versi aman");
    return true;
}

SystemConfig& ConfigManager::getConfig() {
    return _config;
}

bool ConfigManager::isPending() const {
    return _pending;
}

void ConfigManager::setPending(bool pending) {
    _pending = pending;
    saveConfig();
}
