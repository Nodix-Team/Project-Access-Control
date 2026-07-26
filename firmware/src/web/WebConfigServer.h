// ============================================================
//  WebConfigServer.h
//  Web server lokal untuk setup WiFi, MQTT, dan IP Address
//  ESP32 Access Control System — v0.2.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <WebServer.h>
#include "../config/ConfigManager.h"
#include "../storage/UserStorage.h"

class WebConfigServer {
public:
    WebConfigServer(ConfigManager& config, UserStorage& storage);

    /**
     * Jalankan server di port default (8081).
     */
    void begin();

    /**
     * Panggil di loop utama untuk menangani request klien.
     */
    void handleClient();

private:
    ConfigManager& _config;
    UserStorage&   _storage;
    WebServer      _server;

    // Routing Handlers
    void _handleRoot();
    void _handleSave();
    void _handleUpdateSuccess();
    void _handleUpdateUpload();
    void _handleNotFound();

    // Helper untuk membuat HTML Dashboard & Form
    String _generateHtml();
};
