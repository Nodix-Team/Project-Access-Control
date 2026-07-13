// ============================================================
//  MqttManager.h
//  Mengelola koneksi WiFi + MQTT (EMQX local)
//  Subscribe: user management topics
//  Publish:   access logs + status heartbeat
//  ESP32 Access Control System — v0.1.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "../config/ConfigManager.h"
#include "../storage/UserStorage.h"

// ─── MQTT Topics ─────────────────────────────────────────────
#define TOPIC_USERS_ADD     "access/users/add"
#define TOPIC_USERS_DELETE  "access/users/delete"
#define TOPIC_USERS_UPDATE  "access/users/update"
#define TOPIC_USERS_SYNC    "access/users/sync"
#define TOPIC_LOGS          "access/logs"
#define TOPIC_STATUS        "access/status"

// ─── Interval ────────────────────────────────────────────────
#define MQTT_RECONNECT_INTERVAL_MS  5000
#define MQTT_STATUS_INTERVAL_MS     30000
#define MQTT_BUFFER_SIZE            4096   // Untuk payload sync besar

// ============================================================
//  Class MqttManager
// ============================================================
class MqttManager {
public:
    MqttManager(ConfigManager& config, UserStorage& storage);

    /**
     * Inisialisasi: connect WiFi lalu MQTT.
     * @return true jika MQTT berhasil connect
     */
    bool begin();

    /**
     * Harus dipanggil di loop() utama.
     * Menangani: mqtt.loop(), reconnect, heartbeat status.
     */
    void loop();

    /**
     * Cek apakah MQTT sedang terhubung.
     */
    bool isConnected();

    /**
     * Publish log transaksi ke topic access/logs.
     * Dipanggil setelah setiap scan kartu di Serial sim.
     */
    void publishLog(int uid, const String& kartu, const String& nama,
                    int door, bool granted, const String& doorName);

    /**
     * Publish status device ke topic access/status.
     * Otomatis dipanggil setiap MQTT_STATUS_INTERVAL_MS.
     */
    void publishStatus();

private:
    ConfigManager& _config;
    UserStorage&   _storage;
    WiFiClient     _wifiClient;
    PubSubClient   _mqtt;

    unsigned long _lastReconnectMs;
    unsigned long _lastStatusMs;

    // WiFi
    bool _connectWifi();

    // MQTT
    bool _connectMqtt();
    void _subscribeAll();

    // Callback MQTT (static karena PubSubClient butuh function pointer)
    static MqttManager* _instance;
    static void _mqttCallback(char* topic, byte* payload, unsigned int length);

    // Handler per topic
    void _onMessage(const String& topic, const String& payload);
    void _handleAdd(const String& payload);
    void _handleDelete(const String& payload);
    void _handleUpdate(const String& payload);
    void _handleSync(const String& payload);
};
