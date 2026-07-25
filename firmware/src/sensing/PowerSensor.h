#ifndef POWERSENSOR_H
#define POWERSENSOR_H

#include <Arduino.h>
#include "pin_config.h"

class PowerSensor {
public:
    PowerSensor();
    void begin();
    void loop();

    bool isMainsLost();
    bool isBatteryLow();

private:
    bool lastMainsState;
    bool lastBatteryState;
    unsigned long lastCheckMs;

    // Thresholds
    // Berdasarkan pembagi tegangan 1k/2.2k (Atau menyesuaikan kalibrasi lab)
    // ESP32 ADC resolusi 12-bit (0-4095)
    // 11.5V -> ADC akan terbaca sekitar 2800 (disesuaikan dengan board)
    const int BATTERY_ADC_THRESHOLD = 2800; 
    const unsigned long CHECK_INTERVAL_MS = 1000;
};

#endif // POWERSENSOR_H
