#include "PowerSensor.h"

PowerSensor::PowerSensor() : lastMainsState(false), lastBatteryState(false), lastCheckMs(0) {}

void PowerSensor::begin() {
    pinMode(PIN_SENS_MAINS_LOST, INPUT_PULLUP);
    
    // Konfigurasi ADC untuk PIN_SENS_POWER_LOW (Resolusi 12-bit, 0-4095)
    analogReadResolution(12);
    
    // Initial read
    lastMainsState = (digitalRead(PIN_SENS_MAINS_LOST) == HIGH); // Asumsi HIGH = Lost (pull-up internal)
    lastBatteryState = (analogRead(PIN_SENS_POWER_LOW) < BATTERY_ADC_THRESHOLD);
}

void PowerSensor::loop() {
    if (millis() - lastCheckMs >= CHECK_INTERVAL_MS) {
        lastCheckMs = millis();

        // 1. Cek Mains (Digital)
        bool currentMainsLost = (digitalRead(PIN_SENS_MAINS_LOST) == HIGH); // Asumsi HIGH = putus/hilang
        if (currentMainsLost != lastMainsState) {
            lastMainsState = currentMainsLost;
            if (currentMainsLost) {
                Serial.println("[POWER] ALERT: AC Mains Lost! (PLN Mati)");
                // TODO: Kirim event MQTT (Event 7/8 atau 5/6 tergantung arsitektur final)
            } else {
                Serial.println("[POWER] INFO: AC Mains Restored. (PLN Normal)");
            }
        }

        // 2. Cek Battery (ADC)
        int adcValue = analogRead(PIN_SENS_POWER_LOW);
        bool currentBatteryLow = (adcValue < BATTERY_ADC_THRESHOLD);
        
        if (currentBatteryLow != lastBatteryState) {
            lastBatteryState = currentBatteryLow;
            if (currentBatteryLow) {
                Serial.printf("[POWER] ALERT: Battery Low! Drop < 11.5V (ADC: %d)\n", adcValue);
                // TODO: Kirim event MQTT (Event 5)
            } else {
                Serial.printf("[POWER] INFO: Battery Normal. (ADC: %d)\n", adcValue);
                // TODO: Kirim event MQTT (Event 6)
            }
        }
    }
}

bool PowerSensor::isMainsLost() {
    return lastMainsState;
}

bool PowerSensor::isBatteryLow() {
    return lastBatteryState;
}
