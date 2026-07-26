// ============================================================
//  WatchdogManager.cpp
//  ESP32 Access Control System — v0.3.0
// ============================================================
#include "WatchdogManager.h"
#include <esp_task_wdt.h>

WatchdogManager::WatchdogManager(uint8_t wdiPin)
    : _wdiPin(wdiPin),
      _timeoutSeconds(10),
      _wdiState(false),
      _lastToggleMs(0)
{}

bool WatchdogManager::begin(uint32_t timeoutSeconds) {
    _timeoutSeconds = timeoutSeconds;
    
    // Inisialisasi Pin WDI Eksternal (GPIO2 Onboard LED)
    pinMode(_wdiPin, OUTPUT);
    digitalWrite(_wdiPin, LOW);

    // Inisialisasi Internal ESP32 Task Watchdog Timer
    #if defined(ESP_IDF_VERSION_MAJOR) && ESP_IDF_VERSION_MAJOR >= 5
        esp_task_wdt_config_t wdt_config = {
            .timeout_ms = _timeoutSeconds * 1000,
            .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
            .trigger_panic = true
        };
        esp_task_wdt_init(&wdt_config);
        esp_task_wdt_add(NULL);
    #else
        esp_task_wdt_init(_timeoutSeconds, true);
        esp_task_wdt_add(NULL);
    #endif

    Serial.printf("[WDT] Watchdog Manager aktif! Timeout: %u detik, WDI Pulse Pin: GPIO%u\n",
                  _timeoutSeconds, _wdiPin);
    return true;
}

void WatchdogManager::loop() {
    // 1. Beri makan internal Task Watchdog ESP32
    esp_task_wdt_reset();

    // 2. Pancarkan pulsa detak jantung WDI (toggle pin GPIO2 / LED) setiap 1000 ms
    unsigned long now = millis();
    if (now - _lastToggleMs >= 1000) {
        _lastToggleMs = now;
        _wdiState = !_wdiState;
        digitalWrite(_wdiPin, _wdiState ? HIGH : LOW);
    }
}
