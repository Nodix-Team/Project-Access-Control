// ============================================================
//  MqttManager.cpp
//  ESP32 Access Control System — v0.1.0
// ============================================================
#include "MqttManager.h"

// Static instance untuk callback PubSubClient
MqttManager* MqttManager::_instance = nullptr;

// ─── Constructor ─────────────────────────────────────────────
MqttManager::MqttManager(ConfigManager& config, UserStorage& storage)
    : _config(config),
      _storage(storage),
      _mqtt(_wifiClient),
      _lastReconnectMs(0),
      _lastStatusMs(0)
{
    _instance = this;
}

// ─── begin() ─────────────────────────────────────────────────
bool MqttManager::begin() {
    if (!_connectWifi()) {
        Serial.println("[MQTT] WiFi gagal, MQTT tidak akan berjalan");
        return false;
    }

    // Konfigurasi PubSubClient
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
        return;
    }

    // Cek koneksi MQTT
    if (!_mqtt.connected()) {
        if (now - _lastReconnectMs > MQTT_RECONNECT_INTERVAL_MS) {
            _lastReconnectMs = now;
            Serial.println("[MQTT] Koneksi terputus, mencoba reconnect...");
            _connectMqtt();
        }
        return;
    }

    // MQTT loop — proses incoming messages
    _mqtt.loop();

    // Heartbeat status
    if (now - _lastStatusMs > MQTT_STATUS_INTERVAL_MS) {
        _lastStatusMs = now;
        publishStatus();
    }
}

// ─── isConnected() ───────────────────────────────────────────
bool MqttManager::isConnected() {
    return _mqtt.connected();
}

// ─── publishLog() ────────────────────────────────────────────
void MqttManager::publishLog(int uid, const String& kartu, const String& nama,
                              int door, bool granted, const String& doorName) {
    if (!_mqtt.connected()) return;

    JsonDocument doc;
    doc["timestamp"] = millis();
    doc["uid"]       = uid;
    doc["kartu"]     = kartu;
    doc["nama"]      = nama;
    doc["pintu"]     = door;
    doc["nama_pintu"]= doorName;
    doc["status"]    = granted ? "GRANTED" : "DENIED";

    String out;
    serializeJson(doc, out);

    bool ok = _mqtt.publish(TOPIC_LOGS, out.c_str(), false);
    if (!ok) {
        Serial.println("[MQTT] Gagal publish log (buffer penuh?)");
    }
}

// ─── publishStatus() ─────────────────────────────────────────
void MqttManager::publishStatus() {
    if (!_mqtt.connected()) return;

    JsonDocument doc;
    doc["device_id"]  = _config.getConfig().device_id;
    doc["uptime_ms"]  = millis();
    doc["user_count"] = _storage.getUserCount();
    doc["ip"]         = WiFi.localIP().toString();
    doc["rssi"]       = WiFi.RSSI();
    doc["free_heap"]  = ESP.getFreeHeap();

    String out;
    serializeJson(doc, out);
    _mqtt.publish(TOPIC_STATUS, out.c_str(), false);
    Serial.printf("[MQTT] Status published → %d users, IP: %s\n",
                  _storage.getUserCount(), WiFi.localIP().toString().c_str());
}

// ─── Private: Connect WiFi ────────────────────────────────────
bool MqttManager::_connectWifi() {
    const SystemConfig& cfg = _config.getConfig();
    Serial.printf("[WiFi] Menghubungkan ke '%s'", cfg.wifi_ssid.c_str());

    WiFi.mode(WIFI_STA);
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
    Serial.printf("[MQTT] Menghubungkan ke %s:%d ...\n",
                  cfg.mqtt_broker.c_str(), cfg.mqtt_port);

    if (_mqtt.connect(cfg.device_id.c_str())) {
        Serial.printf("[MQTT] Terhubung sebagai '%s'\n", cfg.device_id.c_str());
        _subscribeAll();
        publishStatus();
        return true;
    }

    Serial.printf("[MQTT] GAGAL, state=%d\n", _mqtt.state());
    Serial.println("[MQTT] State codes: -4=TIMEOUT -3=LOST -2=FAILED -1=DISCONNECTED 1=BAD_PROTO 2=BAD_CLIENTID 3=UNAVAILABLE 4=BAD_CREDENTIALS 5=UNAUTHORIZED");
    return false;
}

// ─── Private: Subscribe Topics ───────────────────────────────
void MqttManager::_subscribeAll() {
    _mqtt.subscribe(TOPIC_USERS_ADD);
    _mqtt.subscribe(TOPIC_USERS_DELETE);
    _mqtt.subscribe(TOPIC_USERS_UPDATE);
    _mqtt.subscribe(TOPIC_USERS_SYNC);

    Serial.println("[MQTT] Subscribed topics:");
    Serial.println("  → " TOPIC_USERS_ADD);
    Serial.println("  → " TOPIC_USERS_DELETE);
    Serial.println("  → " TOPIC_USERS_UPDATE);
    Serial.println("  → " TOPIC_USERS_SYNC);
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
    Serial.printf("[MQTT] ← Topic  : %s\n", topic.c_str());
    Serial.printf("[MQTT] ← Payload: %s\n", payload.c_str());
    Serial.println("─────────────────────────────────────────");

    if (topic == TOPIC_USERS_ADD)    { _handleAdd(payload);    }
    else if (topic == TOPIC_USERS_DELETE) { _handleDelete(payload); }
    else if (topic == TOPIC_USERS_UPDATE) { _handleUpdate(payload); }
    else if (topic == TOPIC_USERS_SYNC)   { _handleSync(payload);   }
    else {
        Serial.printf("[MQTT] Topic tidak dikenal: %s\n", topic.c_str());
    }
}

// ─── Handler: Add ────────────────────────────────────────────
void MqttManager::_handleAdd(const String& payload) {
    JsonDocument doc;
    if (deserializeJson(doc, payload)) {
        Serial.println("[MQTT] ERROR: Parse gagal pada add user");
        return;
    }

    String kartu = doc["kartu"] | "";
    String nama  = doc["nama"]  | "";

    if (kartu.isEmpty() || nama.isEmpty()) {
        Serial.println("[MQTT] ERROR: Field 'kartu' atau 'nama' kosong");
        return;
    }

    std::vector<int> doors;
    JsonArray arr = doc["doors"].as<JsonArray>();
    for (int d : arr) {
        if (d >= 1 && d <= 4) doors.push_back(d);
    }

    _storage.addUser(kartu, nama, doors);
}

// ─── Handler: Delete ─────────────────────────────────────────
void MqttManager::_handleDelete(const String& payload) {
    JsonDocument doc;
    if (deserializeJson(doc, payload)) {
        Serial.println("[MQTT] ERROR: Parse gagal pada delete user");
        return;
    }

    int uid = doc["uid"] | -1;
    if (uid < 0) {
        Serial.println("[MQTT] ERROR: Field 'uid' tidak valid");
        return;
    }

    _storage.deleteUser(uid);
}

// ─── Handler: Update ─────────────────────────────────────────
void MqttManager::_handleUpdate(const String& payload) {
    JsonDocument doc;
    if (deserializeJson(doc, payload)) {
        Serial.println("[MQTT] ERROR: Parse gagal pada update user");
        return;
    }

    int    uid   = doc["uid"]   | -1;
    String kartu = doc["kartu"] | "";
    String nama  = doc["nama"]  | "";

    if (uid < 0) {
        Serial.println("[MQTT] ERROR: Field 'uid' tidak valid");
        return;
    }

    std::vector<int> doors;
    JsonArray arr = doc["doors"].as<JsonArray>();
    for (int d : arr) {
        if (d >= 1 && d <= 4) doors.push_back(d);
    }

    _storage.updateUser(uid, kartu, nama, doors);
}

// ─── Handler: Sync ───────────────────────────────────────────
void MqttManager::_handleSync(const String& payload) {
    _storage.syncUsers(payload);
}
