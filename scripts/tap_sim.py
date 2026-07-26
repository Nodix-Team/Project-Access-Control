import serial
import time

port = "COM13"
baud = 115200

print(f"=== Opening Serial Port {port} ===")
ser = serial.Serial()
ser.port = port
ser.baudrate = baud
ser.dtr = False
ser.rts = False
ser.timeout = 1
ser.open()

time.sleep(1)

# Lakukan tap sebanyak 3 kali berturut-turut dengan jeda
for i in range(1, 4):
    print(f"\n--- [AKSES KE-{i}] Sending Tap: 123456 ---")
    ser.write(b"123456\r\n")
    time.sleep(0.5)
    
    print(f"--- [AKSES KE-{i}] Selecting Door 1 ---")
    ser.write(b"1\r\n")
    
    # Tunggu 4.5 detik agar relay menyala 3 detik lalu mati
    time.sleep(4.5)
    
    while ser.in_waiting:
        raw = ser.readline()
        try:
            line = raw.decode('utf-8', errors='ignore').strip()
            if line:
                print(f"ESP32: {line.encode('ascii', 'ignore').decode('ascii')}")
        except Exception:
            pass

ser.close()
print("\nDone! 3x Akses telah dikirim.")
