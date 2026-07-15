// ============================================================
//  UserStorage.cpp
//  ESP32 Access Control System — v0.2.0
// ============================================================
#include "UserStorage.h"
#include <LittleFS.h>

#define USERS_FILE "/users.json"

UserStorage::UserStorage() : _syncInProgress(false), _currentSyncId("") {}

bool UserStorage::begin() {
    return _loadFromFile();
}

// ─── Private: Load dari LittleFS ─────────────────────────────
bool UserStorage::_loadFromFile() {
    _users.clear();

    File f = LittleFS.open(USERS_FILE, "r");
    if (!f) {
        Serial.println("[UserStorage] users.json belum ada, mulai dari kosong");
        return true;
    }

    size_t fileSize = f.size();
    if (fileSize == 0) {
        f.close();
        Serial.println("[UserStorage] users.json kosong");
        return true;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, f);
    f.close();

    if (err) {
        Serial.printf("[UserStorage] Parse error: %s\n", err.c_str());
        return false;
    }

    JsonArray arr = doc.as<JsonArray>();
    if (arr.isNull()) {
        Serial.println("[UserStorage] Format JSON tidak valid (bukan array)");
        return false;
    }

    for (JsonObject obj : arr) {
        User u;
        u.kartu = obj["kartu"] | "";

        JsonArray doorsArr = obj["doors"].as<JsonArray>();
        for (int d : doorsArr) {
            if (d >= 1 && d <= 4) {
                u.doors.push_back(d);
            }
        }

        if (u.kartu.length() > 0) {
            _users.push_back(u);
        }
    }

    Serial.printf("[UserStorage] %d user berhasil dimuat dari LittleFS\n", (int)_users.size());
    return true;
}

// ─── Private: Save ke LittleFS ───────────────────────────────
bool UserStorage::_saveToFile() {
    File f = LittleFS.open(USERS_FILE, "w");
    if (!f) {
        Serial.println("[UserStorage] Gagal membuka users.json untuk write");
        return false;
    }

    JsonDocument doc;
    JsonArray arr = doc.to<JsonArray>();

    for (const User& u : _users) {
        JsonObject obj = arr.add<JsonObject>();
        obj["kartu"] = u.kartu;

        JsonArray doorsArr = obj["doors"].to<JsonArray>();
        for (int d : u.doors) {
            doorsArr.add(d);
        }
    }

    size_t written = serializeJson(doc, f);
    f.close();

    if (written == 0) {
        Serial.println("[UserStorage] Gagal menulis users.json");
        return false;
    }

    Serial.printf("[UserStorage] %d user tersimpan ke LittleFS (%d bytes)\n",
                  (int)_users.size(), (int)written);
    return true;
}

// ─── Public: Set User (Upsert) ────────────────────────────────
bool UserStorage::setUser(const String& kartu, const std::vector<int>& doors) {
    User* u = findByKartu(kartu);
    if (u != nullptr) {
        u->doors = doors;
        Serial.printf("[UserStorage] User diupdate → kartu=%s\n", kartu.c_str());
    } else {
        User newUser;
        newUser.kartu = kartu;
        newUser.doors = doors;
        _users.push_back(newUser);
        Serial.printf("[UserStorage] User ditambahkan → kartu=%s\n", kartu.c_str());
    }

    return _saveToFile();
}

// ─── Public: Delete User ──────────────────────────────────────
bool UserStorage::deleteUser(const String& kartu) {
    for (auto it = _users.begin(); it != _users.end(); ++it) {
        if (it->kartu.equalsIgnoreCase(kartu)) {
            Serial.printf("[UserStorage] User dihapus → kartu=%s\n", it->kartu.c_str());
            _users.erase(it);
            return _saveToFile();
        }
    }
    Serial.printf("[UserStorage] ERROR: User kartu=%s tidak ditemukan\n", kartu.c_str());
    return false;
}

// ─── Public: Sync Transaction ─────────────────────────────────
bool UserStorage::startSync(const String& syncId) {
    _syncInProgress = true;
    _currentSyncId = syncId;
    _stagingUsers.clear();
    Serial.printf("[UserStorage] Memulai sync dengan ID: %s\n", syncId.c_str());
    return true;
}

bool UserStorage::addStagingUser(const String& kartu, const std::vector<int>& doors) {
    if (!_syncInProgress) return false;

    // Cek duplikasi di RAM staging, jika ada lakukan update
    bool found = false;
    for (auto& u : _stagingUsers) {
        if (u.kartu.equalsIgnoreCase(kartu)) {
            u.doors = doors;
            found = true;
            break;
        }
    }

    if (!found) {
        User u;
        u.kartu = kartu;
        u.doors = doors;
        _stagingUsers.push_back(u);
    }
    return true;
}

bool UserStorage::endSync(const String& syncId, int count) {
    if (!_syncInProgress || _currentSyncId != syncId) {
        Serial.println("[UserStorage] Sync End ditolak: ID tidak sesuai atau sync tidak aktif");
        _syncInProgress = false;
        _stagingUsers.clear();
        return false;
    }

    if ((int)_stagingUsers.size() != count) {
        Serial.printf("[UserStorage] Sync GAGAL (Mismatch): Diterima %d, Ekspektasi %d\n",
                      (int)_stagingUsers.size(), count);
        _syncInProgress = false;
        _stagingUsers.clear();
        return false;
    }

    // Atomic Swap
    _users = _stagingUsers;
    _syncInProgress = false;
    _stagingUsers.clear();
    
    Serial.printf("[UserStorage] Sync SUKSES (Atomic Swap): %d user disimpan\n", (int)_users.size());
    return _saveToFile();
}

bool UserStorage::isSyncInProgress() const {
    return _syncInProgress;
}

String UserStorage::getCurrentSyncId() const {
    return _currentSyncId;
}

// ─── Public: Find ─────────────────────────────────────────────
User* UserStorage::findByKartu(const String& kartu) {
    for (User& u : _users) {
        if (u.kartu.equalsIgnoreCase(kartu)) return &u;
    }
    return nullptr;
}

// ─── Public: Info ─────────────────────────────────────────────
int UserStorage::getUserCount() const {
    return (int)_users.size();
}

void UserStorage::printAllUsers() const {
    Serial.println();
    Serial.printf("┌─── DAFTAR USER (%d) ───────────────────────┐\n", (int)_users.size());
    if (_users.empty()) {
        Serial.println("│  (belum ada user terdaftar)               │");
    } else {
        for (const User& u : _users) {
            Serial.printf("│ kartu=%-35s │\n", u.kartu.c_str());
            Serial.print("│         pintu: [");
            for (size_t i = 0; i < u.doors.size(); i++) {
                Serial.print(u.doors[i]);
                if (i < u.doors.size() - 1) Serial.print(",");
            }
            Serial.println("]");
        }
    }
    Serial.println("└───────────────────────────────────────────┘");
    Serial.println();
}
