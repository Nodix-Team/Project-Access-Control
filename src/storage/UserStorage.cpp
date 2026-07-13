// ============================================================
//  UserStorage.cpp
//  ESP32 Access Control System — v0.1.0
// ============================================================
#include "UserStorage.h"
#include <LittleFS.h>

#define USERS_FILE "/users.json"

UserStorage::UserStorage() : _nextUid(1) {}

bool UserStorage::begin() {
    return _loadFromFile();
}

// ─── Private: Load dari LittleFS ─────────────────────────────
bool UserStorage::_loadFromFile() {
    _users.clear();
    _nextUid = 1;

    File f = LittleFS.open(USERS_FILE, "r");
    if (!f) {
        // File belum ada adalah kondisi normal (user pertama kali)
        Serial.println("[UserStorage] users.json belum ada, mulai dari kosong");
        return true;
    }

    // Cek ukuran file
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
        u.uid   = obj["uid"]   | 0;
        u.kartu = obj["kartu"] | "";
        u.nama  = obj["nama"]  | "";

        JsonArray doorsArr = obj["doors"].as<JsonArray>();
        for (int d : doorsArr) {
            if (d >= 1 && d <= 4) {
                u.doors.push_back(d);
            }
        }

        if (u.uid > 0 && u.kartu.length() > 0) {
            _users.push_back(u);
        }
    }

    _rebuildNextUid();
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
        obj["uid"]   = u.uid;
        obj["kartu"] = u.kartu;
        obj["nama"]  = u.nama;

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

// ─── Private: Rebuild uid counter ────────────────────────────
void UserStorage::_rebuildNextUid() {
    _nextUid = 1;
    for (const User& u : _users) {
        if (u.uid >= _nextUid) {
            _nextUid = u.uid + 1;
        }
    }
}

// ─── Public: Add User ─────────────────────────────────────────
bool UserStorage::addUser(const String& kartu, const String& nama, const std::vector<int>& doors) {
    // Cek duplikasi kartu
    if (findByKartu(kartu) != nullptr) {
        Serial.printf("[UserStorage] ERROR: Kartu '%s' sudah terdaftar\n", kartu.c_str());
        return false;
    }

    User u;
    u.uid   = _nextUid++;
    u.kartu = kartu;
    u.nama  = nama;
    u.doors = doors;

    _users.push_back(u);
    Serial.printf("[UserStorage] User ditambahkan → uid=%d | nama=%s | kartu=%s | pintu=[",
                  u.uid, u.nama.c_str(), u.kartu.c_str());
    for (int i = 0; i < (int)u.doors.size(); i++) {
        Serial.print(u.doors[i]);
        if (i < (int)u.doors.size() - 1) Serial.print(",");
    }
    Serial.println("]");

    return _saveToFile();
}

// ─── Public: Delete User ──────────────────────────────────────
bool UserStorage::deleteUser(int uid) {
    for (auto it = _users.begin(); it != _users.end(); ++it) {
        if (it->uid == uid) {
            Serial.printf("[UserStorage] User dihapus → uid=%d | nama=%s\n",
                          uid, it->nama.c_str());
            _users.erase(it);
            return _saveToFile();
        }
    }
    Serial.printf("[UserStorage] ERROR: User uid=%d tidak ditemukan\n", uid);
    return false;
}

// ─── Public: Update User ─────────────────────────────────────
bool UserStorage::updateUser(int uid, const String& kartu, const String& nama, const std::vector<int>& doors) {
    User* u = findByUid(uid);
    if (!u) {
        Serial.printf("[UserStorage] ERROR: User uid=%d tidak ditemukan\n", uid);
        return false;
    }

    u->kartu = kartu;
    u->nama  = nama;
    u->doors = doors;

    Serial.printf("[UserStorage] User diupdate → uid=%d | nama=%s\n", uid, nama.c_str());
    return _saveToFile();
}

// ─── Public: Sync All Users ───────────────────────────────────
bool UserStorage::syncUsers(const String& jsonArrayStr) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, jsonArrayStr);
    if (err) {
        Serial.printf("[UserStorage] Sync parse error: %s\n", err.c_str());
        return false;
    }

    JsonArray arr = doc.as<JsonArray>();
    if (arr.isNull()) {
        Serial.println("[UserStorage] Sync: format bukan array JSON");
        return false;
    }

    _users.clear();

    for (JsonObject obj : arr) {
        User u;
        u.uid   = obj["uid"]   | 0;
        u.kartu = obj["kartu"] | "";
        u.nama  = obj["nama"]  | "";

        JsonArray doorsArr = obj["doors"].as<JsonArray>();
        for (int d : doorsArr) {
            if (d >= 1 && d <= 4) {
                u.doors.push_back(d);
            }
        }

        if (u.uid > 0 && u.kartu.length() > 0) {
            _users.push_back(u);
        }
    }

    _rebuildNextUid();
    Serial.printf("[UserStorage] Sync selesai: %d user\n", (int)_users.size());
    return _saveToFile();
}

// ─── Public: Find ─────────────────────────────────────────────
User* UserStorage::findByKartu(const String& kartu) {
    for (User& u : _users) {
        // Case-insensitive comparison
        String a = kartu;
        String b = u.kartu;
        a.toUpperCase();
        b.toUpperCase();
        if (a == b) return &u;
    }
    return nullptr;
}

User* UserStorage::findByUid(int uid) {
    for (User& u : _users) {
        if (u.uid == uid) return &u;
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
            Serial.printf("│ uid=%-3d | kartu=%-10s | nama=%-15s│\n",
                          u.uid, u.kartu.c_str(), u.nama.c_str());
            Serial.print("│         pintu: [");
            for (int i = 0; i < (int)u.doors.size(); i++) {
                Serial.print(u.doors[i]);
                if (i < (int)u.doors.size() - 1) Serial.print(",");
            }
            Serial.println("]");
        }
    }
    Serial.println("└───────────────────────────────────────────┘");
    Serial.println();
}
