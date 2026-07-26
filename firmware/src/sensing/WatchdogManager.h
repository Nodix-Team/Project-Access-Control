// ============================================================
//  WatchdogManager.h
//  Mengelola Internal Task Watchdog Timer (esp_task_wdt)
//  & External Watchdog WDI Heartbeat Pulse (GPIO2 / Onboard LED)
//  ESP32 Access Control System — v0.3.0
// ============================================================
#pragma once

#include <Arduino.h>

class WatchdogManager {
public:
    WatchdogManager(uint8_t wdiPin);

    /**
     * Inisialisasi Task Watchdog Timer internal (esp_task_wdt) & Pin WDI eksternal.
     * @param timeoutSeconds Batas waktu maksimum loop macet sebelum reset (default 10 detik)
     * @return true jika berhasil
     */
    bool begin(uint32_t timeoutSeconds = 10);

    /**
     * Dipanggil di loop() utama untuk:
     * 1. Memberi makan internal Task Watchdog (esp_task_wdt_reset)
     * 2. Memancarkan pulsa detak jantung WDI (toggle pin GPIO2/LED) tiap 1000ms
     */
    void loop();

private:
    uint8_t _wdiPin;
    uint32_t _timeoutSeconds;
    bool _wdiState;
    unsigned long _lastToggleMs;
};
