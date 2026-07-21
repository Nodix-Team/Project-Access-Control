import paho.mqtt.client as mqtt
import time
import sys
import threading

# Mendapatkan IP broker dari argumen baris perintah atau default ke 127.0.0.1
MQTT_BROKER = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
MQTT_PORT = 1883

# Daftar controller yang disimulasikan sesuai dengan database v0.2
CONTROLLERS = {
    "ctrl-A": {
        "device_id": "ctrl-A",
        "username": "ctrl-A",
        "password": "ctrlA123",
        "ip": "192.168.1.99",
        "total_doors": 4,
        # Database RAM awal untuk pengetesan
        "users": {
            "9988776655": [1, 2],
            "1122334455": [1, 3],
        },
        "sync_in_progress": False,
        "current_sync_id": "",
        "staging_users": {}
    },
    "ctrl-B": {
        "device_id": "ctrl-B",
        "username": "ctrl-B",
        "password": "ctrlB123",
        "ip": "192.168.1.100",
        "total_doors": 4,
        # Database RAM awal untuk pengetesan
        "users": {
            "9988776655": [1, 4],
            "5566778899": [2, 3]
        },
        "sync_in_progress": False,
        "current_sync_id": "",
        "staging_users": {}
    }
}

clients = {}
print_lock = threading.Lock()

def safe_print(msg):
    with print_lock:
        print(msg)

def normalize_kartu(kartu):
    clean = kartu.strip()
    if not clean:
        return clean
    # Jika numerik dan kurang dari 10 digit, tambahkan padding leading zero
    if clean.isdigit() and len(clean) < 10:
        clean = clean.zfill(10)
    return clean

def on_connect(client, userdata, flags, reason_code, properties=None):
    device_id = userdata["device_id"]
    if reason_code == 0:
        safe_print(f"\n[{device_id}] Terhubung ke broker {MQTT_BROKER}")
        
        # Kirim status LWT Online (QoS 1, Retained)
        lwt_topic = f"access/{device_id}/status/lwt"
        client.publish(lwt_topic, "online", qos=1, retain=True)
        
        # Subscribe ke topik-topik perintah v0.2
        topics = [
            f"access/{device_id}/users/set",
            f"access/{device_id}/users/delete",
            f"access/{device_id}/users/sync/start",
            f"access/{device_id}/users/sync/end",
            f"access/{device_id}/config/set",
            f"access/{device_id}/config/request"
        ]
        for topic in topics:
            client.subscribe(topic, qos=1)
            
        safe_print(f"[{device_id}] Subscribed ke topik-topik v0.2 dengan QoS 1.")
    else:
        safe_print(f"[{device_id}] Gagal terhubung ke broker, kode: {reason_code}")

def on_message(client, userdata, msg):
    device_id = userdata["device_id"]
    payload = msg.payload.decode('utf-8').strip()
    topic = msg.topic
    
    safe_print(f"\n[{device_id}] <- MQTT: {topic} | Payload: {payload}")
    
    # 1. Topic: users/sync/start
    if topic == f"access/{device_id}/users/sync/start":
        sync_id = payload
        userdata["sync_in_progress"] = True
        userdata["current_sync_id"] = sync_id
        userdata["staging_users"] = {}
        safe_print(f"[{device_id}] Memulai sinkronisasi atomik (Sync ID: {sync_id}). Menunggu data...")

    # 2. Topic: users/set
    elif topic == f"access/{device_id}/users/set":
        parts = payload.split(",")
        if len(parts) < 2:
            safe_print(f"[{device_id}] Format payload users/set salah!")
            return
            
        kartu = normalize_kartu(parts[0])
        doors_str = parts[1]
        
        # Parse doors (Format: 1|2|3)
        doors = []
        if doors_str:
            for d in doors_str.split("|"):
                try:
                    doors.append(int(d))
                except ValueError:
                    pass
                    
        if userdata["sync_in_progress"]:
            userdata["staging_users"][kartu] = doors
            safe_print(f"[{device_id}] Staging User: {kartu} -> Pintu: {doors}")
        else:
            userdata["users"][kartu] = doors
            safe_print(f"[{device_id}] Upsert User (Normal): {kartu} -> Pintu: {doors}")

    # 3. Topic: users/sync/end
    elif topic == f"access/{device_id}/users/sync/end":
        parts = payload.split(",")
        if len(parts) < 2:
            safe_print(f"[{device_id}] Format payload users/sync/end salah!")
            return
            
        sync_id = parts[0].strip()
        try:
            expected_count = int(parts[1].strip())
        except ValueError:
            safe_print(f"[{device_id}] Nilai count tidak valid!")
            return
            
        if not userdata["sync_in_progress"] or sync_id != userdata["current_sync_id"]:
            safe_print(f"[{device_id}] Perintah sync/end diabaikan (Sync ID mismatch atau tidak dalam mode sync)")
            return
            
        staging_count = len(userdata["staging_users"])
        result_topic = f"access/{device_id}/sync/result"
        
        if staging_count == expected_count:
            # Atomic Swap
            userdata["users"] = userdata["staging_users"]
            userdata["sync_in_progress"] = False
            response_payload = f"{sync_id},OK,{expected_count}"
            client.publish(result_topic, response_payload, qos=1, retain=True)
            safe_print(f"[{device_id}] -> Sinkronisasi SUKSES. {expected_count} user disimpan ke RAM.")
        else:
            userdata["sync_in_progress"] = False
            response_payload = f"{sync_id},MISMATCH,{staging_count}"
            client.publish(result_topic, response_payload, qos=1, retain=True)
            safe_print(f"[{device_id}] -> Sinkronisasi GAGAL. Jumlah data mismatch (Staging: {staging_count}, Ekspektasi: {expected_count}). Data dibuang.")

    # 4. Topic: users/delete
    elif topic == f"access/{device_id}/users/delete":
        kartu = normalize_kartu(payload)
        if kartu in userdata["users"]:
            del userdata["users"][kartu]
            safe_print(f"[{device_id}] Berhasil menghapus user: {kartu}")
        else:
            safe_print(f"[{device_id}] Gagal menghapus user: {kartu} (Tidak ditemukan)")

    # 5. Topic: config/set
    elif topic == f"access/{device_id}/config/set":
        parts = payload.split(",")
        if len(parts) == 2:
            key, val = parts[0].strip(), parts[1].strip()
            safe_print(f"[{device_id}] Menerapkan konfigurasi secara lokal: {key}={val}")

    # 6. Topic: config/request
    elif topic == f"access/{device_id}/config/request":
        res_topic = f"access/{device_id}/config/response"
        # Format CSV sesuai proposal
        res_payload = (
            f"wifi_ssid,SSID_Simulated,mqtt_broker,{MQTT_BROKER},mqtt_port,{MQTT_PORT},"
            f"mqtt_user,{device_id},heartbeat_s,10,total_doors,{userdata['total_doors']},"
            f"ip_mode,dhcp,ip_address,{userdata['ip']},subnet_mask,255.255.255.0,gateway,192.168.1.1"
        )
        client.publish(res_topic, res_payload, qos=1, retain=True)
        safe_print(f"[{device_id}] -> Mengirimkan konfigurasi lokal ke {res_topic}")

def run_controller(config):
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, userdata=config)
    client.username_pw_set(config["username"], config["password"])
    client.on_connect = on_connect
    client.on_message = on_message
    
    # Set Last Will and Testament (LWT) ke offline (QoS 1, Retained)
    lwt_topic = f"access/{config['device_id']}/status/lwt"
    client.will_set(lwt_topic, "offline", qos=1, retain=True)
    
    clients[config["device_id"]] = client
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        safe_print(f"[{config['device_id']}] Gagal terhubung ke broker {MQTT_BROKER}: {e}")
        return
        
    client.loop_start()
    
    uptime = 0
    try:
        while True:
            # Kirim heartbeat status CSV setiap 10 detik
            # Format CSV: total_doors,user_count,free_heap,uptime_ms
            user_count = len(config["users"])
            heartbeat_csv = f"{config['total_doors']},{user_count},240000,{uptime * 1000}"
            client.publish(f"access/{config['device_id']}/status", heartbeat_csv, qos=0)
            
            time.sleep(10)
            uptime += 10
    except Exception as e:
        pass
    finally:
        client.loop_stop()
        client.disconnect()

def command_interface():
    time.sleep(2)  # Menunggu agar log koneksi awal selesai
    safe_print("\n=======================================================")
    safe_print("INTERFACE SIMULATOR KETUK KARTU (v0.2 CSV)")
    safe_print("=======================================================")
    safe_print("Perintah yang tersedia:")
    safe_print("  1. tap <controller> <card_uid> <door_number>")
    safe_print("     Contoh: tap ctrl-A 9988776655 1")
    safe_print("     Contoh: tap ctrl-A 12345 2 (akan di-pad otomatis menjadi 0000012345)")
    safe_print("  2. list <controller>")
    safe_print("     Contoh: list ctrl-A")
    safe_print("  3. help (menampilkan menu ini)")
    safe_print("  4. exit / quit (keluar)")
    safe_print("=======================================================\n")
    
    while True:
        try:
            line = input().strip()
        except (KeyboardInterrupt, EOFError):
            break
            
        if not line:
            continue
            
        parts = line.split()
        cmd = parts[0].lower()
        
        if cmd == "exit" or cmd == "quit":
            break
            
        elif cmd == "help":
            safe_print("\nPerintah: ")
            safe_print("  tap <ctrl-A/ctrl-B> <card_uid> <door_number>")
            safe_print("  list <ctrl-A/ctrl-B>")
            safe_print("  exit")
            
        elif cmd == "list":
            if len(parts) < 2:
                safe_print("[ERROR] Gunakan: list <controller_id>")
                continue
            ctrl_id = parts[1]
            if ctrl_id not in CONTROLLERS:
                safe_print(f"[ERROR] Controller '{ctrl_id}' tidak valid. Pilih: ctrl-A atau ctrl-B")
                continue
            
            users = CONTROLLERS[ctrl_id]["users"]
            safe_print(f"\n--- DAFTAR USER RAM LOKAL [{ctrl_id}] ({len(users)}) ---")
            for kartu, doors in users.items():
                safe_print(f"  Kartu: {kartu} | Akses Pintu: {doors}")
            safe_print("------------------------------------------")
            
        elif cmd == "tap":
            if len(parts) < 4:
                safe_print("[ERROR] Gunakan: tap <controller_id> <card_uid> <door_number>")
                continue
                
            ctrl_id, card_uid, door_num_str = parts[1], parts[2], parts[3]
            
            if ctrl_id not in CONTROLLERS:
                safe_print(f"[ERROR] Controller '{ctrl_id}' tidak valid. Pilih: ctrl-A atau ctrl-B")
                continue
                
            try:
                door_num = int(door_num_str)
            except ValueError:
                safe_print("[ERROR] Nomor pintu harus berupa angka!")
                continue
                
            if door_num < 1 or door_num > 4:
                safe_print("[ERROR] Nomor pintu harus di antara 1 dan 4!")
                continue
                
            # Normalisasi kartu
            normalized_card = normalize_kartu(card_uid)
            
            # Simulasi keputusan akses
            users = CONTROLLERS[ctrl_id]["users"]
            granted = False
            reason = "NO_ACCESS"
            
            if normalized_card in users:
                allowed_doors = users[normalized_card]
                if door_num in allowed_doors:
                    granted = True
                    reason = "OK"
            else:
                reason = "UNKNOWN_CARD"
                
            status_str = "GRANTED" if granted else "DENIED"
            safe_print(f"\n[TAP SIMULATION] Kartu {normalized_card} pada {ctrl_id} Pintu {door_num} -> {status_str} (Alasan: {reason})")
            
            # Kirim log CSV ke MQTT: kartu,door_number,status,uptime_ms
            # QoS 1 untuk log kritis
            log_topic = f"access/{ctrl_id}/logs"
            log_payload = f"{normalized_card},{door_num},{status_str},{int(time.time() * 1000) % 1000000}"
            
            if ctrl_id in clients and clients[ctrl_id].is_connected():
                clients[ctrl_id].publish(log_topic, log_payload, qos=1)
                safe_print(f"[{ctrl_id}] -> MQTT Publish Log: {log_topic} | Payload: {log_payload} (QoS 1)")
            else:
                safe_print(f"[ERROR] Controller '{ctrl_id}' sedang offline, gagal mengirim log ke MQTT.")
        else:
            safe_print(f"[ERROR] Perintah tidak dikenal: {cmd}")

if __name__ == "__main__":
    safe_print(f"[SIMULATOR] Memulai simulasi Multi-Controller dengan Broker {MQTT_BROKER}...")
    
    threads = []
    for ctrl_id, config in CONTROLLERS.items():
        t = threading.Thread(target=run_controller, args=(config,))
        t.daemon = True
        t.start()
        threads.append(t)
        
    # Memulai interaksi CLI pada main thread
    t_cli = threading.Thread(target=command_interface)
    t_cli.daemon = True
    t_cli.start()
    
    try:
        while t_cli.is_alive():
            time.sleep(1)
    except KeyboardInterrupt:
        pass
        
    safe_print("\n[SIMULATOR] Mematikan simulator...")
