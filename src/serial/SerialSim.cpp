// ============================================================
//  SerialSim.cpp
//  ESP32 Access Control System — v0.1.0
// ============================================================
#include "SerialSim.h"

// ─── Constructor ─────────────────────────────────────────────
SerialSim::SerialSim(AccessControl& ac, UserStorage& storage, ConfigManager& config)
    : _ac(ac), _storage(storage), _config(config),
      _state(WAIT_CARD)
{}

// ─── begin() ─────────────────────────────────────────────────
void SerialSim::begin() {
    _printBanner();
    _printCardPrompt();
}

// ─── loop() — Non-blocking Serial reader ─────────────────────
void SerialSim::loop() {
    while (Serial.available()) {
        char c = (char)Serial.read();

        if (c == '\r' || c == '\n') {
            // Baris selesai jika ada Carriage Return atau Newline
            String line = _inputBuffer;
            _inputBuffer = "";
            line.trim();

            if (line.length() > 0) {
                Serial.println(line);  // Echo input
                _processLine(line);
            }
        } else {
            _inputBuffer += c;
        }
    }
}

// ─── setLogCallback() ────────────────────────────────────────
void SerialSim::setLogCallback(LogCallback cb) {
    _logCb = cb;
}

// ─── Private: Route input berdasarkan state ──────────────────
void SerialSim::_processLine(const String& line) {
    if (_state == WAIT_CARD) {
        // ─ Cek commands khusus ──────────────────────────────
        String upper = line;
        upper.toUpperCase();

        if (upper == "LIST") {
            _storage.printAllUsers();
            _printCardPrompt();
            return;
        }
        if (upper == "STATUS") {
            _printStatus();
            _printCardPrompt();
            return;
        }
        if (upper == "RESTART") {
            Serial.println("[SYS] Restart dalam 2 detik...");
            delay(2000);
            ESP.restart();
            return;
        }

        // ─ Proses UID kartu ─────────────────────────────────
        _processCard(line);

    } else if (_state == WAIT_DOOR) {
        // ─ Proses input nomor pintu ─────────────────────────
        int door = line.toInt();
        if (door < 1 || door > 4) {
            Serial.println("[!] Input tidak valid. Masukkan angka 1 sampai 4.");
            _printDoorPrompt();
            return;
        }
        _processDoor(door);
    }
}

// ─── Private: Proses UID kartu yang diinput ──────────────────
void SerialSim::_processCard(const String& kartu) {
    _currentKartu = kartu;
    _currentKartu.trim();

    // Cek apakah kartu terdaftar (preview cepat)
    User* u = _storage.findByKartu(_currentKartu);
    if (u) {
        Serial.printf("[SCAN] Kartu '%s' → %s\n", kartu.c_str(), u->nama.c_str());
    } else {
        Serial.printf("[SCAN] Kartu '%s' → tidak terdaftar\n", kartu.c_str());
    }

    _state = WAIT_DOOR;
    _printDoorPrompt();
}

// ─── Private: Proses nomor pintu yang diinput ────────────────
void SerialSim::_processDoor(int door) {
    const String& doorName = _config.getConfig().door_names[door - 1];

    _printDivider();

    // Cek akses
    AccessResult result = _ac.checkAccess(_currentKartu, door);

    if (result.granted && result.user) {
        // ─ ACCESS GRANTED ────────────────────────────────────
        Serial.printf("  [PINTU %d - %s]\n", door, doorName.c_str());
        Serial.println("  ✓ ACCESS GRANTED");
        Serial.printf("  User  : %s\n", result.user->nama.c_str());
        Serial.printf("  Kartu : %s\n", _currentKartu.c_str());
        Serial.printf("  uid   : %d\n", result.user->uid);

        // Trigger callback → MQTT log
        if (_logCb) {
            _logCb(result.user->uid, _currentKartu, result.user->nama, door, true, doorName);
        }

    } else {
        // ─ ACCESS DENIED ─────────────────────────────────────
        Serial.printf("  [PINTU %d - %s]\n", door, doorName.c_str());
        Serial.println("  ✗ ACCESS DENIED");
        Serial.printf("  Alasan: %s\n", result.reason.c_str());

        if (result.user) {
            // User ada tapi tidak punya akses ke pintu ini
            Serial.printf("  User  : %s\n", result.user->nama.c_str());
            Serial.print("  Akses ke pintu: [");
            for (int i = 0; i < (int)result.user->doors.size(); i++) {
                Serial.print(result.user->doors[i]);
                if (i < (int)result.user->doors.size() - 1) Serial.print(",");
            }
            Serial.println("]");

            // Trigger callback → MQTT log
            if (_logCb) {
                _logCb(result.user->uid, _currentKartu, result.user->nama, door, false, doorName);
            }
        } else {
            // User tidak ditemukan
            if (_logCb) {
                _logCb(-1, _currentKartu, "UNKNOWN", door, false, doorName);
            }
        }
    }

    _printDivider();

    // Reset ke state awal
    _currentKartu = "";
    _state = WAIT_CARD;
    _printCardPrompt();
}

// ─── Display Helpers ─────────────────────────────────────────
void SerialSim::_printBanner() {
    Serial.println();
    Serial.println("╔══════════════════════════════════════════╗");
    Serial.println("║   ESP32 ACCESS CONTROL SYSTEM  v0.1.0   ║");
    Serial.println("║   Prototype — Serial Monitor Simulation  ║");
    Serial.println("╚══════════════════════════════════════════╝");
    Serial.println();
    Serial.println("Commands: LIST | STATUS | RESTART");
    Serial.println();

    // Tampilkan nama pintu
    const SystemConfig& cfg = _config.getConfig();
    Serial.println("Konfigurasi Pintu:");
    for (int i = 0; i < 4; i++) {
        Serial.printf("  Pintu %d → %s\n", i + 1, cfg.door_names[i].c_str());
    }
    Serial.println();
}

void SerialSim::_printCardPrompt() {
    Serial.println();
    Serial.print("Masukkan UID Kartu: ");
}

void SerialSim::_printDoorPrompt() {
    Serial.print("Masuk pintu mana? (1-4): ");
}

void SerialSim::_printDivider() {
    Serial.println("──────────────────────────────────────────");
}

void SerialSim::_printStatus() {
    Serial.println();
    Serial.println("┌─── STATUS DEVICE ────────────────────────┐");
    Serial.printf("│ Device ID  : %s\n", _config.getConfig().device_id.c_str());
    Serial.printf("│ Uptime     : %lu ms\n", millis());
    Serial.printf("│ User count : %d\n", _storage.getUserCount());
    Serial.printf("│ Free heap  : %d bytes\n", ESP.getFreeHeap());
    Serial.println("└───────────────────────────────────────────┘");
}
