// ============================================================
//  FireAlarmSensor.h
//  Mendeteksi Input Digital Alarm Kebakaran (GPIO35) — Active LOW
//  ESP32 Access Control System — v0.3.0
// ============================================================
#pragma once

#include <Arduino.h>
#include <functional>

class FireAlarmSensor {
public:
    FireAlarmSensor(uint8_t pin);

    void begin();
    void loop();

    /**
     * Mengecek apakah status Alarm Kebakaran sedang aktif.
     * @return true jika Alarm Kebakaran terdeteksi (Active LOW / Grounded)
     */
    bool isFireActive() const;

    /**
     * Set callback function yang dipanggil saat status Alarm Kebakaran berubah.
     * @param cb Callback fungsi dengan argumen bool active
     */
    void setFireCallback(std::function<void(bool active)> cb);

private:
    uint8_t _pin;
    bool _isFireActive;
    bool _lastReading;
    unsigned long _lastDebounceTime;

    std::function<void(bool active)> _callback;
};
