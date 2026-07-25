#include "DoorController.h"

DoorController::DoorController(uint8_t relayPin, uint8_t rexPin)
    : _relayPin(relayPin), _rexPin(rexPin), _isUnlocked(false), 
      _unlockTime(0), _duration(3000), _lastRexState(HIGH), _lastDebounceTime(0), _rexCallback(nullptr) {}

void DoorController::begin() {
    pinMode(_relayPin, OUTPUT);
    digitalWrite(_relayPin, LOW); // Default terkunci (relay mati)
    
    pinMode(_rexPin, INPUT_PULLUP); // REX button pakai internal pullup
    _lastRexState = digitalRead(_rexPin);
}

void DoorController::loop() {
    // 1. Cek timer relay (apakah sudah waktunya mengunci kembali)
    if (_isUnlocked && (millis() - _unlockTime >= _duration)) {
        digitalWrite(_relayPin, LOW);
        _isUnlocked = false;
        Serial.println("[DOOR] Relay DITUTUP (Timer Habis). Pintu terkunci kembali.");
    }

    // 2. Cek tombol REX dengan Debouncing sederhana (50ms)
    bool reading = digitalRead(_rexPin);
    if (reading != _lastRexState) {
        _lastDebounceTime = millis();
    }
    
    if ((millis() - _lastDebounceTime) > 50) {
        // Jika tombol ditekan (LOW karena input pullup) dan pintu sedang terkunci
        if (reading == LOW && !_isUnlocked) {
            Serial.println("[DOOR] Tombol REX ditekan dari dalam ruangan!");
            unlock(3000); // Buka pintu 3 detik
            
            // Panggil callback agar MqttManager bisa tahu (untuk log)
            if (_rexCallback) {
                _rexCallback();
            }
        }
    }
    _lastRexState = reading;
}

void DoorController::unlock(unsigned long durationMs) {
    _isUnlocked = true;
    _duration = durationMs;
    _unlockTime = millis();
    digitalWrite(_relayPin, HIGH); // Nyalakan relay (LED)
    Serial.println("[DOOR] Relay DIBUKA. Pintu Terbuka.");
}

bool DoorController::isUnlocked() {
    return _isUnlocked;
}

void DoorController::setRexCallback(std::function<void()> cb) {
    _rexCallback = cb;
}
