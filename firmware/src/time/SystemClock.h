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
private:
    RTC_DS1307 _rtc; // Sementara menggunakan RTC_DS1307 khusus untuk hardware prototype Anda
    bool _isRtcAvailable;
};

#endif
