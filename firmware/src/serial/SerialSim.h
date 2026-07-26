// ============================================================
//  SerialSim.h
//  Simulasi 4 reader RFID dan 4 doorlock via Serial Monitor
//  ESP32 Access Control System — v0.1.0
//
//  Flow:
//    1. User input UID kartu → Enter
//    2. Sistem tanya: "Masuk pintu mana? (1-4)"
//    3. User input nomor pintu → Enter
//    4. Sistem cek akses → tampilkan hasil
//    5. Log dikirim via callback (ke MQTT)
//
//  Commands khusus (saat menunggu input kartu):
//    LIST    → tampilkan semua user
//    STATUS  → tampilkan info device
//    RESTART → restart ESP32
// ============================================================
#pragma once

#include <Arduino.h>
#include <functional>
#include "../access/AccessControl.h"
#include "../storage/UserStorage.h"
#include "../config/ConfigManager.h"
#include "../time/SystemClock.h"

// Callback type untuk mengirim log ke MQTT (format ringkas v0.2)
using LogCallback = std::function<void(
    const String& kartu, int door, bool granted, const String& resultReason
)>;

// ============================================================
//  Class SerialSim
// ============================================================
class SerialSim {
public:
    SerialSim(AccessControl& ac, UserStorage& storage, ConfigManager& config, SystemClock& clock);

    /**
     * Inisialisasi: tampilkan banner dan prompt pertama.
     */
    void begin();

    /**
     * Harus dipanggil di loop() utama.
     * Non-blocking: membaca Serial char by char.
     */
    void loop();

    /**
     * Set callback yang akan dipanggil setelah setiap transaksi akses.
     * Digunakan oleh main.cpp untuk forward log ke MqttManager.
     */
    void setLogCallback(LogCallback cb);

private:
    AccessControl& _ac;
    UserStorage&   _storage;
    ConfigManager& _config;
    SystemClock&   _clock;
    LogCallback    _logCb;

    // State machine untuk input dua tahap
    enum InputState {
        WAIT_CARD,  // Menunggu input UID kartu
        WAIT_DOOR   // Menunggu input nomor pintu
    };

    InputState _state;
    String     _inputBuffer;   // Buffer karakter masuk
    String     _currentKartu;  // UID kartu yang sudah diinput

    // ─── Internal handlers ───────────────────────────────────
    void _processLine(const String& line);
    void _processCard(const String& kartu);
    void _processDoor(int door);

    // ─── Display helpers ─────────────────────────────────────
    void _printBanner();
    void _printCardPrompt();
    void _printDoorPrompt();
    void _printDivider();
    void _printStatus();
};
