import serial
import time
import sys

PORT = "COM13"
BAUD = 115200

# Force utf-8 stdout output
sys.stdout.reconfigure(encoding='utf-8')

print(f"=== Opening Serial Port {PORT} at {BAUD} baud ===")
try:
    ser = serial.Serial(PORT, BAUD, timeout=1)
except Exception as e:
    print(f"Error opening port {PORT}: {e}")
    sys.exit(1)

# Removed DTR/RTS toggle because it forced DOWNLOAD_BOOT
print("Terhubung ke ESP32 tanpa DTR/RTS toggle...")


print("\n--- Listening to ESP32 (45 seconds) ---")
start_time = time.time()
while time.time() - start_time < 45:
    try:
        if ser.in_waiting:
            line = ser.readline().decode('utf-8', errors='replace').strip()
            if line:
                print(line)
        else:
            time.sleep(0.01)
    except Exception as e:
        print(f"\n[Error reading serial: {e}]")
        break

ser.close()
print("\n=== Serial Monitoring Complete ===")
