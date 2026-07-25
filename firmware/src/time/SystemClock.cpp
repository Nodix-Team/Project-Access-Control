#include "SystemClock.h"

SystemClock::SystemClock() : _isRtcAvailable(false) {}

bool SystemClock::begin() {
    // Inisialisasi bus I2C sesuai dengan mapping pin di pin_config.h
    Wire.begin(PIN_RTC_I2C_SDA, PIN_RTC_I2C_SCL);
    
    // Coba mulai modul RTC DS1307
    if (!_rtc.begin(&Wire)) {
        Serial.println("[RTC] ERROR: Modul RTC tidak terdeteksi! Cek wiring I2C SDA/SCL.");
        return false;
    }

    if (!_rtc.isrunning()) {
        Serial.println("[RTC] INFO: RTC baru pertama kali dinyalakan (baterai kosong). Mengatur waktu otomatis...");
        // Atur waktu RTC sesuai dengan waktu compile/flash firmware di komputer
        _rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }

    _isRtcAvailable = true;
    Serial.println("[RTC] Inisialisasi Berhasil. Waktu saat ini: " + getTimestamp());
    return true;
}

String SystemClock::getTimestamp() {
    if (!_isRtcAvailable) {
        return "1970-01-01 00:00:00"; // Waktu fallback (Unix Epoch)
    }
    
    DateTime now = _rtc.now();
    char buf[25];
    // Format standar: YYYY-MM-DD HH:MM:SS
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
