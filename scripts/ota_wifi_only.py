import requests
import sys
import os
from requests.auth import HTTPBasicAuth

ip_address = '10.236.255.48'
firmware_path = r"C:\Users\tech\Documents\GitHub\Project-Access_control\firmware\.pio\build\esp32dev\firmware.bin"

if not os.path.exists(firmware_path):
    print(f"Error: File firmware tidak ditemukan di {firmware_path}")
    sys.exit(1)

url = f"http://{ip_address}:8081/update"
print(f"Memulai proses OTA HTTP Web Upload ke {url} ...")

try:
    with open(firmware_path, 'rb') as f:
        files = {'update': ('firmware.bin', f, 'application/octet-stream')}
        response = requests.post(
            url, 
            files=files, 
            auth=HTTPBasicAuth('admin', 'p@ssw0rd'),
            timeout=30
        )
        
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200 and "Update Sukses" in response.text:
        print("\n[+] OTA BERHASIL! ESP32 sedang melakukan reboot otomatis.")
    else:
        print("\n[-] OTA GAGAL.")
        
except Exception as e:
    print(f"HTTP Request error: {e}")
