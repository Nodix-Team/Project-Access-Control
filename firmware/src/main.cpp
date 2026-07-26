// ============================================================
//  main.cpp — Entry Point
//  ESP32 Access Control System — v0.2.0
// ============================================================
#include <Arduino.h>
#include <LittleFS.h>
#include <esp_ota_ops.h>

#include "access/AccessControl.h"
#include "access/WiegandReader.h"
#include "access/DoorController.h"
#include "config/ConfigManager.h"
#include "mqtt/MqttManager.h"
#include "serial/SerialSim.h"
#include "storage/UserStorage.h"
#include "storage/OfflineLogBuffer.h"
#include "storage/NVSManager.h"
#include "web/WebConfigServer.h"
#include "sensing/PowerSensor.h"
#include "sensing/FireAlarmSensor.h"
#include "sensing/WatchdogManager.h"
#include "time/SystemClock.h"
#include "time/AutoRebootManager.h"
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
NVSManager       nvsManager;
AccessControl    accessControl(userStorage);
SystemClock      systemClock;
AutoRebootManager autoReboot(systemClock);
MqttManager      mqttManager(configManager, userStorage, offlineLogBuffer, nvsManager);
SerialSim        serialSim(accessControl, userStorage, configManager, systemClock);
WebConfigServer  webConfigServer(configManager, userStorage);
PowerSensor      powerSensor;
FireAlarmSensor  fireAlarm(PIN_SENS_FIRE_ALARM);
WatchdogManager  watchdogManager(PIN_WDT_WDI);
WiegandReader    wiegand1(PIN_WIEGAND_D0, PIN_WIEGAND_D1);
DoorController   door1(PIN_RELAY_1, PIN_REX_1);

// ─── Feedback State Machine ──────────────────────────────────
enum FeedbackState { FB_IDLE, FB_GRANTED, FB_DENIED };
FeedbackState currentFbState = FB_IDLE;
unsigned long fbStartTime = 0;

// Variabel terpisah agar ritme Buzzer dan LED tidak saling mengganggu
unsigned long fbBuzzerNext = 0;
int fbBuzzerStep = 0;
unsigned long fbLedNext = 0;
int fbLedStep = 0;

void startFeedback(FeedbackState state) {
    currentFbState = state;
    fbStartTime = millis();
    
    // Memberi jeda (200ms) agar "beep" bawaan pabrik dari reader selesai dulu,
    // sehingga ritme tambahannya tidak bertabrakan / nyambung.
    fbBuzzerNext = millis() + 200; 
    fbBuzzerStep = 0;
    
    fbLedNext = millis();
    fbLedStep = 0;
    
    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_RED, HIGH);
}

void loopFeedback() {
    if (currentFbState == FB_IDLE) return;
    
    unsigned long now = millis();
    
    if (currentFbState == FB_GRANTED) {
        // --- LED Hijau --- (Menyala solid selama 3 detik)
        if (now < fbStartTime + 3000) digitalWrite(PIN_LED_GREEN, LOW);
        else digitalWrite(PIN_LED_GREEN, HIGH);
        
        // --- Buzzer --- (Tambah 2 beep berirama agar total menjadi 3 dengan native beep)
        if (now >= fbBuzzerNext && fbBuzzerStep < 4) {
            fbBuzzerStep++;
            if (fbBuzzerStep == 1 || fbBuzzerStep == 3) {
                digitalWrite(PIN_LED_RED, LOW); // ON
                fbBuzzerNext = now + 200;       // Durasi nyala (diperlambat jadi 200ms)
            } else if (fbBuzzerStep == 2 || fbBuzzerStep == 4) {
                digitalWrite(PIN_LED_RED, HIGH); // OFF
                fbBuzzerNext = now + 200;        // Durasi mati (diperlambat jadi 200ms)
            }
        }
        
        if (now >= fbStartTime + 3000) {
            currentFbState = FB_IDLE;
            digitalWrite(PIN_LED_RED, HIGH);
            digitalWrite(PIN_LED_GREEN, HIGH);
        }
    } 
    else if (currentFbState == FB_DENIED) {
        // --- Buzzer --- (Tambah 1 beep panjang setelah native beep selesai)
        if (now >= fbBuzzerNext && fbBuzzerStep < 2) {
            fbBuzzerStep++;
            if (fbBuzzerStep == 1) {
                digitalWrite(PIN_LED_RED, LOW); // ON
                fbBuzzerNext = now + 1000;      // Durasi nyala dikurangi jadi 1 detik
            } else if (fbBuzzerStep == 2) {
                digitalWrite(PIN_LED_RED, HIGH); // OFF
            }
        }
        
        // --- LED Hijau --- (Berangsur kedip selama 3 detik sebagai peringatan visual)
        if (now < fbStartTime + 3000) {
            if (now >= fbLedNext) {
                fbLedStep++;
                // fbLedStep ganjil = LOW (Nyala), genap = HIGH (Mati)
                digitalWrite(PIN_LED_GREEN, (fbLedStep % 2 != 0) ? LOW : HIGH); 
                fbLedNext = now + 150; // Kecepatan kedip 150ms
            }
        } else {
            digitalWrite(PIN_LED_GREEN, HIGH);
        }
        
        if (now >= fbStartTime + 3000) {
            currentFbState = FB_IDLE;
            digitalWrite(PIN_LED_RED, HIGH);
            digitalWrite(PIN_LED_GREEN, HIGH);
        }
    }
}

// ─── setup() ─────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n[SYS] Booting ESP32 Access Control v0.3.0 - OTA BERHASIL!...");

  // 0. Inisialisasi NVS Storage & Watchdog Manager (Fase 4 & 5 Prototipe)
  nvsManager.begin();
  watchdogManager.begin(10); // 10 Detik WDT Timeout

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

  // 4.5. Inisialisasi Jam RTC & AutoReboot Manager (Fase 2 Prototipe)
  systemClock.begin();
  autoReboot.begin(3, 0); // Scheduled Maintenance Reboot Pukul 03:00 AM Harian

  // 5. Setup SerialSim + callback untuk MQTT log & Door unlock
  serialSim.setLogCallback([](const String& kartu, int door, bool granted, const String& reason) {
    if (granted && door == 1) {
      door1.unlock(3000);
    }
    mqttManager.publishLog(kartu, door, granted, reason);
  });
  serialSim.begin();

  // 6. Jalankan Local Web Config Server
  WiFi.mode(WIFI_STA); // Inisialisasi TCP/IP stack agar WebServer tidak crash
  webConfigServer.begin();

  // 6.5. Inisialisasi Power Sensor (Fase 1 Prototipe)
  powerSensor.begin();

  // 6.6. Inisialisasi Wiegand Reader (Fase 3 Prototipe)
  wiegand1.begin();
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);

  // 6.7. Inisialisasi Door Controller (Fase 4 Prototipe)
  door1.begin();
  door1.setRexCallback([]() {
      // Saat REX ditekan, catat log sebagai MANUAL_EXIT
      mqttManager.publishLog("REX_BTN", 1, true, "MANUAL_EXIT");
  });

  // 6.8. Inisialisasi Fire Alarm Safety Interlock (Fase 6 Prototipe)
  fireAlarm.begin();
  fireAlarm.setFireCallback([](bool active) {
      // Buka seluruh relay pintu jika alarm kebakaran aktif
      door1.setFireOverride(active);
      mqttManager.publishLog("FIRE_ALARM", 0, true, active ? "FIRE_EMERGENCY_ACTIVE" : "FIRE_EMERGENCY_CLEARED");
  });

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

  // Konfirmasi Firmware Sehat ke Bootloader (Mencegah OTA Rollback)
  esp_ota_mark_app_valid_cancel_rollback();

  Serial.println("[SYS] System ready!\n");
}

// ─── loop() ──────────────────────────────────────────────────
void loop() {
  watchdogManager.loop();
  autoReboot.loop();
  mqttManager.loop();
  serialSim.loop();
  webConfigServer.handleClient();
  powerSensor.loop();
  fireAlarm.loop();
  
  // Deteksi Tap Kartu Fisik
  if (wiegand1.available()) {
    String uid = wiegand1.getCardUID();
    Serial.printf("\n[WIEGAND] Kartu fisik terdeteksi! UID: %s\n", uid.c_str());
    
    AccessResult result = accessControl.checkAccess(uid, 1); // Asumsi Pintu 1
    
    if (result.granted) {
      Serial.println("[DOOR 1] Akses DIBERIKAN.");
      door1.unlock(3000); // Buka pintu 3 detik
      startFeedback(FB_GRANTED);
    } else {
      Serial.println("[DOOR 1] Akses DITOLAK.");
      startFeedback(FB_DENIED);
    }
    
    // Publikasikan log secara fisik ke server (atau simpan ke NVS jika offline)
    mqttManager.publishLog(uid, 1, result.granted, result.reason);
  }
  
  // Loop untuk mengecek status relay dan REX
  door1.loop();

  // Jalankan animasi LED dan Buzzer
  loopFeedback();
}
