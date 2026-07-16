import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import random
import requests
import paho.mqtt.client as mqtt

# Konfigurasi
API_URL = "http://127.0.0.1:8000/api"
MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
TEST_DURATION = 180  # 3 menit

class StressTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sprint 1-4: GUI Stress Test Dashboard")
        self.root.geometry("600x500")
        self.root.configure(bg="#1e1e1e")
        self.root.attributes("-topmost", True)

        self.running = False
        self.time_left = TEST_DURATION
        
        # Metrik
        self.metrics = {
            "users_created": 0,
            "heartbeats": 0,
            "taps": 0,
            "replays": 0,
            "errors": 0
        }
        
        self.token = ""
        self.setup_ui()
        
    def setup_ui(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#1e1e1e")
        style.configure("TLabel", background="#1e1e1e", foreground="#ffffff", font=("Inter", 11))
        style.configure("Header.TLabel", font=("Inter", 16, "bold"), foreground="#00ffcc")
        style.configure("Metric.TLabel", font=("Inter", 24, "bold"), foreground="#ffcc00")
        
        main_frame = ttk.Frame(self.root, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        ttk.Label(main_frame, text="Sistem Uji Beban Terintegrasi", style="Header.TLabel").pack(pady=10)
        
        self.lbl_timer = ttk.Label(main_frame, text="03:00", font=("Inter", 32, "bold"), foreground="#ff5555", background="#1e1e1e")
        self.lbl_timer.pack(pady=10)
        
        # Frame Metrics
        metrics_frame = ttk.Frame(main_frame)
        metrics_frame.pack(fill=tk.X, pady=20)
        
        # Grid metrics
        self.lbl_users = self.create_metric_widget(metrics_frame, "Users Injected", 0, 0)
        self.lbl_heartbeats = self.create_metric_widget(metrics_frame, "Heartbeats Sent", 0, 1)
        self.lbl_taps = self.create_metric_widget(metrics_frame, "Card Taps Sent", 1, 0)
        self.lbl_replays = self.create_metric_widget(metrics_frame, "Offline Replays", 1, 1)
        self.lbl_errors = self.create_metric_widget(metrics_frame, "Errors", 2, 0, color="#ff5555")
        self.lbl_tps = self.create_metric_widget(metrics_frame, "Taps/Sec (TPS)", 2, 1, color="#00ffcc")
        
        # Controls
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill=tk.X, pady=20)
        
        self.btn_start = tk.Button(control_frame, text="Mulai Stress Test (3 Menit)", bg="#00aa00", fg="white", font=("Inter", 12, "bold"), command=self.start_test)
        self.btn_start.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=5)

        self.btn_stop = tk.Button(control_frame, text="Berhenti Darurat", bg="#aa0000", fg="white", font=("Inter", 12, "bold"), command=self.stop_test, state=tk.DISABLED)
        self.btn_stop.pack(side=tk.RIGHT, expand=True, fill=tk.X, padx=5)
        
        self.update_gui_loop()
        self.root.after(1000, self.start_test)
        
    def create_metric_widget(self, parent, title, row, col, color="#ffcc00"):
        f = ttk.Frame(parent)
        f.grid(row=row, column=col, padx=10, pady=10, sticky="ew")
        parent.columnconfigure(col, weight=1)
        
        ttk.Label(f, text=title).pack()
        lbl_val = ttk.Label(f, text="0", font=("Inter", 20, "bold"), foreground=color, background="#1e1e1e")
        lbl_val.pack()
        return lbl_val

    def auth_backend(self):
        try:
            r = requests.post(f"{API_URL}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=5)
            if r.status_code == 200:
                self.token = r.json().get("access_token")
                return True
        except Exception as e:
            self.metrics["errors"] += 1
            print(f"Auth Error: {e}")
        return False

    def start_test(self):
        if not self.auth_backend():
            messagebox.showerror("Error", "Gagal login ke Backend API. Pastikan backend menyala.")
            return
            
        self.running = True
        self.btn_start.config(state=tk.DISABLED)
        self.btn_stop.config(state=tk.NORMAL)
        self.time_left = TEST_DURATION
        
        # Reset metrics
        for k in self.metrics:
            self.metrics[k] = 0
            
        self.last_taps = 0
        self.tps = 0
        
        threading.Thread(target=self.timer_thread, daemon=True).start()
        threading.Thread(target=self.user_injection_thread, daemon=True).start()
        
        # Start MQTT clients
        self.mqtt_clients = []
        for i in range(2): # ctrl-A dan ctrl-B
            ctrl_id = f"ctrl-{'A' if i==0 else 'B'}"
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"stress_{ctrl_id}")
            client.username_pw_set(ctrl_id, f"{ctrl_id.replace('-', '')}123")
            try:
                client.connect(MQTT_BROKER, MQTT_PORT, 60)
                client.loop_start()
                self.mqtt_clients.append((ctrl_id, client))
                
                # Start simulator threads per client
                threading.Thread(target=self.heartbeat_thread, args=(ctrl_id, client), daemon=True).start()
                threading.Thread(target=self.tap_thread, args=(ctrl_id, client), daemon=True).start()
            except Exception as e:
                self.metrics["errors"] += 1
                print(f"MQTT Error: {e}")

    def stop_test(self):
        self.running = False
        self.btn_start.config(state=tk.NORMAL)
        self.btn_stop.config(state=tk.DISABLED)
        for _, client in getattr(self, "mqtt_clients", []):
            client.loop_stop()
            client.disconnect()

    def timer_thread(self):
        while self.running and self.time_left > 0:
            time.sleep(1)
            self.time_left -= 1
            
            # Calculate TPS
            current_taps = self.metrics["taps"]
            self.tps = current_taps - self.last_taps
            self.last_taps = current_taps
            
            if self.time_left == 10:
                # Trigger offline replay burst at last 10 seconds
                threading.Thread(target=self.offline_replay_thread, daemon=True).start()
                
        if self.time_left <= 0:
            self.stop_test()
            messagebox.showinfo("Selesai", "Stress Test telah berakhir dengan sukses!")

    def user_injection_thread(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        # Injeksi 5000 user bertahap
        for i in range(1, 5001):
            if not self.running:
                break
            kartu = str(i).zfill(10)
            payload = {"kartu": kartu, "nama": f"Stress User {i}", "doors": [1, 2, 3, 4]}
            try:
                r = requests.post(f"{API_URL}/users", json=payload, headers=headers)
                if r.status_code in [200, 201]:
                    self.metrics["users_created"] += 1
            except:
                self.metrics["errors"] += 1
            
            # Rate limit to not instantly crash local API
            time.sleep(0.01)

    def heartbeat_thread(self, ctrl_id, client):
        uptime = 0
        while self.running:
            try:
                payload = f"4,5000,200000,{uptime*1000}"
                client.publish(f"access/{ctrl_id}/status", payload, qos=0)
                self.metrics["heartbeats"] += 1
                uptime += 1
            except:
                self.metrics["errors"] += 1
            time.sleep(1)

    def tap_thread(self, ctrl_id, client):
        while self.running:
            try:
                kartu = str(random.randint(1, 5000)).zfill(10)
                door = random.randint(1, 4)
                status = random.choice(["GRANTED", "DENIED"])
                reason = "OK" if status == "GRANTED" else "NO_ACCESS"
                payload = f"{kartu},{door},{status},{reason},{int(time.time()*1000)}"
                client.publish(f"access/{ctrl_id}/logs", payload, qos=1)
                self.metrics["taps"] += 1
            except:
                self.metrics["errors"] += 1
            # 20 taps per second per controller = 0.05 sleep
            time.sleep(0.05)
            
    def offline_replay_thread(self):
        if not self.mqtt_clients: return
        ctrl_id, client = self.mqtt_clients[0]
        # Burst 1000 offline logs
        for i in range(1000):
            if not self.running: break
            kartu = str(random.randint(1, 5000)).zfill(10)
            payload = f"{kartu},1,GRANTED,OK,{int(time.time()*1000)},REPLAYED"
            try:
                client.publish(f"access/{ctrl_id}/logs", payload, qos=1)
                self.metrics["replays"] += 1
            except:
                self.metrics["errors"] += 1
            time.sleep(0.001)

    def update_gui_loop(self):
        mins, secs = divmod(self.time_left, 60)
        self.lbl_timer.config(text=f"{mins:02d}:{secs:02d}")
        
        self.lbl_users.config(text=f"{self.metrics['users_created']}")
        self.lbl_heartbeats.config(text=f"{self.metrics['heartbeats']}")
        self.lbl_taps.config(text=f"{self.metrics['taps']}")
        self.lbl_replays.config(text=f"{self.metrics['replays']}")
        self.lbl_errors.config(text=f"{self.metrics['errors']}")
        
        if self.running:
            self.lbl_tps.config(text=f"{getattr(self, 'tps', 0)}")
            
        self.root.after(200, self.update_gui_loop)

if __name__ == "__main__":
    root = tk.Tk()
    app = StressTestApp(root)
    root.mainloop()
