import paho.mqtt.client as mqtt
import time
import json
import threading

MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883

# Daftar controller yang akan disimulasikan
CONTROLLERS = [
    {
        "device_id": "esp32-ac-001",
        "username": "ctrl-A",
        "password": "ctrlA123",
        "ip": "192.168.1.99"
    },
    {
        "device_id": "esp32-ac-002",
        "username": "ctrl-B",
        "password": "ctrlB123",
        "ip": "192.168.1.100"
    }
]

def on_connect(client, userdata, flags, reason_code, properties):
    device_id = userdata["device_id"]
    if reason_code == 0:
        print(f"[{device_id}] Berhasil terhubung ke broker {MQTT_BROKER}")
        # Subscribe ke topic v0.1 (global) dan v0.2 (per-device) untuk fleksibilitas testing
        client.subscribe("access/users/#") 
        client.subscribe(f"access/{device_id}/users/#")
    else:
        print(f"[{device_id}] Gagal konek dengan kode: {reason_code}")

def on_message(client, userdata, msg):
    device_id = userdata["device_id"]
    print(f"\n[{device_id}] Menerima Pesan Baru!")
    print(f"   Topic   : {msg.topic}")
    print(f"   Payload : {msg.payload.decode('utf-8')}")

def run_controller(config):
    # Menyimpan config ke dalam userdata agar bisa diakses di callback
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, userdata=config)
    client.username_pw_set(config["username"], config["password"])
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        print(f"[{config['device_id']}] Error koneksi: {e}")
        return
        
    client.loop_start()
    
    uptime = 0
    try:
        while True:
            # Simulasi pengiriman heartbeat per device
            status_payload = {
                "device_id": config["device_id"],
                "uptime_ms": uptime * 1000,
                "user_count": 5,
                "ip": config["ip"],
                "rssi": -55,
                "free_heap": 240000
            }
            # Kirim ke topic lama (v0.1) dan baru (v0.2)
            client.publish("access/status", json.dumps(status_payload))
            client.publish(f"access/{config['device_id']}/status", json.dumps(status_payload))
            
            time.sleep(10)
            uptime += 10
    except Exception as e:
        pass
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    print("[SIMULATOR] Memulai simulasi Multi-Controller...")
    threads = []
    
    for ctrl in CONTROLLERS:
        t = threading.Thread(target=run_controller, args=(ctrl,))
        t.daemon = True
        t.start()
        threads.append(t)
        
    try:
        # Biarkan main thread hidup
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[SIMULATOR] Mematikan semua simulator...")
