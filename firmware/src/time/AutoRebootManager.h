// ============================================================
//  AutoRebootManager.h
//  Mengelola Maintenance Auto-Reboot Terjadwal Harian (Pembersihan RAM)
//  ESP32 Access Control System — v0.3.0
// ============================================================
#pragma once

#include <Arduino.h>
#include "SystemClock.h"

class AutoRebootManager {
public:
    AutoRebootManager(SystemClock& systemClock);

    /**
     * Inisialisasi AutoRebootManager.
     * @param targetHour Jam eksekusi reboot (0-23, default 3 = 03.00 AM)
     * @param targetMinute Menit eksekusi reboot (0-59, default 0)
     */
    void begin(uint8_t targetHour = 3, uint8_t targetMinute = 0);

    /**
     * Dipanggil di loop() untuk memeriksa apakah waktu reboot tercapai
     */
    void loop();

private:
    SystemClock& _systemClock;
    uint8_t _targetHour;
    uint8_t _targetMinute;
    int _lastRebootDay;
    unsigned long _lastCheckMs;
};
