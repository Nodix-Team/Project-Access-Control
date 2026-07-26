#include "SystemClock.h"

SystemClock::SystemClock() : _isRtcAvailable(false) {}

bool SystemClock::begin() {
    Wire.begin(PIN_RTC_I2C_SDA, PIN_RTC_I2C_SCL);
    
    if (!_rtc.begin(&Wire)) {
        Serial.println("[RTC] ERROR: Modul RTC tidak terdeteksi! Cek wiring I2C SDA/SCL.");
        return false;
    }

    if (!_rtc.isrunning()) {
        Serial.println("[RTC] INFO: RTC baru pertama kali dinyalakan (baterai kosong). Mengatur waktu otomatis...");
        _rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }

    _isRtcAvailable = true;
    Serial.println("[RTC] Inisialisasi Berhasil. Waktu saat ini: " + getTimestamp());
    return true;
}

String SystemClock::getTimestamp() {
    if (!_isRtcAvailable) {
        return "1970-01-01 00:00:00";
    }
    
    DateTime now = _rtc.now();
    char buf[25];
    snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
             now.year(), now.month(), now.day(),
             now.hour(), now.minute(), now.second());
    return String(buf);
}

DateTime SystemClock::now() {
    if (_isRtcAvailable) {
        return _rtc.now();
    }
    return DateTime(1970, 1, 1, 0, 0, 0);
}

bool SystemClock::setTime(uint16_t year, uint8_t month, uint8_t day, uint8_t hour, uint8_t minute, uint8_t second) {
    if (!_isRtcAvailable) return false;
    _rtc.adjust(DateTime(year, month, day, hour, minute, second));
    Serial.println("[RTC] Waktu RTC diperbarui ke: " + getTimestamp());
    return true;
}
