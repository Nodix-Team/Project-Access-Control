// ============================================================
//  FireAlarmSensor.cpp
//  ESP32 Access Control System — v0.3.0
// ============================================================
#include "FireAlarmSensor.h"

FireAlarmSensor::FireAlarmSensor(uint8_t pin)
    : _pin(pin),
      _isFireActive(false),
      _lastReading(HIGH),
      _lastDebounceTime(0)
{}

void FireAlarmSensor::begin() {
    pinMode(_pin, INPUT_PULLUP); // Gunakan internal pullup (Default HIGH, tersambung ke GND = LOW / Alarm Aktif)
    _lastReading = digitalRead(_pin);
    _isFireActive = (_lastReading == LOW);
}

void FireAlarmSensor::loop() {
    bool currentReading = digitalRead(_pin);

    // Debounce sederhana 50ms
    if (currentReading != _lastReading) {
        _lastDebounceTime = millis();
        _lastReading = currentReading;
    }

    if ((millis() - _lastDebounceTime) > 50) {
        bool activeNow = (currentReading == LOW);
        
        if (activeNow != _isFireActive) {
            _isFireActive = activeNow;

            if (_isFireActive) {
                Serial.println("\n🔥 [FIRE ALARM DETECTED!] Sinyal Darurat Kebakaran Aktif di GPIO35!");
            } else {
                Serial.println("\n✅ [FIRE ALARM CLEARED] Sinyal Darurat Kebakaran Dinormalisasi.");
            }

            if (_callback) {
                _callback(_isFireActive);
            }
        }
    }
}

bool FireAlarmSensor::isFireActive() const {
    return _isFireActive;
}

void FireAlarmSensor::setFireCallback(std::function<void(bool active)> cb) {
    _callback = cb;
}
