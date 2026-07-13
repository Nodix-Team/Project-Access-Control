// ============================================================
//  UserStorage.h
//  Menyimpan dan mengelola data user di LittleFS (users.json)
//  ESP32 Access Control System — v0.1.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

// ============================================================
//  Struct data user
// ============================================================
struct User {
    int    uid;    // Auto-increment, unik per user
    String kartu;  // UID kartu RFID (string hex, misal "AABBCCDD")
    String nama;   // Nama user
    std::vector<int> doors;  // Daftar pintu yang bisa diakses (1-4)
};

// ============================================================
//  Class UserStorage
//  - Load user dari LittleFS saat boot (persisten)
//  - CRUD operasi dengan auto-save ke LittleFS
//  - Auto-increment uid
// ============================================================
class UserStorage {
public:
    UserStorage();

    /**
     * Inisialisasi storage. Harus dipanggil setelah LittleFS.begin().
     * Load semua user dari users.json jika ada.
     * @return true jika berhasil (termasuk jika file belum ada)
     */
    bool begin();

    /**
     * Tambah user baru.
     * uid akan di-auto-increment oleh sistem.
     * @return true jika berhasil (false jika kartu sudah terdaftar)
     */
    bool addUser(const String& kartu, const String& nama, const std::vector<int>& doors);

    /**
     * Hapus user berdasarkan uid.
     * @return true jika ditemukan dan berhasil dihapus
     */
    bool deleteUser(int uid);

    /**
     * Update data user berdasarkan uid.
     * @return true jika ditemukan dan berhasil diupdate
     */
    bool updateUser(int uid, const String& kartu, const String& nama, const std::vector<int>& doors);

    /**
     * Sync semua user dari JSON array string (menggantikan semua data lama).
     * Digunakan untuk operasi bulk sync dari MQTT.
     * @return true jika berhasil
     */
    bool syncUsers(const String& jsonArrayStr);

    /**
     * Cari user berdasarkan UID kartu (case-insensitive).
     * @return pointer ke User, atau nullptr jika tidak ditemukan
     */
    User* findByKartu(const String& kartu);

    /**
     * Cari user berdasarkan uid integer.
     * @return pointer ke User, atau nullptr jika tidak ditemukan
     */
    User* findByUid(int uid);

    /**
     * Jumlah user yang terdaftar.
     */
    int getUserCount() const;

    /**
     * Cetak semua user ke Serial Monitor.
     */
    void printAllUsers() const;

private:
    std::vector<User> _users;
    int _nextUid;  // Auto-increment counter

    bool _loadFromFile();
    bool _saveToFile();
    void _rebuildNextUid();
};
