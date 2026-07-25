// ============================================================
//  NVSManager.h
//  Mengelola data persisten kecil di NVS ESP32 (Preferences.h)
//  - 32-bit uint Sequence Counter untuk Log Transaksi (Persisten antar Reboot)
//  ESP32 Access Control System — v0.3.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <Preferences.h>

class NVSManager {
public:
    NVSManager();

    /**
     * Inisialisasi NVS storage. Memuat sequence ID terakhir dari NVS.
     * @return true jika berhasil
     */
    bool begin();

    /**
     * Mengambil sequence ID berikutnya (monotonis meningkat 32-bit uint)
     * dan langsung menyimpannya ke NVS secara persisten.
     * @return uint32_t seq_id baru
     */
    uint32_t getNextSequenceId();

    /**
     * Mendapatkan sequence ID saat ini tanpa menaikkan nilai counter.
     */
    uint32_t getCurrentSequenceId() const;

    /**
     * Reset sequence counter ke nilai tertentu (default 1).
     */
    void resetSequenceId(uint32_t newSeq = 1);

private:
    Preferences _prefs;
    uint32_t _currentSeq;
};
