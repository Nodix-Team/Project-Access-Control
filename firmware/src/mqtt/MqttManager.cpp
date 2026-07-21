// ============================================================
//  MqttManager.cpp
//  ESP32 Access Control System — v0.2.0
// ============================================================
#include "MqttManager.h"

// Static instance untuk callback PubSubClient
MqttManager* MqttManager::_instance = nullptr;

// ─── Constructor ─────────────────────────────────────────────
MqttManager::MqttManager(ConfigManager& config, UserStorage& storage, OfflineLogBuffer& offlineLog)
    : _config(config),
      _storage(storage),
      _offlineLog(offlineLog),
      _mqtt(_wifiClient),
      _lastReconnectMs(0),
      _lastStatusMs(0),
      _wasConnected(false)
{
    _instance = this;
}

// ─── begin() ─────────────────────────────────────────────────
bool MqttManager::begin() {
    if (!_connectWifi()) {
        Serial.println("[MQTT] WiFi gagal, MQTT tidak akan berjalan");
        return false;
    }

    _mqtt.setServer(
        _config.getConfig().mqtt_broker.c_str(),
        _config.getConfig().mqtt_port
    );
    _mqtt.setCallback(_mqttCallback);
    _mqtt.setBufferSize(MQTT_BUFFER_SIZE);
    _mqtt.setKeepAlive(15);

    return _connectMqtt();
}

// ─── loop() ──────────────────────────────────────────────────
void MqttManager::loop() {
    unsigned long now = millis();

    // Cek koneksi WiFi
    if (WiFi.status() != WL_CONNECTED) {
        if (now - _lastReconnectMs > MQTT_RECONNECT_INTERVAL_MS) {
            _lastReconnectMs = now;
            Serial.println("[WiFi] Koneksi terputus, mencoba reconnect...");
            WiFi.reconnect();
        }
        _wasConnected = false;
        return;
    }

    // Cek koneksi MQTT
    if (!_mqtt.connected()) {
        _wasConnected = false;
        if (now - _lastReconnectMs > MQTT_RECONNECT_INTERVAL_MS) {
            _lastReconnectMs = now;
            Serial.println("[MQTT] Koneksi terputus, mencoba reconnect...");
            _connectMqtt();
        }
        return;
    }

    // MQTT loop
    _mqtt.loop();

    // Jika baru saja terhubung kembali, replay log offline
    if (!_wasConnected) {
        _wasConnected = true;
        Serial.println("[MQTT] Koneksi terjalin, memeriksa log offline...");
        if (_offlineLog.hasLogs()) {
            _offlineLog.replayLogs([this](const String& csvLine) -> bool {
                return this->_sendOfflineLog(csvLine);
            });
        }
    }

    // Heartbeat status dinamis sesuai heartbeat_s
    unsigned long heartbeatMs = _config.getConfig().heartbeat_s * 1000;
    if (heartbeatMs == 0) heartbeatMs = 30000; // Default 30s jika 0
    
    if (now - _lastStatusMs > heartbeatMs) {
        _lastStatusMs = now;
        publishStatus();
    }
}

// ─── isConnected() ───────────────────────────────────────────
bool MqttManager::isConnected() {
    return _mqtt.connected();
}

// ─── publishLog() ────────────────────────────────────────────
void MqttManager::publishLog(const String& kartu, int door, bool granted, const String& resultReason) {
    String statusStr = granted ? "GRANTED" : "DENIED";
    
    if (!_mqtt.connected()) {
        // Simpan log secara lokal karena sedang offline
        Serial.println("[MQTT] Offline, menyimpan log transaksi ke LittleFS...");
        _offlineLog.appendLog(millis(), kartu, door, statusStr, resultReason);
        return;
    }

    // Format: kartu,door_number,status,reason,uptime_ms
    String payload = kartu + "," + String(door) + "," + statusStr + "," + resultReason + "," + String(millis());
    String topic = _getTopic("logs");

    bool ok = _mqtt.publish(topic.c_str(), payload.c_str(), true); // QoS 1 simulation
    if (!ok) {
        Serial.println("[MQTT] Gagal publish log, menyimpan ke buffer offline");
        _offlineLog.appendLog(millis(), kartu, door, statusStr, resultReason);
    }
}

// ─── publishStatus() ─────────────────────────────────────────
void MqttManager::publishStatus() {
    if (!_mqtt.connected()) return;

    // Format CSV: total_doors,user_count,free_heap,uptime_ms
    String payload = String(_config.getConfig().total_doors) + "," +
                     String(_storage.getUserCount()) + "," +
                     String(ESP.getFreeHeap()) + "," +
                     String(millis());

    String topic = _getTopic("status");
    _mqtt.publish(topic.c_str(), payload.c_str(), false);
    Serial.printf("[MQTT] Status published -> %d users, Heap: %d\n",
                  _storage.getUserCount(), (int)ESP.getFreeHeap());
}

// ─── Private: Connect WiFi ────────────────────────────────────
bool MqttManager::_connectWifi() {
    const SystemConfig& cfg = _config.getConfig();
    Serial.printf("[WiFi] Menghubungkan ke '%s'", cfg.wifi_ssid.c_str());

    WiFi.mode(WIFI_STA);
    
    // Konfigurasi IP static jika diatur
    if (cfg.ip_mode == "static") {
        IPAddress local_IP, gateway, subnet;
        local_IP.fromString(cfg.ip_address);
        gateway.fromString(cfg.gateway);
        subnet.fromString(cfg.subnet_mask);
        if (!WiFi.config(local_IP, gateway, subnet)) {
            Serial.println("\n[WiFi] GAGAL mengatur IP Static");
        }
    }

    WiFi.begin(cfg.wifi_ssid.c_str(), cfg.wifi_password.c_str());

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
        return true;
    }

    Serial.println("\n[WiFi] GAGAL terhubung ke WiFi");
    return false;
}

// ─── Private: Connect MQTT ───────────────────────────────────
bool MqttManager::_connectMqtt() {
    const SystemConfig& cfg = _config.getConfig();
    Serial.printf("[MQTT] Menghubungkan ke %s:%d sebagai %s...\n",
                  cfg.mqtt_broker.c_str(), cfg.mqtt_port, cfg.device_id.c_str());

    String lwtTopic = _getTopic("status/lwt");
    
    if (_mqtt.connect(
            cfg.device_id.c_str(), 
            cfg.mqtt_user.c_str(), 
            cfg.mqtt_password.c_str(),
            lwtTopic.c_str(),
            1,
            true,
            "offline"
        )) 
    {
        Serial.println("[MQTT] Terhubung!");
        
        _mqtt.publish(lwtTopic.c_str(), "online", true);
        
        _subscribeAll();
        publishStatus();
        return true;
    }

    Serial.printf("[MQTT] GAGAL, state=%d\n", _mqtt.state());
    return false;
}

// ─── Private: Subscribe Topics ───────────────────────────────
void MqttManager::_subscribeAll() {
    _mqtt.subscribe(_getTopic("users/set").c_str(), 1);       // QoS 1
    _mqtt.subscribe(_getTopic("users/delete").c_str(), 1);    // QoS 1
    _mqtt.subscribe(_getTopic("users/sync/start").c_str(), 1); // QoS 1
    _mqtt.subscribe(_getTopic("users/sync/end").c_str(), 1);   // QoS 1
    _mqtt.subscribe(_getTopic("config/set").c_str(), 1);      // QoS 1
    _mqtt.subscribe(_getTopic("config/request").c_str(), 1);  // QoS 1

    Serial.println("[MQTT] Subscribed to per-device topics.");
}

// ─── Dynamic Topic Helper ────────────────────────────────────
String MqttManager::_getTopic(const String& suffix) {
    return "access/" + _config.getConfig().device_id + "/" + suffix;
}

// ─── Static Callback ─────────────────────────────────────────
void MqttManager::_mqttCallback(char* topic, byte* payload, unsigned int length) {
    if (_instance == nullptr) return;

    String topicStr  = String(topic);
    String payloadStr;
    payloadStr.reserve(length);
    for (unsigned int i = 0; i < length; i++) {
        payloadStr += (char)payload[i];
    }

    _instance->_onMessage(topicStr, payloadStr);
}

// ─── Message Router ──────────────────────────────────────────
void MqttManager::_onMessage(const String& topic, const String& payload) {
    Serial.println();
    Serial.println("─────────────────────────────────────────");
    Serial.printf("[MQTT] <- Topic  : %s\n", topic.c_str());
    Serial.printf("[MQTT] <- Payload: %s\n", payload.c_str());
    Serial.println("─────────────────────────────────────────");

    if (topic == _getTopic("users/set"))             { _handleSet(payload); }
    else if (topic == _getTopic("users/delete"))       { _handleDelete(payload); }
    else if (topic == _getTopic("users/sync/start"))   { _handleSyncStart(payload); }
    else if (topic == _getTopic("users/sync/end"))     { _handleSyncEnd(payload); }
    else if (topic == _getTopic("config/set"))         { _handleConfigSet(payload); }
    else if (topic == _getTopic("config/request"))     { _handleConfigRequest(payload); }
    else {
        Serial.printf("[MQTT] Topic tidak dikenal: %s\n", topic.c_str());
    }
}

// ─── Handler: Set User (CSV: kartu,doors) ─────────────────────
void MqttManager::_handleSet(const String& payload) {
    int commaIdx = payload.indexOf(',');
    if (commaIdx == -1) {
        Serial.println("[MQTT] Format CSV set user salah (tidak ada koma)");
        return;
    }

    String kartu = payload.substring(0, commaIdx);
    String doorsStr = payload.substring(commaIdx + 1);
    kartu.trim();
    doorsStr.trim();

    if (kartu.isEmpty()) return;

    // Parse doors (Format: 1|2|3)
    std::vector<int> doors;
    int curIdx = 0;
    while (curIdx < (int)doorsStr.length()) {
        int pipeIdx = doorsStr.indexOf('|', curIdx);
        String dVal;
        if (pipeIdx == -1) {
            dVal = doorsStr.substring(curIdx);
            curIdx = doorsStr.length();
        } else {
            dVal = doorsStr.substring(curIdx, pipeIdx);
            curIdx = pipeIdx + 1;
        }
        dVal.trim();
        int d = dVal.toInt();
        if (d >= 1 && d <= 4) doors.push_back(d);
    }

    if (_storage.isSyncInProgress()) {
        _storage.addStagingUser(kartu, doors);
    } else {
        _storage.setUser(kartu, doors);
    }
}

// ─── Handler: Delete User (CSV: kartu) ────────────────────────
void MqttManager::_handleDelete(const String& payload) {
    String kartu = payload;
    kartu.trim();
    if (kartu.isEmpty()) return;

    _storage.deleteUser(kartu);
}

// ─── Handler: Sync Start (CSV: sync_id) ───────────────────────
void MqttManager::_handleSyncStart(const String& payload) {
    String syncId = payload;
    syncId.trim();
    if (syncId.isEmpty()) return;

    _storage.startSync(syncId);
}

// ─── Handler: Sync End (CSV: sync_id,count) ───────────────────
void MqttManager::_handleSyncEnd(const String& payload) {
    int commaIdx = payload.indexOf(',');
    if (commaIdx == -1) return;

    String syncId = payload.substring(0, commaIdx);
    String countStr = payload.substring(commaIdx + 1);
    syncId.trim();
    countStr.trim();
    
    int count = countStr.toInt();

    String resultTopic = _getTopic("sync/result");
    if (_storage.endSync(syncId, count)) {
        String resPayload = syncId + ",OK," + String(count);
        _mqtt.publish(resultTopic.c_str(), resPayload.c_str(), true); // QoS 1
    } else {
        String resPayload = syncId + ",MISMATCH," + String(_storage.getUserCount());
        _mqtt.publish(resultTopic.c_str(), resPayload.c_str(), true); // QoS 1
    }
}

// ─── Handler: Config Set (CSV: key,value) ─────────────────────
void MqttManager::_handleConfigSet(const String& payload) {
    int commaIdx = payload.indexOf(',');
    if (commaIdx == -1) return;

    String key = payload.substring(0, commaIdx);
    String val = payload.substring(commaIdx + 1);
    key.trim();
    val.trim();

    SystemConfig& cfg = _config.getConfig();
    bool isDangerous = false;

    if (key == "wifi_ssid") {
        cfg.wifi_ssid = val;
        isDangerous = true;
    } else if (key == "wifi_password") {
        cfg.wifi_password = val;
        isDangerous = true;
    } else if (key == "mqtt_broker") {
        cfg.mqtt_broker = val;
        isDangerous = true;
    } else if (key == "mqtt_port") {
        cfg.mqtt_port = val.toInt();
        isDangerous = true;
    } else if (key == "mqtt_user") {
        cfg.mqtt_user = val;
        isDangerous = true;
    } else if (key == "mqtt_password") {
        cfg.mqtt_password = val;
        isDangerous = true;
    } else if (key == "heartbeat_s") {
        cfg.heartbeat_s = val.toInt();
    } else if (key == "total_doors") {
        cfg.total_doors = val.toInt();
    } else if (key == "ip_mode") {
        cfg.ip_mode = val;
        isDangerous = true;
    } else if (key == "ip_address") {
        cfg.ip_address = val;
        isDangerous = true;
    } else if (key == "subnet_mask") {
        cfg.subnet_mask = val;
        isDangerous = true;
    } else if (key == "gateway") {
        cfg.gateway = val;
        isDangerous = true;
    }

    if (isDangerous) {
        Serial.printf("[MQTT] Perubahan konfigurasi bahaya (%s) diterima. Menyiapkan rollback dan reboot...\n", key.c_str());
        _config.saveLastKnownGood();
        _config.setPending(true);
        delay(1000);
        ESP.restart();
    } else {
        _config.saveConfig();
        Serial.printf("[MQTT] Perubahan konfigurasi aman (%s=%s) diterapkan.\n", key.c_str(), val.c_str());
    }
}

// ─── Handler: Config Request ─────────────────────────────────
void MqttManager::_handleConfigRequest(const String& payload) {
    const SystemConfig& cfg = _config.getConfig();

    String response = "wifi_ssid," + cfg.wifi_ssid +
                      ",mqtt_broker," + cfg.mqtt_broker +
                      ",mqtt_port," + String(cfg.mqtt_port) +
                      ",mqtt_user," + cfg.mqtt_user +
                      ",heartbeat_s," + String(cfg.heartbeat_s) +
                      ",total_doors," + String(cfg.total_doors) +
                      ",ip_mode," + cfg.ip_mode +
                      ",ip_address," + cfg.ip_address +
                      ",subnet_mask," + cfg.subnet_mask +
                      ",gateway," + cfg.gateway;

    String responseTopic = _getTopic("config/response");
    _mqtt.publish(responseTopic.c_str(), response.c_str(), true); // QoS 1
}

// ─── Helper: Replay Offline Log ──────────────────────────────
bool MqttManager::_sendOfflineLog(const String& csvLine) {
    int firstComma = csvLine.indexOf(',');
    if (firstComma == -1) return true;
    String uptime = csvLine.substring(0, firstComma);
    
    int secondComma = csvLine.indexOf(',', firstComma + 1);
    if (secondComma == -1) return true;
    String kartu = csvLine.substring(firstComma + 1, secondComma);

    int thirdComma = csvLine.indexOf(',', secondComma + 1);
    if (thirdComma == -1) return true;
    String door = csvLine.substring(secondComma + 1, thirdComma);

    int fourthComma = csvLine.indexOf(',', thirdComma + 1);
    
    String status;
    String reason;
    if (fourthComma == -1) {
        // Fallback robust untuk file log format 4 kolom lama
        status = csvLine.substring(thirdComma + 1);
        status.trim();
        reason = (status == "GRANTED") ? "OK" : "NO_ACCESS";
    } else {
        status = csvLine.substring(thirdComma + 1, fourthComma);
        reason = csvLine.substring(fourthComma + 1);
        status.trim();
        reason.trim();
    }

    String payload = kartu + "," + door + "," + status + "," + reason + "," + uptime + ",REPLAYED";
    String topic = _getTopic("logs");

    return _mqtt.publish(topic.c_str(), payload.c_str(), true);
}
