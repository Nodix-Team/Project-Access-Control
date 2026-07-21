import time
import sys
import threading
import paho.mqtt.client as mqtt

# Mendapatkan IP broker dari argumen baris perintah atau default ke 127.0.0.1
MQTT_BROKER = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
MQTT_PORT = 1883

status_received = []
logs_received = []
sync_result_received = []
config_response_received = []

def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"[TESTER] Terhubung ke broker {MQTT_BROKER} dengan hasil: {reason_code}")
    # Subscribe ke topik-topik v0.2 dengan wildcard
    client.subscribe("access/+/status", qos=1)
    client.subscribe("access/+/logs", qos=1)
    client.subscribe("access/+/sync/result", qos=1)
    client.subscribe("access/+/config/response", qos=1)
    print("[TESTER] Subscribed ke topik status, logs, sync/result, dan config/response.")

def on_message(client, userdata, msg):
    payload_str = msg.payload.decode('utf-8').strip()
    topic = msg.topic
    print(f"\n[TESTER] <- Menerima MQTT: {topic} | Payload: {payload_str}")
    
    if topic.endswith("/status"):
        status_received.append((topic, payload_str))
    elif topic.endswith("/logs"):
        logs_received.append((topic, payload_str))
    elif topic.endswith("/sync/result"):
        sync_result_received.append((topic, payload_str))
    elif topic.endswith("/config/response"):
        config_response_received.append((topic, payload_str))

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set("backend", "backend123")
client.on_connect = on_connect
client.on_message = on_message

print(f"[TESTER] Menghubungkan ke broker {MQTT_BROKER} sebagai user 'backend'...")
try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
except Exception as e:
    print(f"[TESTER] Koneksi gagal: {e}")
    sys.exit(1)

# Jalankan MQTT loop di background thread
t = threading.Thread(target=client.loop_forever)
t.daemon = True
t.start()

time.sleep(2)

print("\n=======================================================")
print("MENJALANKAN UJI INTEGRASI MQTT PROTOKOL v0.2")
print("=======================================================")

# --- UJI 1: Menunggu Heartbeat CSV ---
print("\n--- 1. MENUNGGU HEARTBEAT STATUS (CSV) ---")
print("Menunggu heartbeat status dari simulator (max 12 detik)...")
timeout = time.time() + 12
while time.time() < timeout and not status_received:
    time.sleep(0.5)

if status_received:
    topic, payload = status_received[-1]
    print(f"SUCCESS: Menerima status di {topic} -> {payload}")
    # Payload format: total_doors,user_count,free_heap,uptime_ms
    parts = payload.split(",")
    if len(parts) == 4:
        print(f"   [Parse OK] Total Pintu: {parts[0]}, User: {parts[1]}, Heap: {parts[2]}, Uptime: {parts[3]}ms")
    else:
        print("   ERROR: Format status CSV tidak valid!")
else:
    print("ERROR: Tidak menerima status heartbeat.")

# --- UJI 2: Mengirim User Set (Upsert) ---
print("\n--- 2. PENGUJIAN AKSES SET USER (access/ctrl-A/users/set) ---")
# Mengetes format 10-digit padding (misal: "12345" -> "0000012345" di simulator)
card_test = "12345"
doors_test = "1|2|4"
payload_set = f"{card_test},{doors_test}"
print(f"Publish ke access/ctrl-A/users/set: {payload_set} (QoS 1)")
client.publish("access/ctrl-A/users/set", payload_set, qos=1)
time.sleep(2)

# --- UJI 3: Mengirim User Delete ---
print("\n--- 3. PENGUJIAN HAPUS USER (access/ctrl-A/users/delete) ---")
payload_del = "1122334455"
print(f"Publish ke access/ctrl-A/users/delete: {payload_del} (QoS 1)")
client.publish("access/ctrl-A/users/delete", payload_del, qos=1)
time.sleep(2)

# --- UJI 4: Sinkronisasi Atomik ---
print("\n--- 4. PENGUJIAN SINKRONISASI ATOMIK (access/ctrl-B/users/sync/...) ---")
sync_id = "test-sync-999"
print(f"A. Kirim sync/start ke ctrl-B dengan ID: {sync_id}")
client.publish("access/ctrl-B/users/sync/start", sync_id, qos=1)
time.sleep(1)

# Kirim 2 user untuk disinkronkan
user_a = "0000099999,1|2"
user_b = "0000088888,3|4"
print(f"B. Mengirim data user staging ke ctrl-B...")
client.publish("access/ctrl-B/users/set", user_a, qos=1)
client.publish("access/ctrl-B/users/set", user_b, qos=1)
time.sleep(1)

# Akhiri sync dengan end (count = 2)
payload_end = f"{sync_id},2"
print(f"C. Kirim sync/end ke ctrl-B dengan: {payload_end}")
client.publish("access/ctrl-B/users/sync/end", payload_end, qos=1)

# Tunggu respon sync/result
print("D. Menunggu hasil sinkronisasi dari ctrl-B (max 5 detik)...")
timeout = time.time() + 5
success_sync = False
while time.time() < timeout:
    if sync_result_received:
        res_topic, res_payload = sync_result_received[-1]
        if res_topic == "access/ctrl-B/sync/result" and res_payload.startswith(sync_id):
            print(f"SUCCESS: Menerima hasil sync -> {res_payload}")
            if "OK" in res_payload:
                print("   [Hasil OK] Sinkronisasi atomik berhasil diverifikasi oleh Controller.")
                success_sync = True
            else:
                print("   ERROR: Controller membalas MISMATCH!")
            break
    time.sleep(0.5)

if not success_sync and not sync_result_received:
    print("ERROR: Tidak menerima respon sync/result.")

# --- UJI 5: Request Config ---
print("\n--- 5. PENGUJIAN MINTA KONFIGURASI (access/ctrl-B/config/request) ---")
print("Publish ke access/ctrl-B/config/request (QoS 1)")
client.publish("access/ctrl-B/config/request", "request", qos=1)

print("Menunggu respon konfigurasi dari ctrl-B (max 5 detik)...")
timeout = time.time() + 5
success_config = False
while time.time() < timeout:
    if config_response_received:
        res_topic, res_payload = config_response_received[-1]
        if res_topic == "access/ctrl-B/config/response":
            print(f"SUCCESS: Menerima konfigurasi -> {res_payload}")
            success_config = True
            break
    time.sleep(0.5)

if not success_config:
    print("ERROR: Tidak menerima konfigurasi lokal.")

print("\n=======================================================")
print("SELESAI MENJALANKAN SELURUH UJI INTEGRASI MQTT")
print("=======================================================")

client.disconnect()
print("[TESTER] Koneksi ditutup.")
