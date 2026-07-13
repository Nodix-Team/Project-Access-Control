// ============================================================
//  AccessControl.h
//  Logika pengecekan hak akses user ke pintu tertentu
//  ESP32 Access Control System — v0.1.0
// ============================================================
#pragma once

#include <Arduino.h>
#include "../storage/UserStorage.h"

// ============================================================
//  Struct hasil pengecekan akses
// ============================================================
struct AccessResult {
    bool   granted;   // true = akses diizinkan
    User*  user;      // pointer ke data user (nullptr jika tidak ditemukan)
    int    door;      // nomor pintu yang dicek (1-4)
    String reason;    // pesan alasan (untuk Serial output)
};

// ============================================================
//  Class AccessControl
//  Bertugas mengecek apakah suatu kartu boleh mengakses pintu tertentu
// ============================================================
class AccessControl {
public:
    explicit AccessControl(UserStorage& storage);

    /**
     * Cek apakah kartu dengan UID tertentu bisa mengakses pintu yang diminta.
     * @param kartu  UID kartu RFID (string)
     * @param door   Nomor pintu (1-4)
     * @return AccessResult dengan info lengkap
     */
    AccessResult checkAccess(const String& kartu, int door);

private:
    UserStorage& _storage;
};
