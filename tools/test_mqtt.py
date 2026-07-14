import time
import json
import threading
import sys
import os
import paho.mqtt.client as mqtt

MQTT_BROKER = "10.212.228.153"
MQTT_PORT = 1883

status_received = []
logs_received = []

def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"[TESTER] Connected with result code {reason_code}")
    client.subscribe("access/status")
    client.subscribe("access/logs")

def on_message(client, userdata, msg):
    payload_str = msg.payload.decode()
    print(f"\n[TESTER] Received message on topic: {msg.topic}")
    print(f"[TESTER] Payload: {payload_str}")
    try:
        data = json.loads(payload_str)
        if msg.topic == "access/status":
            status_received.append(data)
        elif msg.topic == "access/logs":
            logs_received.append(data)
    except Exception as e:
        print(f"[TESTER] Error parsing JSON: {e}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message

print(f"[TESTER] Connecting to broker {MQTT_BROKER}...")
try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
except Exception as e:
    print(f"[TESTER] Connection failed: {e}")
    sys.exit(1)

# Start loop in thread
t = threading.Thread(target=client.loop_forever)
t.daemon = True
t.start()

time.sleep(2)

print("\n--- 1. TESTING Heartbeat (Waiting for access/status) ---")
print("Waiting 15 seconds to receive status...")
time.sleep(15)
if status_received:
    print(f"OK Success! Status received: {status_received[-1]}")
else:
    print("FAILED to receive status heartbeat.")

print("\n--- 2. TESTING access/users/add ---")
user1 = {
    "kartu": "99887766",
    "nama": "Test User Antigravity",
    "doors": [1, 2]
}
print(f"Publishing user to add: {user1}")
client.publish("access/users/add", json.dumps(user1))
time.sleep(3)

print("\n--- 3. TESTING access/users/update ---")
# ESP32 will auto-increment, let's assume uid is 1 (if clean) or we will test sync.
# To be safe, we will perform sync next, but let's try updating uid 1 first.
user1_update = {
    "uid": 1,
    "kartu": "99887766",
    "nama": "Test User Updated",
    "doors": [1, 2, 3]
}
print(f"Publishing user update: {user1_update}")
client.publish("access/users/update", json.dumps(user1_update))
time.sleep(3)

print("\n--- 4. TESTING access/users/sync ---")
sync_data = [
    {"uid": 5, "kartu": "11223344", "nama": "Sync User 1", "doors": [1, 4]},
    {"uid": 6, "kartu": "55667788", "nama": "Sync User 2", "doors": [2, 3]}
]
print(f"Publishing sync users: {sync_data}")
client.publish("access/users/sync", json.dumps(sync_data))
time.sleep(3)

print("\n--- 5. TESTING access/users/delete ---")
delete_payload = {"uid": 5}
print(f"Publishing delete for uid 5: {delete_payload}")
client.publish("access/users/delete", json.dumps(delete_payload))
time.sleep(3)

print("\n[TESTER] Script finished testing MQTT Command topics. Check the ESP32 serial output log for actual executions.")
client.disconnect()
