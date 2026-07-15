// ============================================================
//  UserStorage.h
//  Menyimpan dan mengelola data user di LittleFS (users.json)
//  ESP32 Access Control System — v0.2.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <vector>

// ============================================================
//  Struct data user (Ringkas tanpa nama dan UID)
// ============================================================
struct User {
    String kartu;            // UID kartu RFID (string hex, misal "AABBCCDD")
    std::vector<int> doors;  // Daftar pintu lokal yang bisa diakses (1-4)
};

// ============================================================
//  Class UserStorage
//  - Load user dari LittleFS saat boot (persisten)
//  - CRUD operasi dengan auto-save ke LittleFS (Upsert based on kartu)
//  - Mendukung sinkronisasi atomik dengan RAM staging
// ============================================================
class UserStorage {
public:
    UserStorage();

    /**
     * Inisialisasi storage. Harus dipanggil setelah LittleFS.begin().
     * Load semua user dari users.json jika ada.
     * @return true jika berhasil
     */
    bool begin();

    /**
     * Set User (Upsert): jika kartu sudah ada, replace doors.
     * Jika belum ada, tambahkan baru.
     * @return true jika berhasil
     */
    bool setUser(const String& kartu, const std::vector<int>& doors);

    /**
     * Hapus user berdasarkan nomor kartu.
     * @return true jika ditemukan dan berhasil dihapus
     */
    bool deleteUser(const String& kartu);

    /**
     * Memulai transaksi sinkronisasi massal (Atomic Sync).
     * @param syncId ID unik transaksi sinkronisasi dari server
     * @return true jika berhasil masuk ke mode sync
     */
    bool startSync(const String& syncId);

    /**
     * Tambahkan user ke RAM staging (saat mode sync berjalan).
     */
    bool addStagingUser(const String& kartu, const std::vector<int>& doors);

    /**
     * Akhiri transaksi sinkronisasi massal.
     * Melakukan validasi count dan swap atomik ke LittleFS jika cocok.
     * @return true jika sync sukses diterapkan (OK)
     */
    bool endSync(const String& syncId, int count);

    /**
     * Cek apakah status sinkronisasi sedang berjalan.
     */
    bool isSyncInProgress() const;

    /**
     * Ambil sync ID yang sedang aktif berjalan.
     */
    String getCurrentSyncId() const;

    /**
     * Cari user berdasarkan UID kartu (case-insensitive).
     * @return pointer ke User, atau nullptr jika tidak ditemukan
     */
    User* findByKartu(const String& kartu);

    /**
     * Jumlah user aktif terdaftar.
     */
    int getUserCount() const;

    /**
     * Cetak semua user ke Serial Monitor.
     */
    void printAllUsers() const;

private:
    std::vector<User> _users;
    
    // RAM Staging untuk sinkronisasi atomik
    bool              _syncInProgress;
    String            _currentSyncId;
    std::vector<User> _stagingUsers;

    bool _loadFromFile();
    bool _saveToFile();
};
