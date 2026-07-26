# AI-TO-AI HANDOVER PROTOCOL (READ THIS FIRST)

**TO: Claude Code**
**FROM: Antigravity (Previous AI Agent)**
**DATE: 27 July 2026**

You are taking over the `feature/v0.3-hardware-prototyping` branch. The user relies on you to continue the work flawlessly. Read the following system constraints carefully. **Do NOT deviate from these constraints unless explicitly commanded by the user.**

---

## 🛑 CRITICAL SYSTEM RULES (NEVER BREAK THESE)
1. **NO BLOCKING CODE (`delay()`)**: The entire C++ architecture (`firmware/src/`) relies on a non-blocking `millis()` state machine. We have multiple physical doors, readers, and buzzer patterns (e.g., 500ms ON / 200ms OFF). If you add a single `delay(100)` anywhere, you will freeze the system and break the buzzer/LED rhythms. Use `millis()` timing exclusively.
2. **RELAY LOGIC REMAINS ACTIVE HIGH**: `DoorController.cpp` uses `digitalWrite(_relayPin, HIGH)` to lock/unlock. **DO NOT change this to Active LOW**. The final production board (ESP32-S3) uses a `ULN2003` IC which REQUIRES Active HIGH. The user is currently testing on a breadboard with an Active LOW relay, but they are mechanically bypassing it by using the `NC` (Normally Closed) terminal. Leave the code as Active HIGH.
3. **STRAPPING PINS DANGER (ERROR 0x17)**: The user is testing on an ESP32-WROOM-32D breadboard. If an upload fails with `Failed to connect to ESP32: Wrong boot mode detected (0x17)`, do NOT panic and do NOT rewrite the code. Tell the user to physically unplug the wires from Strapping Pins (GPIO 0, 2, 12, 15) or hold the BOOT button, then retry the upload.
4. **DO NOT EDIT ARCHITECTURE DOCS**: `docs/KEPUTUSAN_ARSITEKTUR_v0.3.md` is **FINAL AND CLOSED**. If you make physical prototyping changes, document them in `docs/HARDWARE_PROTOTYPING_ROADMAP_v0.3.md` ONLY.

---

## 🗺️ CURRENT PROJECT STATE
- **Phase 1 to 8 of Breadboard Prototyping are 100% PASS.** 
- We have fully tested:
  - Wiegand logic (simulated via Serial).
  - NVS offline logging (FIFO) and reboot sequence persistence.
  - Active HIGH Relay control & Watchdog `esp_task_wdt`.
  - Advanced Alarms: DFO (Door Forced Open) & DOTL (Door Open Too Long) on GPIO 14.
  - OTA Upload via HTTP POST (Port 8081). *Note: We DO NOT use ArduinoOTA on UDP 3232!*
- **Awaiting Hardware**: We are waiting for the physical Wiegand RFID module to arrive (tracked in GitHub Issue #72).
- **Next Up**: Phase 9 (W5500 Ethernet Integration).

---

## 🛠️ CLI CHEAT SHEET
The user is on Windows PowerShell. Execute these via terminal exactly as shown.

### 1. Build Firmware
```powershell
cd firmware
pio run
```

### 2. Upload via USB Cable
```powershell
cd firmware
pio run -t upload
```

### 3. Upload via OTA (Wireless)
Because we use HTTP Web Server OTA (not UDP), use the custom python script I left for you:
```powershell
python scripts/ota_wifi_only.py
```
*(Make sure the IP address inside the script matches the ESP32's IP).*

### 4. Monitor Serial (COM13)
```powershell
python scripts/monitor_com13.py
```

### 5. Simulate Card Tap
If the physical RFID hasn't arrived, simulate a card tap via Serial:
```powershell
python scripts/tap_sim.py
```

---

**FINAL NOTE TO CLAUDE:** You have big shoes to fill! Keep the architecture clean, respect the ESP32's hardware limitations, and guide the user through Phase 9 (W5500 Ethernet) successfully. Good luck! 🚀
