#include "DoorController.h"

DoorController::DoorController(uint8_t relayPin, uint8_t rexPin, uint8_t doorSensorPin)
    : _relayPin(relayPin),
      _rexPin(rexPin),
      _doorSensorPin(doorSensorPin),
      _isUnlocked(false),
      _isFireOverride(false),
      _unlockTime(0),
      _duration(3000),
      _lastRexState(HIGH),
      _lastDebounceTime(0),
      _isDoorPhysicallyOpen(false),
      _doorOpenTimestamp(0),
      _currentAlarm(ALARM_IDLE),
      _alarmTriggerTimestamp(0),
      _open_timeout_s(10),
      _held_timeout_s(30),
      _alarm_duration_s(10)
{}

void DoorController::begin() {
    pinMode(_relayPin, OUTPUT);
    digitalWrite(_relayPin, LOW); // Default terkunci (relay mati, Active HIGH)
    
    pinMode(_rexPin, INPUT_PULLUP); // REX button pakai internal pullup
    _lastRexState = digitalRead(_rexPin);

    pinMode(_doorSensorPin, INPUT_PULLUP); // Active LOW (LOW=Tertutup, HIGH=Terbuka)
    _isDoorPhysicallyOpen = (digitalRead(_doorSensorPin) == HIGH);
}

void DoorController::setAlarmConfig(unsigned long open_s, unsigned long held_s, unsigned long dur_s) {
    _open_timeout_s = open_s;
    _held_timeout_s = held_s;
    _alarm_duration_s = dur_s;
}

DoorController::AlarmState DoorController::getAlarmState() {
    return _currentAlarm;
}

bool DoorController::isDoorPhysicallyOpen() {
    return _isDoorPhysicallyOpen;
}

void DoorController::setFireOverride(bool active) {
    _isFireOverride = active;
    if (_isFireOverride) {
        digitalWrite(_relayPin, HIGH); // Buka relay permanen saat kebakaran (Active HIGH)
        _isUnlocked = true;
        // Saat kebakaran, tekan alarm DFO/DOTL
        _currentAlarm = ALARM_IDLE; 
        _alarmTriggerTimestamp = 0;
        Serial.println("[DOOR] DARURAT KEBAKARAN: Relay DIBUKA PAKSA PERMANEN!");
    } else {
        digitalWrite(_relayPin, LOW); // Kunci kembali relay saat alarm mati (Active HIGH)
        _isUnlocked = false;
        Serial.println("[DOOR] DARURAT KEBAKARAN SELESAI: Relay dikunci kembali.");
    }
}

void DoorController::unlock(unsigned long durationMs) {
    if (_isFireOverride) return; // Jika darurat kebakaran aktif, abaikan timer biasa

    _duration = durationMs;
    _unlockTime = millis();
    _isUnlocked = true;
    
    digitalWrite(_relayPin, HIGH); // Buka pintu (Active HIGH)
    Serial.printf("[DOOR] Relay DIBUKA. Pintu Terbuka selama %lu ms.\n", _duration);
}

bool DoorController::isUnlocked() {
    return _isUnlocked;
}

void DoorController::setRexCallback(std::function<void()> cb) {
    _rexCallback = cb;
}

void DoorController::loop() {
    unsigned long now = millis();

    // 0. Jika mode darurat kebakaran aktif, relay ditahan HIGH terus
    if (_isFireOverride) {
        digitalWrite(_relayPin, HIGH);
    } else {
        // 1. Cek timer relay (apakah sudah waktunya mengunci kembali)
        if (_isUnlocked && (now - _unlockTime >= _duration)) {
            digitalWrite(_relayPin, LOW);
            _isUnlocked = false;
            Serial.println("[DOOR] Relay DITUTUP (Timer Habis). Pintu terkunci kembali.");
        }
    }

    // 2. Evaluasi Door Sensor & Logika Alarm
    bool currentDoorOpen = (digitalRead(_doorSensorPin) == HIGH);
    
    if (currentDoorOpen && !_isDoorPhysicallyOpen) {
        _isDoorPhysicallyOpen = true;
        _doorOpenTimestamp = now;
        Serial.println("[DOOR] Sensor mendeteksi pintu TERBUKA secara fisik.");
        
        // Pintu terbuka tapi tidak ada otorisasi sah = DFO
        if (!_isUnlocked && !_isFireOverride) {
            _currentAlarm = ALARM_DFO;
            _alarmTriggerTimestamp = now;
            Serial.println("[DOOR] ALARM: DOOR FORCED OPEN (DFO)!");
        }
    } 
    else if (!currentDoorOpen && _isDoorPhysicallyOpen) {
        _isDoorPhysicallyOpen = false;
        Serial.println("[DOOR] Sensor mendeteksi pintu TERTUTUP.");
        
        // DOTL langsung mati saat pintu ditutup
        if (_currentAlarm == ALARM_DOTL) {
            _currentAlarm = ALARM_IDLE;
            Serial.println("[DOOR] DOTL Alarm Cleared.");
        }
    }

    // Evaluasi waktu alarm & timeout
    if (_currentAlarm == ALARM_DFO) {
        // Minimum Latch 10 detik. Mati JIKA sudah 10 detik DAN pintu tertutup.
        if ((now - _alarmTriggerTimestamp >= _alarm_duration_s * 1000) && !currentDoorOpen) {
            _currentAlarm = ALARM_IDLE;
            Serial.println("[DOOR] DFO Alarm Cleared (Pintu sudah rapat >10s).");
        }
    }
    else if (_currentAlarm == ALARM_IDLE && _isDoorPhysicallyOpen && !_isFireOverride) {
        // Cek DOTL (Pintu dibuka sah, tapi lupa ditutup setelah held_timeout_s)
        if (now - _doorOpenTimestamp >= _held_timeout_s * 1000) {
            _currentAlarm = ALARM_DOTL;
            Serial.println("[DOOR] ALARM: DOOR OPEN TOO LONG (DOTL)!");
        }
    }

    // 3. Cek tombol REX dengan Debouncing sederhana (50ms)
    bool reading = digitalRead(_rexPin);
    if (reading != _lastRexState) {
        _lastDebounceTime = now;
    }
    
    if ((now - _lastDebounceTime) > 50) {
        if (reading == LOW && !_isUnlocked) {
            Serial.println("[DOOR] Tombol REX ditekan dari dalam ruangan!");
            unlock(3000); 
            
            if (_rexCallback) {
                _rexCallback();
            }
        }
    }
    _lastRexState = reading;
}
