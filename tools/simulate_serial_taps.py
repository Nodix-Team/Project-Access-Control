# Simulasi tap kartu 1x/detik LEWAT ESP32 FISIK ASLI - beda dari simulate_random_taps.py
# yang publish langsung ke MQTT (melewati device sama sekali). Skrip ini benar-benar
# mengetik ke Serial Monitor device, mengikuti protokol 2-langkah SerialSim.cpp
# (kirim UID kartu -> device balas prompt pintu -> kirim nomor pintu 1-4), jadi ikut
# menguji jalur AccessControl + MqttManager.publishLog() ASLI di firmware, bukan cuma
# backend/MQTT-nya saja.
#
# PRASYARAT: user yang dipakai simulasi harus sudah di-Full-Sync ke device (POST
# /api/controllers/{id}/sync) - kalau belum, device_local UserStorage kosong dan semua
# tap bakal keluar "Tidak terdaftar" (lihat docs/VM_TESTING_PLAN.md bagian 4 & 5).
#
# Pemakaian:
#   python tools/simulate_serial_taps.py --port COM3 --controller-device-id ctrl-B
#   python tools/simulate_serial_taps.py --port COM3 --controller-device-id ctrl-B --interval 1.5 --unknown-chance 0.2
import argparse
import random
import sys
import time

import requests
import serial

SETTLE_S = 0.15  # jeda setelah kirim baris, kasih waktu device proses & echo balik


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


def random_unknown_kartu() -> str:
    return "".join(random.choice("0123456789ABCDEF") for _ in range(8))


def read_pending(ser: serial.Serial) -> str:
    time.sleep(SETTLE_S)
    data = ser.read(ser.in_waiting or 1)
    return data.decode(errors="replace")


def send_line(ser: serial.Serial, line: str) -> None:
    ser.write((line + "\n").encode())


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulasi tap kartu 1x/detik lewat ESP32 fisik (Serial Monitor)")
    parser.add_argument("--port", required=True, help="COM port ESP32, mis. COM3")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--controller-device-id", required=True, help="device_id controller ini di DB, mis. ctrl-B")
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default="admin123")
    parser.add_argument("--interval", type=float, default=1.0, help="Jeda antar tap, detik (default 1.0)")
    parser.add_argument("--unknown-chance", type=float, default=0.15, help="Peluang kirim kartu TIDAK terdaftar, 0-1 (default 0.15, uji UNKNOWN_CARD)")
    parser.add_argument("--wrong-door-chance", type=float, default=0.2, help="Peluang tap ke pintu yang BUKAN haknya, 0-1 (default 0.2, uji NO_ACCESS)")
    args = parser.parse_args()

    session = requests.Session()
    print(f"[INIT] Login ke {args.api} sebagai {args.username}...")
    token = login(session, args.api, args.username, args.password)
    headers = {"Authorization": f"Bearer {token}"}

    print("[INIT] Ambil user dari API, filter yang sudah punya akses ke controller ini...")
    all_users = fetch_all_users(session, args.api, headers)
    synced_users = [u for u in all_users if u.get("access", {}).get(args.controller_device_id)]

    if not synced_users:
        print(f"[FATAL] Tidak ada user dengan akses ke '{args.controller_device_id}'.")
        print("        Pastikan sudah Full Sync (POST /api/controllers/{id}/sync) dan device_id-nya benar.")
        sys.exit(1)

    print(f"[INIT] {len(synced_users)} user relevan ditemukan (dari total {len(all_users)}).")

    print(f"[INIT] Buka serial {args.port} @ {args.baud}...")
    ser = serial.Serial(args.port, args.baud, timeout=1)
    time.sleep(2)  # tunggu port stabil, JANGAN reset device (biar state/user lokal tidak hilang)
    ser.reset_input_buffer()

    print(f"[RUN] Mulai simulasi, tiap {args.interval}s. Ctrl+C untuk stop.\n")

    tap_count = 0
    try:
        while True:
            tap_count += 1
            is_unknown = random.random() < args.unknown_chance

            if is_unknown:
                kartu = random_unknown_kartu()
                door = random.randint(1, 4)
                expect = "UNKNOWN_CARD"
            else:
                user = random.choice(synced_users)
                kartu = user["kartu"]
                allowed_doors = user["access"][args.controller_device_id]
                if random.random() < args.wrong_door_chance:
                    wrong_candidates = [d for d in range(1, 5) if d not in allowed_doors]
                    door = random.choice(wrong_candidates) if wrong_candidates else random.choice(allowed_doors)
                    expect = "GRANTED" if door in allowed_doors else "NO_ACCESS"
                else:
                    door = random.choice(allowed_doors)
                    expect = "GRANTED"

            send_line(ser, kartu)
            scan_echo = read_pending(ser)
            send_line(ser, str(door))
            result_echo = read_pending(ser)

            granted = "ACCESS GRANTED" in result_echo
            outcome = "GRANTED" if granted else ("UNKNOWN_CARD" if "Tidak terdaftar" in scan_echo else "DENIED")
            match = "OK" if (outcome == "GRANTED") == (expect == "GRANTED") else "MISMATCH"

            print(f"[TAP #{tap_count}] {kartu} -> Pintu {door} | ekspektasi={expect} aktual={outcome} [{match}]")

            time.sleep(max(0, args.interval - 2 * SETTLE_S))
    except KeyboardInterrupt:
        print(f"\n[STOP] Simulasi dihentikan oleh user. Total tap: {tap_count}")
    finally:
        ser.close()


if __name__ == "__main__":
    main()
