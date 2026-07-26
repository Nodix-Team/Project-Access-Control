// ============================================================
//  OfflineLogBuffer.h
//  Mengelola ring buffer log transaksi lokal saat offline di LittleFS
//  ESP32 Access Control System — v0.3.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <functional>

class OfflineLogBuffer {
public:
    OfflineLogBuffer();

    /**
     * Inisialisasi buffer. Membuat folder /logs jika belum ada.
     * @return true jika berhasil
     */
    bool begin();

    /**
     * Tambahkan log baru ke buffer offline dengan 32-bit uint Sequence ID.
     * Jika total baris melebihi 500, baris terlama akan dibuang secara FIFO.
     */
    void appendLog(uint32_t seqId, const String& timestamp, const String& kartu, int door, const String& status, const String& reason);

    /**
     * Replay (kirim ulang) semua log offline ke MQTT.
     * Menerima callback function yang bertugas mem-publish pesan ke MQTT.
     * Log akan dihapus satu per satu setelah sukses di-publish.
     */
    void replayLogs(std::function<bool(const String& line)> sendCallback);

    /**
     * Cek apakah ada log offline yang tersimpan.
     */
    bool hasLogs();

private:
    void _enforceRingBufferLimit();
};
