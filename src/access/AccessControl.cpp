// ============================================================
//  AccessControl.cpp
//  ESP32 Access Control System — v0.1.0
// ============================================================
#include "AccessControl.h"

AccessControl::AccessControl(UserStorage& storage) : _storage(storage) {}

AccessResult AccessControl::checkAccess(const String& kartu, int door) {
    AccessResult result;
    result.door    = door;
    result.user    = nullptr;
    result.granted = false;

    // Validasi nomor pintu
    if (door < 1 || door > 4) {
        result.reason = "Nomor pintu tidak valid";
        return result;
    }

    // Cari user berdasarkan kartu
    User* u = _storage.findByKartu(kartu);
    if (!u) {
        result.reason = "Kartu tidak terdaftar";
        return result;
    }

    result.user = u;

    // Cek apakah user punya akses ke pintu yang diminta
    bool hasDoorAccess = false;
    for (int d : u->doors) {
        if (d == door) {
            hasDoorAccess = true;
            break;
        }
    }

    if (hasDoorAccess) {
        result.granted = true;
        result.reason  = "OK";
    } else {
        result.granted = false;
        result.reason  = "Tidak punya akses ke pintu ini";
    }

    return result;
}
