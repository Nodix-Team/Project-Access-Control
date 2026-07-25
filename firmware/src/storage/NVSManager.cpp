// ============================================================
//  NVSManager.cpp
//  ESP32 Access Control System — v0.3.0
// ============================================================
#include "NVSManager.h"

#define NVS_NAMESPACE "sys_store"
#define KEY_SEQ_ID "tx_seq"

NVSManager::NVSManager() : _currentSeq(1) {}

bool NVSManager::begin() {
    if (!_prefs.begin(NVS_NAMESPACE, false)) { // Read/Write mode
        Serial.println("[NVS] GAGAL membuka namespace NVS sys_store!");
        return false;
    }

    // Load sequence ID terakhir dari NVS, jika belum ada set default = 1
    _currentSeq = _prefs.getUInt(KEY_SEQ_ID, 1);
    Serial.printf("[NVS] Inisialisasi Berhasil. Sequence Counter terpasang pada ID: %u\n", _currentSeq);
    return true;
}

uint32_t NVSManager::getNextSequenceId() {
    uint32_t nextSeq = _currentSeq++;
    _prefs.putUInt(KEY_SEQ_ID, _currentSeq);
    return nextSeq;
}

uint32_t NVSManager::getCurrentSequenceId() const {
    return _currentSeq;
}

void NVSManager::resetSequenceId(uint32_t newSeq) {
    _currentSeq = newSeq;
    _prefs.putUInt(KEY_SEQ_ID, _currentSeq);
    Serial.printf("[NVS] Sequence Counter di-reset ke ID: %u\n", _currentSeq);
}
