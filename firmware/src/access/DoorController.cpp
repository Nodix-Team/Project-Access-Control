#include "DoorController.h"

DoorController::DoorController(uint8_t relayPin, uint8_t rexPin)
    : _relayPin(relayPin),
      _rexPin(rexPin),
      _isUnlocked(false),
      _isFireOverride(false),
      _unlockTime(0),
      _duration(3000),
      _lastRexState(HIGH),
      _lastDebounceTime(0)
{}

void DoorController::begin() {
    pinMode(_relayPin, OUTPUT);
    digitalWrite(_relayPin, LOW); // Default terkunci (relay mati)
    
    pinMode(_rexPin, INPUT_PULLUP); // REX button pakai internal pullup
    _lastRexState = digitalRead(_rexPin);
}

void DoorController::setFireOverride(bool active) {
    _isFireOverride = active;
    if (_isFireOverride) {
        digitalWrite(_relayPin, HIGH); // Buka relay permanen saat kebakaran
        _isUnlocked = true;
        Serial.println("[DOOR] OVERRIDE DARURAT KEBAKARAN: Relay DIBUKA PERMANEN!");
    } else {
        digitalWrite(_relayPin, LOW); // Kunci kembali relay saat alarm mati
        _isUnlocked = false;
        Serial.println("[DOOR] DARURAT KEBAKARAN SELESAI: Relay dikunci kembali.");
    }
}

void DoorController::unlock(unsigned long durationMs) {
    if (_isFireOverride) return; // Jika darurat kebakaran aktif, abaikan timer biasa

    _duration = durationMs;
    _unlockTime = millis();
    _isUnlocked = true;
    
    digitalWrite(_relayPin, HIGH); // Buka pintu (LED menyala)
    Serial.printf("[DOOR] Relay DIBUKA. Pintu Terbuka selama %lu ms.\n", _duration);
}

bool DoorController::isUnlocked() {
    return _isUnlocked;
}

void DoorController::setRexCallback(std::function<void()> cb) {
    _rexCallback = cb;
}

void DoorController::loop() {
    // 0. Jika mode darurat kebakaran aktif, relay ditahan HIGH terus
    if (_isFireOverride) {
        digitalWrite(_relayPin, HIGH);
        return;
    }

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
