#ifndef SYSTEMCLOCK_H
#define SYSTEMCLOCK_H

#include <Arduino.h>
#include <Wire.h>
#include "RTClib.h"
#include "pin_config.h"

class SystemClock {
public:
    SystemClock();
    bool begin();
    String getTimestamp();
    DateTime now();
    bool setTime(uint16_t year, uint8_t month, uint8_t day, uint8_t hour, uint8_t minute, uint8_t second);
private:
    RTC_DS1307 _rtc;
    bool _isRtcAvailable;
};

#endif
