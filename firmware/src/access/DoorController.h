#ifndef DOOR_CONTROLLER_H
#define DOOR_CONTROLLER_H

#include <Arduino.h>
#include <functional>

class DoorController {
public:
    /**
     * @param relayPin Pin yang terhubung ke modul Relay (Active HIGH)
     * @param rexPin Pin yang terhubung ke tombol Push Button (Active LOW)
     */
    DoorController(uint8_t relayPin, uint8_t rexPin);

    void begin();
    void loop();

    // Membuka pintu selama durasi tertentu (default 3 detik)
    void unlock(unsigned long durationMs = 3000);
    
    // Paksa mode darurat kebakaran (Relay terbuka permanen jika active=true)
    void setFireOverride(bool active);

    // Mengecek apakah pintu saat ini sedang dalam keadaan terbuka
    bool isUnlocked();

    // Set callback yang akan dipanggil saat tombol REX ditekan
    void setRexCallback(std::function<void()> cb);

private:
    uint8_t _relayPin;
    uint8_t _rexPin;
    
    bool _isUnlocked;
    bool _isFireOverride;
    unsigned long _unlockTime;
    unsigned long _duration;
    
    bool _lastRexState;
    unsigned long _lastDebounceTime;
    
    std::function<void()> _rexCallback;
};

#endif
