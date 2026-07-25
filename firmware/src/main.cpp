// ============================================================
//  main.cpp — Entry Point
//  ESP32 Access Control System — v0.2.0
// ============================================================
#include <Arduino.h>
#include <LittleFS.h>

#include "access/AccessControl.h"
#include "config/ConfigManager.h"
#include "mqtt/MqttManager.h"
#include "serial/SerialSim.h"
#include "storage/UserStorage.h"
#include "storage/OfflineLogBuffer.h"
#include "web/WebConfigServer.h"
#include "sensing/PowerSensor.h"
#include <WiFi.h>

// ============================================================
//  ★ KONFIGURASI DEFAULT SISTEM — Disimpan ke LittleFS jika kosong ★
// ============================================================
#define WIFI_SSID       "REDMI"
#define WIFI_PASSWORD   "Danas123"
#define MQTT_BROKER     "127.0.0.1"        // IP Localhost EMQX
#define MQTT_PORT       1883
#define MQTT_USER       "ctrl-A"
#define MQTT_PASSWORD   "ctrlA123"
#define DEVICE_ID       "esp32-ac-001"
#define HEARTBEAT_S     30
#define TOTAL_DOORS     4

const String DOOR_NAMES[4] = {
    "Lobby Utama",     // Pintu 1
    "Ruang Server",    // Pintu 2
    "Ruang Meeting",   // Pintu 3
    "Ruang Arsip"      // Pintu 4
};
// ============================================================

// ─── Objek global ────────────────────────────────────────────
ConfigManager    configManager;
UserStorage      userStorage;
OfflineLogBuffer offlineLogBuffer;
AccessControl    accessControl(userStorage);
MqttManager      mqttManager(configManager, userStorage, offlineLogBuffer);
SerialSim        serialSim(accessControl, userStorage, configManager);
WebConfigServer  webConfigServer(configManager, userStorage);
PowerSensor      powerSensor;

// ─── setup() ─────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n[SYS] Booting ESP32 Access Control v0.2.0...");

  // 1. Inisialisasi LittleFS
  if (!LittleFS.begin(true)) {
    Serial.println("[SYS] FATAL: LittleFS gagal mount!");
    while (true) delay(1000);
  }
  Serial.printf("[SYS] LittleFS OK — Total: %d KB, Used: %d KB\n",
                (int)(LittleFS.totalBytes() / 1024),
                (int)(LittleFS.usedBytes() / 1024));

  // 2. Inisialisasi Offline Log Buffer
  offlineLogBuffer.begin();

  // 3. Inisialisasi Config
  configManager.setDefaults(
      WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER, MQTT_PORT, 
      MQTT_USER, MQTT_PASSWORD, DEVICE_ID, HEARTBEAT_S, TOTAL_DOORS, DOOR_NAMES
  );
  if (!configManager.begin()) {
    Serial.println("[SYS] WARNING: Config gagal inisialisasi");
  }

  // 4. Inisialisasi UserStorage
  if (!userStorage.begin()) {
    Serial.println("[SYS] WARNING: UserStorage gagal load, mulai dari kosong");
  }
  Serial.printf("[SYS] User terdaftar: %d\n", userStorage.getUserCount());

  // 5. Setup SerialSim + callback untuk MQTT log
  serialSim.setLogCallback([](const String& kartu, int door, bool granted, const String& reason) {
    mqttManager.publishLog(kartu, door, granted, reason);
  });
  serialSim.begin();

  // 6. Jalankan Local Web Config Server
  WiFi.mode(WIFI_STA); // Inisialisasi TCP/IP stack agar WebServer tidak crash
  webConfigServer.begin();

  // 6.5. Inisialisasi Power Sensor (Fase 1 Prototipe)
  powerSensor.begin();

  // 7. Pengujian Koneksi & Mekanisme Rollback (Anti-Brick)
  if (configManager.isPending()) {
    Serial.println("[SYS] DETEKSI CONFIG PENDING! Menjalankan uji koneksi selama 60 detik...");
    
    // Mulai inisialisasi koneksi wifi + mqtt
    bool connected = mqttManager.begin();
    unsigned long startMs = millis();

    while (!connected && (millis() - startMs < 60000)) {
      delay(1000);
      mqttManager.loop(); // Re-trigger loop reconnect wifi/mqtt
      if (mqttManager.isConnected()) {
        connected = true;
        break;
      }
    }

    if (connected) {
      Serial.println("[SYS] Koneksi SUKSES! Konfigurasi baru telah diverifikasi dan dikonfirmasi.");
      configManager.setPending(false); // Hapus status pending
    } else {
      Serial.println("[SYS] Koneksi GAGAL setelah 60 detik! Melakukan ROLLBACK konfigurasi...");
      configManager.rollbackToLastKnownGood();
      delay(1000);
      ESP.restart(); // Reboot dengan konfigurasi lama yang aman
    }
  } else {
    // Boot normal tanpa perubahan config berbahaya
    mqttManager.begin();
  }

  Serial.println("[SYS] System ready!\n");
}

// ─── loop() ──────────────────────────────────────────────────
void loop() {
  mqttManager.loop();
  serialSim.loop();
  webConfigServer.handleClient();
  powerSensor.loop();
}
