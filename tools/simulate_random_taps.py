# Simulasi tap kartu random dari USER YANG SUDAH ADA di database (bukan user karangan),
# satu kali tiap `--interval` detik, dikirim langsung lewat MQTT ke broker seolah-olah dari
# controller sungguhan (access/{device_id}/logs). Sebagian tap ditandai REPLAYED (peluang
# diatur --replay-chance) untuk mensimulasikan log dari buffer offline controller.
#
# GRANTED/DENIED dihitung dari akses ter-resolve user itu sendiri (GET /api/users), bukan
# ditebak acak - supaya data yang masuk tetap konsisten dengan aturan akses nyata.
#
# Pemakaian:
#   python tools/simulate_random_taps.py
#   python tools/simulate_random_taps.py --interval 0.5 --replay-chance 0.3
#   python tools/simulate_random_taps.py --api http://localhost:8000 --mqtt-host localhost
import argparse
import random
import sys
import time

import paho.mqtt.client as mqtt
import requests


def login(session: requests.Session, api_base: str, username: str, password: str) -> str:
    resp = session.post(f"{api_base}/api/auth/login", json={"username": username, "password": password})
    resp.raise_for_status()
    return resp.json()["access_token"]


def fetch_all_users(session: requests.Session, api_base: str, headers: dict) -> list:
    users = []
    page = 1
    while True:
        resp = session.get(f"{api_base}/api/users", params={"page": page, "page_size": 100}, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        users.extend(data["items"])
        if page * data["page_size"] >= data["total"]:
            break
        page += 1
    return users


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulasi tap kartu random dari user yang sudah ada di DB")
    # 127.0.0.1, BUKAN localhost - di banyak mesin Windows resolusi "localhost" nyoba IPv6 (::1)
    # dulu sebelum fallback ke IPv4, nambah delay ~2 detik di SETIAP request baru.
    parser.add_argument("--api", default="http://127.0.0.1:8000", help="Base URL backend REST API")
    parser.add_argument("--mqtt-host", default="127.0.0.1", help="Host broker MQTT")
    parser.add_argument("--mqtt-port", type=int, default=1883)
    parser.add_argument("--username", default="admin", help="Username admin buat login API")
    parser.add_argument("--password", default="admin123", help="Password admin buat login API")
    parser.add_argument("--interval", type=float, default=1.0, help="Jeda antar tap, detik (default 1.0)")
    parser.add_argument("--replay-chance", type=float, default=0.15, help="Peluang satu tap ditandai REPLAYED, 0-1 (default 0.15)")
    args = parser.parse_args()

    session = requests.Session()

    print(f"[INIT] Login ke {args.api} sebagai {args.username}...")
    token = login(session, args.api, args.username, args.password)
    headers = {"Authorization": f"Bearer {token}"}

    print("[INIT] Ambil data user, controller, pintu dari API...")
    users = fetch_all_users(session, args.api, headers)
    controllers = session.get(f"{args.api}/api/controllers", headers=headers).json()
    doors = session.get(f"{args.api}/api/doors", headers=headers).json()

    if not users:
        print("[FATAL] Tidak ada user di database - tambahkan user dulu lewat UI/API.")
        sys.exit(1)
    if not controllers:
        print("[FATAL] Tidak ada controller di database.")
        sys.exit(1)

    doors_by_controller = {}
    for d in doors:
        doors_by_controller.setdefault(d["controller_id"], []).append(d)
    controllers = [c for c in controllers if doors_by_controller.get(c["id"])]
    if not controllers:
        print("[FATAL] Tidak ada controller yang punya pintu terdaftar.")
        sys.exit(1)

    print(f"[INIT] {len(users)} user, {len(controllers)} controller siap dipakai simulasi.")

    mqttc = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqttc.connect(args.mqtt_host, args.mqtt_port)
    mqttc.loop_start()

    print(f"[RUN] Mulai simulasi, tiap {args.interval}s, peluang REPLAYED {args.replay_chance:.0%}. Ctrl+C untuk stop.\n")

    uptime_ms = 0
    try:
        while True:
            user = random.choice(users)
            controller = random.choice(controllers)
            door = random.choice(doors_by_controller[controller["id"]])

            # access dari GET /api/users sudah ter-resolve: {device_id: [door_number, ...]}
            allowed_door_numbers = user.get("access", {}).get(controller["device_id"], [])
            if door["door_number"] in allowed_door_numbers:
                result, reason = "GRANTED", "OK"
            else:
                result, reason = "DENIED", "NO_ACCESS"

            is_replayed = random.random() < args.replay_chance
            uptime_ms += int(args.interval * 1000)

            payload = f"{user['kartu']},{door['door_number']},{result},{reason},{uptime_ms}"
            if is_replayed:
                payload += ",REPLAYED"

            topic = f"access/{controller['device_id']}/logs"
            mqttc.publish(topic, payload, qos=1)

            tag = " [REPLAYED]" if is_replayed else ""
            print(f"[TAP]{tag} {user['nama']} ({user['kartu']}) -> {controller['device_id']} Pintu {door['door_number']} = {result}")

            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[STOP] Simulasi dihentikan oleh user.")
    finally:
        mqttc.loop_stop()
        mqttc.disconnect()


if __name__ == "__main__":
    main()
