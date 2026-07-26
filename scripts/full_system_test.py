import serial
import time
import sys

port = "COM13"
baud = 115200

print("="*60)
print(" === FASE 7: FULL BREADBOARD SYSTEM INTEGRATION TEST (DRY RUN) ===")
print("="*60)

try:
    ser = serial.Serial()
    ser.port = port
    ser.baudrate = baud
    ser.dtr = False
    ser.rts = False
    ser.timeout = 0.5
    ser.open()
except Exception as e:
    print(f"ERROR: Tidak dapat membuka {port}: {e}")
    sys.exit(1)

time.sleep(1)

def read_lines(duration_s=2):
    start = time.time()
    while time.time() - start < duration_s:
        if ser.in_waiting:
            raw = ser.readline()
            try:
                line = raw.decode('utf-8', errors='ignore').strip()
                if line:
                    print(f"  [ESP32] {line.encode('ascii', 'ignore').decode('ascii')}")
            except Exception:
                pass
        time.sleep(0.05)

print("\n--- SKENARIO 1: Simulasi Tap Kartu SerialSim (Kartu Terdaftar '123456') ---")
ser.write(b"123456\r\n")
time.sleep(1)
ser.write(b"1\r\n")
read_lines(4)

print("\n--- SKENARIO 2: Simulasi Penambahan Kartu Baru via SerialSim Cheatcode ---")
ser.write(b"ADD 999888\r\n")
read_lines(2)

print("\n--- SKENARIO 3: Tap Kartu Baru Yang Baru Saja Didaftarkan ---")
ser.write(b"999888\r\n")
time.sleep(1)
ser.write(b"2\r\n") # Pintu 2 Ruang Server
read_lines(4)

print("\n--- SKENARIO 4: Pengujian Interlock & Fire Alarm (GPIO33 ke GND oleh User) ---")
print(">> SILAHKAN SENTUHKAN KABEL JUMPER GPIO33 KE GND DALAM 10 DETIK INI...")
read_lines(10)

print("\n--- SKENARIO 5: Pengujian REX Button (GPIO13 ke GND oleh User) ---")
print(">> SILAHKAN TEKAN TOMBOL REX (GPIO13 KE GND) DALAM 8 DETIK INI...")
read_lines(8)

print("\n--- SKENARIO 6: Restart & Persistence Audit ---")
ser.write(b"RESTART\r\n")
read_lines(6)

ser.close()
print("\n" + "="*60)
print(" SUCCESS: UJI INTEGRASI SISTEM FASE 7 SELESAI!")
print("="*60)
