// ============================================================
//  SerialSim.cpp
//  ESP32 Access Control System — v0.2.0
// ============================================================
#include "SerialSim.h"

// ─── Constructor ─────────────────────────────────────────────
SerialSim::SerialSim(AccessControl& ac, UserStorage& storage, ConfigManager& config, SystemClock& clock)
    : _ac(ac), _storage(storage), _config(config), _clock(clock),
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
    String upper = line;
    upper.toUpperCase();
    upper.trim();

    // ─ Cek command global yang bisa dieksekusi kapan saja ──────
    if (upper == "LIST") {
        _storage.printAllUsers();
        if (_state == WAIT_DOOR) {
            Serial.println("[INFO] Proses scan kartu dibatalkan.");
            _state = WAIT_CARD;
        }
        _printCardPrompt();
        return;
    }
    
    // Fitur Cheat / Bantuan Prototyping
    if (upper.startsWith("ADD ")) {
        String uid = upper.substring(4);
        uid.trim();
        uid = UserStorage::normalizeKartu(uid);
        if (uid.length() > 0) {
            _storage.setUser(uid, {1, 2, 3, 4}); // Beri akses ke semua pintu (1-4)
            Serial.printf("[SYS] BERHASIL mendaftarkan kartu: %s (Akses: Semua Pintu)\n", uid.c_str());
        }
        _state = WAIT_CARD;
        _printCardPrompt();
        return;
    }

    if (upper.startsWith("DEL ")) {
        String uid = upper.substring(4);
        uid.trim();
        uid = UserStorage::normalizeKartu(uid);
        if (_storage.deleteUser(uid)) {
            Serial.printf("[SYS] Kartu %s berhasil DIHAPUS.\n", uid.c_str());
        } else {
            Serial.printf("[SYS] Kartu %s tidak ditemukan.\n", uid.c_str());
        }
        _state = WAIT_CARD;
        _printCardPrompt();
        return;
    }

    // Cheat Command untuk Uji Coba Scheduled Auto-Reboot
    if (upper.startsWith("SETTIME")) {
        String args = upper.substring(7);
        args.trim();

        uint8_t h = 2, m = 59, s = 55; // Default 5 detik sebelum jam 03:00 AM
        if (args.length() > 0) {
            int parsedH, parsedM, parsedS;
            if (sscanf(args.c_str(), "%d %d %d", &parsedH, &parsedM, &parsedS) == 3) {
                h = parsedH; m = parsedM; s = parsedS;
            }
        }

        DateTime currentNow = _clock.now();
        _clock.setTime(currentNow.year(), currentNow.month(), currentNow.day(), h, m, s);
        Serial.printf("[CHEAT] Jam RTC diset ke %02d:%02d:%02d AM (Siap menguji Auto-Reboot!)\n", h, m, s);
        _state = WAIT_CARD;
        _printCardPrompt();
        return;
    }

    if (upper == "STATUS") {
        _printStatus();
        if (_state == WAIT_DOOR) {
            Serial.println("[INFO] Proses scan kartu dibatalkan.");
            _state = WAIT_CARD;
        }
        _printCardPrompt();
        return;
    }
    if (upper == "RESTART") {
        Serial.println("[SYS] Restart dalam 2 detik...");
        delay(2000);
        ESP.restart();
        return;
    }
    
    // Command pembatalan saat sedang menunggu pintu
    if (_state == WAIT_DOOR && (upper == "CANCEL" || upper == "EXIT" || upper == "BACK")) {
        Serial.println("[INFO] Proses scan kartu dibatalkan.");
        _state = WAIT_CARD;
        _printCardPrompt();
        return;
    }

    if (_state == WAIT_CARD) {
        _processCard(line);
    } else if (_state == WAIT_DOOR) {
        int door = line.toInt();
        if (door < 1 || door > 4) {
            Serial.println("[!] Input tidak valid. Masukkan angka 1 sampai 4, atau ketik CANCEL untuk membatalkan.");
            _printDoorPrompt();
            return;
        }
        _processDoor(door);
    }
}

// ─── Private: Proses UID kartu yang diinput ──────────────────
void SerialSim::_processCard(const String& kartu) {
    _currentKartu = UserStorage::normalizeKartu(kartu);

    User* u = _storage.findByKartu(_currentKartu);
    if (u) {
        Serial.printf("[SCAN] Kartu '%s' → Terdaftar\n", _currentKartu.c_str());
    } else {
        Serial.printf("[SCAN] Kartu '%s' → Tidak terdaftar\n", _currentKartu.c_str());
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
        Serial.printf("  Kartu : %s\n", _currentKartu.c_str());

        // Trigger callback → MQTT log (v0.2 format)
        if (_logCb) {
            _logCb(_currentKartu, door, true, "OK");
        }

    } else {
        // ─ ACCESS DENIED ─────────────────────────────────────
        Serial.printf("  [PINTU %d - %s]\n", door, doorName.c_str());
        Serial.println("  ✗ ACCESS DENIED");
        Serial.printf("  Alasan: %s\n", result.reason.c_str());

        if (result.user) {
            // User terdaftar tapi tidak punya akses ke pintu ini
            Serial.print("  Akses ke pintu: [");
            for (size_t i = 0; i < result.user->doors.size(); i++) {
                Serial.print(result.user->doors[i]);
                if (i < result.user->doors.size() - 1) Serial.print(",");
            }
            Serial.println("]");

            if (_logCb) {
                _logCb(_currentKartu, door, false, "NO_ACCESS");
            }
        } else {
            // Kartu tidak terdaftar
            if (_logCb) {
                _logCb(_currentKartu, door, false, "UNKNOWN_CARD");
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
    Serial.println("║   ESP32 ACCESS CONTROL SYSTEM  v0.2.0   ║");
    Serial.println("║   Prototype — Serial Monitor Simulation  ║");
    Serial.println("╚══════════════════════════════════════════╝");
    Serial.println();
    Serial.println("Commands: LIST | STATUS | RESTART");
    Serial.println("Cheat Commands: ADD <uid> | DEL <uid>");
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
    Serial.printf("│ Free heap  : %d bytes\n", (int)ESP.getFreeHeap());
    Serial.println("└───────────────────────────────────────────┘");
}
