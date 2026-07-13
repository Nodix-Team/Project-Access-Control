// ============================================================
//  main.cpp — Entry Point
//  ESP32 Access Control System — Prototype v0.1.0
//
//  Konfigurasi:
//    Edit bagian "KONFIGURASI SISTEM" di bawah sebelum upload
// ============================================================
#include <Arduino.h>
#include <LittleFS.h>

#include "access/AccessControl.h"
#include "config/ConfigManager.h"
#include "mqtt/MqttManager.h"
#include "serial/SerialSim.h"
#include "storage/UserStorage.h"

// ============================================================
//  ★ KONFIGURASI SISTEM — Edit di sini sebelum upload ★
// ============================================================
#define WIFI_SSID       "REDMI"
#define WIFI_PASSWORD   "Danas123"
#define MQTT_BROKER     "10.227.215.153"   // IP laptop yang menjalankan EMQX
#define MQTT_PORT       1883
#define DEVICE_ID       "esp32-ac-001"

const String DOOR_NAMES[4] = {
    "pintu1",    // Pintu 1
    "pintu2",    // Pintu 2
    "pintu3",    // Pintu 3
    "pintu4"     // Pintu 4
};
// ============================================================

// ─── Objek global ────────────────────────────────────────────
ConfigManager configManager;
UserStorage userStorage;
AccessControl accessControl(userStorage);
MqttManager mqttManager(configManager, userStorage);
SerialSim serialSim(accessControl, userStorage, configManager);

// ─── setup() ─────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500); // Tunggu Serial siap

  Serial.println("\n[SYS] Booting ESP32 Access Control v0.1.0...");

  // 1. Inisialisasi LittleFS
  // Parameter true = format jika mount gagal (hanya pertama kali)
  if (!LittleFS.begin(true)) {
    Serial.println("[SYS] FATAL: LittleFS gagal mount!");
    Serial.println("[SYS] Coba: pio run --target uploadfs");
    while (true) {
      delay(1000);
    }
  }
  Serial.printf("[SYS] LittleFS OK — Total: %d KB, Used: %d KB\n",
                (int)(LittleFS.totalBytes() / 1024),
                (int)(LittleFS.usedBytes() / 1024));

  // 2. Inisialisasi Config (hardcoded defaults → disimpan ke LittleFS)
  configManager.setDefaults(WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER, MQTT_PORT,
                            DEVICE_ID, DOOR_NAMES);
  configManager.saveConfig(); // Selalu timpa config.json dengan nilai terbaru dari main.cpp
  if (!configManager.begin()) {
    Serial.println("[SYS] WARNING: Config gagal, menggunakan nilai hardcoded");
  }

  // 3. Inisialisasi UserStorage (load dari LittleFS)
  if (!userStorage.begin()) {
    Serial.println("[SYS] WARNING: UserStorage gagal load, mulai dari kosong");
  }
  Serial.printf("[SYS] User terdaftar: %d\n", userStorage.getUserCount());

  // 4. Inisialisasi MQTT (connect WiFi + MQTT broker)
  bool mqttOk = mqttManager.begin();
  if (!mqttOk) {
    Serial.println("[SYS] WARNING: MQTT tidak terhubung.");
    Serial.println("[SYS] Sistem tetap berjalan dengan Serial sim saja.");
  }

  // 5. Setup SerialSim + callback untuk MQTT log
  serialSim.setLogCallback([](int uid, const String &kartu, const String &nama,
                              int door, bool granted, const String &doorName) {
    // Forward log ke MQTT (jika terhubung)
    mqttManager.publishLog(uid, kartu, nama, door, granted, doorName);
  });
  serialSim.begin();

  Serial.println("[SYS] System ready!\n");
}

// ─── loop() ──────────────────────────────────────────────────
void loop() {
  // MQTT loop (handle incoming messages + reconnect)
  mqttManager.loop();

  // Serial simulation loop (non-blocking)
  serialSim.loop();
}
