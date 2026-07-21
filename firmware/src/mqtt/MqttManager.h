// ============================================================
//  MqttManager.h
//  Mengelola koneksi WiFi + MQTT (EMQX local) dengan autentikasi
//  Subscribe: user management & config topics (per-device)
//  Publish:   access logs + status heartbeat (per-device)
//  ESP32 Access Control System — v0.2.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "../config/ConfigManager.h"
#include "../storage/UserStorage.h"
#include "../storage/OfflineLogBuffer.h"

// ─── Interval ────────────────────────────────────────────────
#define MQTT_RECONNECT_INTERVAL_MS  5000
#define MQTT_BUFFER_SIZE            8192   // Menampung payload QoS 1 besar

// ============================================================
//  Class MqttManager
// ============================================================
class MqttManager {
public:
    MqttManager(ConfigManager& config, UserStorage& storage, OfflineLogBuffer& offlineLog);

    /**
     * Inisialisasi: connect WiFi lalu MQTT dengan credentials.
     * @return true jika MQTT berhasil connect
     */
    bool begin();

    /**
     * Harus dipanggil di loop() utama.
     * Menangani: mqtt.loop(), reconnect, heartbeat status, dan offline log replay.
     */
    void loop();

    /**
     * Cek apakah MQTT sedang terhubung.
     */
    bool isConnected();

    /**
     * Publish log transaksi ke topic access/{device_id}/logs (QoS 1).
     * Jika MQTT terputus, log disimpan otomatis ke OfflineLogBuffer.
     */
    void publishLog(const String& kartu, int door, bool granted, const String& resultReason);

    /**
     * Publish status device ke topic access/{device_id}/status (QoS 0).
     */
    void publishStatus();

private:
    ConfigManager&     _config;
    UserStorage&       _storage;
    OfflineLogBuffer&  _offlineLog;
    WiFiClient         _wifiClient;
    PubSubClient       _mqtt;

    unsigned long _lastReconnectMs;
    unsigned long _lastStatusMs;
    bool          _wasConnected;

    // WiFi
    bool _connectWifi();

    // MQTT
    bool _connectMqtt();
    void _subscribeAll();

    // Helper untuk Topic dinamis
    String _getTopic(const String& suffix);

    // Callback MQTT (static karena PubSubClient butuh function pointer)
    static MqttManager* _instance;
    static void _mqttCallback(char* topic, byte* payload, unsigned int length);

    // Handler per topic
    void _onMessage(const String& topic, const String& payload);
    void _handleSet(const String& payload);
    void _handleDelete(const String& payload);
    void _handleSyncStart(const String& payload);
    void _handleSyncEnd(const String& payload);
    void _handleConfigSet(const String& payload);
    void _handleConfigRequest(const String& payload);

    // Log offline replay handler
    bool _sendOfflineLog(const String& csvLine);
};
