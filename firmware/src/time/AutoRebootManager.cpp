// ============================================================
//  AutoRebootManager.cpp
//  ESP32 Access Control System — v0.3.0
// ============================================================
#include "AutoRebootManager.h"
#include <Preferences.h>

AutoRebootManager::AutoRebootManager(SystemClock& systemClock)
    : _systemClock(systemClock),
      _targetHour(3),
      _targetMinute(0),
      _lastRebootDay(-1),
      _lastCheckMs(0)
{}

void AutoRebootManager::begin(uint8_t targetHour, uint8_t targetMinute) {
    _targetHour = targetHour;
    _targetMinute = targetMinute;

    // Baca hari terakhir reboot dari NVS agar tidak terjadi reboot berulang dalam menit yang sama
    Preferences prefs;
    prefs.begin("sys_store", true);
    _lastRebootDay = prefs.getInt("reboot_day", -1);
    prefs.end();

    Serial.printf("[AutoReboot] Modul Maintenance Terjadwal Aktif — Target Reboot: %02d:%02d AM (Last Reboot Day: %d)\n",
                  _targetHour, _targetMinute, _lastRebootDay);
}

void AutoRebootManager::loop() {
    unsigned long nowMs = millis();
    if (nowMs - _lastCheckMs < 1000) return;
    _lastCheckMs = nowMs;

    DateTime dt = _systemClock.now();
    // ID Unik Hari: YYYYMMDD (contoh: 20260725)
    int currentDayId = dt.year() * 10000 + dt.month() * 100 + dt.day();
    
    // Cek jika jam dan menit cocok & belum pernah reboot di hari YYYYMMDD yang sama
    if (dt.hour() == _targetHour && dt.minute() == _targetMinute) {
        if (_lastRebootDay != currentDayId) {
            _lastRebootDay = currentDayId;

            // Simpan hari ini ke NVS sebelum restart
            Preferences prefs;
            prefs.begin("sys_store", false);
            prefs.putInt("reboot_day", currentDayId);
            prefs.end();

            Serial.printf("\n[MAINTENANCE] ⏰ Waktu %02d:%02d AM (Date ID: %d) tercapai!\n", _targetHour, _targetMinute, currentDayId);
            Serial.println("[MAINTENANCE] Melakukan Scheduled Auto-Reboot Pembersihan RAM Berkala Harian...");
            delay(1000);
            ESP.restart();
        }
    }
}
