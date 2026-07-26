// ============================================================
//  OfflineLogBuffer.cpp
//  ESP32 Access Control System — v0.3.0
// ============================================================
#include "OfflineLogBuffer.h"
#include <LittleFS.h>

#define OFFLINE_LOG_FILE "/logs/offline_buffer.csv"
#define OFFLINE_LOG_TEMP "/logs/offline_temp.csv"
#define MAX_LOG_LINES 500

OfflineLogBuffer::OfflineLogBuffer() {}

bool OfflineLogBuffer::begin() {
    if (!LittleFS.exists("/logs")) {
        LittleFS.mkdir("/logs");
    }
    return true;
}

void OfflineLogBuffer::appendLog(uint32_t seqId, const String& timestamp, const String& kartu, int door, const String& status, const String& reason) {
    // 1. Batasi ukuran ring buffer FIFO (Maks 500 log)
    _enforceRingBufferLimit();

    // 2. Tulis log baru ke akhir file (append)
    File f = LittleFS.open(OFFLINE_LOG_FILE, "a");
    if (!f) {
        Serial.println("[OfflineLog] Gagal membuka file log untuk append");
        return;
    }
    // Format: seq_id,timestamp,kartu,door_number,status,reason
    f.printf("%u,%s,%s,%d,%s,%s\n", seqId, timestamp.c_str(), kartu.c_str(), door, status.c_str(), reason.c_str());
    f.close();

    Serial.printf("[OfflineLog] Log terpanah ke LittleFS — [Seq: %u] Kartu: %s, Door: %d, Status: %s\n",
                  seqId, kartu.c_str(), door, status.c_str());
}

bool OfflineLogBuffer::hasLogs() {
    return LittleFS.exists(OFFLINE_LOG_FILE);
}

void OfflineLogBuffer::_enforceRingBufferLimit() {
    if (!LittleFS.exists(OFFLINE_LOG_FILE)) return;

    File f = LittleFS.open(OFFLINE_LOG_FILE, "r");
    if (!f) return;

    int lineCount = 0;
    while (f.available()) {
        String line = f.readStringUntil('\n');
        if (line.length() > 0) lineCount++;
    }
    f.close();

    if (lineCount < MAX_LOG_LINES) return;

    // Harus menghapus log terlama agar sisa baris pas 500
    int linesToRemove = lineCount - MAX_LOG_LINES + 1;
    
    File src = LittleFS.open(OFFLINE_LOG_FILE, "r");
    File dest = LittleFS.open(OFFLINE_LOG_TEMP, "w");
    if (!src || !dest) {
        if (src) src.close();
        if (dest) dest.close();
        return;
    }

    int currentLine = 0;
    while (src.available()) {
        String line = src.readStringUntil('\n');
        if (line.length() == 0) continue;
        
        if (currentLine >= linesToRemove) {
            dest.println(line);
        }
        currentLine++;
    }
    src.close();
    dest.close();

    LittleFS.remove(OFFLINE_LOG_FILE);
    LittleFS.rename(OFFLINE_LOG_TEMP, OFFLINE_LOG_FILE);
    Serial.printf("[OfflineLog] Ring buffer terlimitasi: menghapus %d log terlama (FIFO)\n", linesToRemove);
}

void OfflineLogBuffer::replayLogs(std::function<bool(const String&)> sendCallback) {
    if (!LittleFS.exists(OFFLINE_LOG_FILE)) return;

    File src = LittleFS.open(OFFLINE_LOG_FILE, "r");
    if (!src) return;

    // File temp untuk menyimpan kembali log yang gagal dikirim jika koneksi drop di tengah jalan
    File dest = LittleFS.open(OFFLINE_LOG_TEMP, "w");
    if (!dest) {
        src.close();
        Serial.println("[OfflineLog] Gagal membuat file temp saat replay");
        return;
    }

    int successCount = 0;
    int failCount = 0;

    while (src.available()) {
        String line = src.readStringUntil('\n');
        line.trim();
        if (line.length() == 0) continue;

        // Callback mem-publish ke MQTT. Jika sukses (return true), log dianggap selesai dikirim.
        // Jika gagal (false), simpan kembali ke file temp.
        if (sendCallback(line)) {
            successCount++;
        } else {
            dest.println(line);
            failCount++;
        }
    }
    src.close();
    dest.close();

    LittleFS.remove(OFFLINE_LOG_FILE);
    
    if (failCount > 0) {
        LittleFS.rename(OFFLINE_LOG_TEMP, OFFLINE_LOG_FILE);
        Serial.printf("[OfflineLog] Replay selesai: %d sukses terkirim, %d gagal disimpan kembali\n", successCount, failCount);
    } else {
        LittleFS.remove(OFFLINE_LOG_TEMP);
        Serial.printf("[OfflineLog] Replay selesai: %d log berhasil terkirim semua\n", successCount);
    }
}
