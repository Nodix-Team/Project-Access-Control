#ifndef DOOR_CONTROLLER_H
#define DOOR_CONTROLLER_H

#include <Arduino.h>
#include <functional>

class DoorController {
public:
    enum AlarmState { ALARM_IDLE, ALARM_DOTL, ALARM_DFO };

    /**
     * @param relayPin Pin yang terhubung ke modul Relay (Active HIGH)
     * @param rexPin Pin yang terhubung ke tombol Push Button (Active LOW)
     * @param doorSensorPin Pin yang terhubung ke Door Contact Sensor (Active LOW)
     */
    DoorController(uint8_t relayPin, uint8_t rexPin, uint8_t doorSensorPin);

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

    // Config Alarm
    void setAlarmConfig(unsigned long open_s, unsigned long held_s, unsigned long dur_s);
    AlarmState getAlarmState();
    bool isDoorPhysicallyOpen();

private:
    uint8_t _relayPin;
    uint8_t _rexPin;
    uint8_t _doorSensorPin;
    
    bool _isUnlocked;
    bool _isFireOverride;
    unsigned long _unlockTime;
    unsigned long _duration;
    
    bool _lastRexState;
    unsigned long _lastDebounceTime;

    // Door Sensor & Alarm States
    bool _isDoorPhysicallyOpen;
    unsigned long _doorOpenTimestamp;
    AlarmState _currentAlarm;
    unsigned long _alarmTriggerTimestamp;

    // Default configuration (bisa ditimpa oleh NVS/Config)
    unsigned long _open_timeout_s;
    unsigned long _held_timeout_s;
    unsigned long _alarm_duration_s;
    
    std::function<void()> _rexCallback;
};

#endif
