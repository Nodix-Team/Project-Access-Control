import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import random
import paho.mqtt.client as mqtt
from sqlalchemy import create_engine, text

# Konfigurasi
MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
DB_URL = "mysql+pymysql://root:p%40ssw0rd@127.0.0.1:3306/access_control"
engine = create_engine(DB_URL)

NUM_USERS = 1000
NUM_TAPS = 2000

class StressTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sprint 4: GUI Stress Test (1000 Users, 2000 Taps)")
        self.root.geometry("600x500")
        self.root.configure(bg="#1e1e1e")
        self.root.attributes("-topmost", True)

        self.running = False
        self.phase = "IDLE"  # IDLE, WIPING, SYNCING, TESTING, DONE
        
        # Metrik
        self.metrics = {
            "users_created": 0,
            "taps": 0,
            "errors": 0
        }
        
        self.setup_ui()
        
    def setup_ui(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#1e1e1e")
        style.configure("TLabel", background="#1e1e1e", foreground="#ffffff", font=("Inter", 11))
        style.configure("Header.TLabel", font=("Inter", 16, "bold"), foreground="#00ffcc")
        
        main_frame = ttk.Frame(self.root, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        ttk.Label(main_frame, text="Sistem Uji Beban Kustom", style="Header.TLabel").pack(pady=5)
        self.lbl_status = ttk.Label(main_frame, text="Status: IDLE", font=("Inter", 12), foreground="#aaa")
        self.lbl_status.pack(pady=10)
        
        # Frame Metrics
        metrics_frame = ttk.Frame(main_frame)
        metrics_frame.pack(fill=tk.X, pady=20)
        
        self.lbl_users = self.create_metric_widget(metrics_frame, "Users Injected", 0, 0, color="#ffcc00")
        self.lbl_taps = self.create_metric_widget(metrics_frame, "Card Taps Sent", 0, 1, color="#00ffcc")
        self.lbl_errors = self.create_metric_widget(metrics_frame, "Errors", 1, 0, color="#ff5555")
        
        # Controls
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill=tk.X, pady=20)
        
        self.btn_start = tk.Button(control_frame, text="Mulai WIPE & Test", bg="#00aa00", fg="white", font=("Inter", 12, "bold"), command=self.start_test)
        self.btn_start.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=5)

        self.btn_stop = tk.Button(control_frame, text="Berhenti Darurat", bg="#aa0000", fg="white", font=("Inter", 12, "bold"), command=self.stop_test, state=tk.DISABLED)
        self.btn_stop.pack(side=tk.RIGHT, expand=True, fill=tk.X, padx=5)
        
        self.update_gui_loop()
        
    def create_metric_widget(self, parent, title, row, col, color):
        f = ttk.Frame(parent)
        f.grid(row=row, column=col, padx=10, pady=10, sticky="ew")
        parent.columnconfigure(col, weight=1)
        
        ttk.Label(f, text=title).pack()
        lbl_val = ttk.Label(f, text="0", font=("Inter", 24, "bold"), foreground=color, background="#1e1e1e")
        lbl_val.pack()
        return lbl_val

    def start_test(self):
        self.running = True
        self.btn_start.config(state=tk.DISABLED)
        self.btn_stop.config(state=tk.NORMAL)
        
        for k in self.metrics:
            self.metrics[k] = 0
            
        self.phase = "WIPING"
        self.lbl_status.config(text="Fase 0: Menghapus Database Lama...", foreground="#ff5555")
        
        threading.Thread(target=self.database_preparation_thread, daemon=True).start()

    def database_preparation_thread(self):
        try:
            with engine.connect() as conn:
                with conn.begin():
                    # 1. Hapus data lama (Wipe DB)
                    conn.execute(text("DELETE FROM access_logs"))
                    conn.execute(text("DELETE FROM user_access"))
                    conn.execute(text("DELETE FROM users"))
                    
                    # 2. Ambil referensi department & doors
                    depts = [row[0] for row in conn.execute(text("SELECT id FROM departments")).fetchall()]
                    doors = [row[0] for row in conn.execute(text("SELECT id FROM doors")).fetchall()]
                    
                    if not doors:
                        doors = [1, 2, 3, 4]
            
            self.phase = "SYNCING"
            self.lbl_status.config(text=f"Fase 1: Injeksi {NUM_USERS} User Acak...", foreground="#ffcc00")
            self.inject_users(depts, doors)
            
        except Exception as e:
            self.metrics["errors"] += 1
            print(f"DB Error: {e}")
            self.stop_test()

    def inject_users(self, depts, doors):
        try:
            with engine.connect() as conn:
                for i in range(1, NUM_USERS + 1):
                    if not self.running: return
                    
                    kartu = str(i).zfill(10)
                    nama = f"Random User {i}"
                    
                    # 70% department, 30% custom access
                    is_custom = random.random() > 0.7
                    
                    dept_id = "NULL"
                    if not is_custom and depts:
                        dept_id = str(random.choice(depts))
                        
                    is_custom_int = 1 if is_custom else 0
                    
                    # Insert user via SQLAlchemy
                    with conn.begin():
                        res = conn.execute(text(f"""
                            INSERT INTO users (kartu, nama, department_id, is_custom_access) 
                            VALUES ('{kartu}', '{nama}', {dept_id}, {is_custom_int})
                        """))
                        user_uid = res.lastrowid
                        
                        # Insert custom access (0 to N doors randomly)
                        if is_custom:
                            num_doors = random.randint(0, len(doors))
                            chosen_doors = random.sample(doors, num_doors)
                            for d_id in chosen_doors:
                                conn.execute(text(f"""
                                    INSERT INTO user_access (user_id, door_id) 
                                    VALUES ({user_uid}, {d_id})
                                """))
                                
                    self.metrics["users_created"] += 1
                    time.sleep(0.001) 
                    
            if self.running:
                self.start_mqtt_phase()
                
        except Exception as e:
            self.metrics["errors"] += 1
            print(f"Injection Error: {e}")
            self.stop_test()

    def start_mqtt_phase(self):
        self.phase = "TESTING"
        self.lbl_status.config(text=f"Fase 2: Menembakkan {NUM_TAPS} Log MQTT!", foreground="#00ffcc")
        
        self.mqtt_clients = []
        for i in range(2): 
            ctrl_id = f"ctrl-{'A' if i==0 else 'B'}"
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"stress_{ctrl_id}")
            client.username_pw_set(ctrl_id, f"{ctrl_id.replace('-', '')}123")
            try:
                client.connect(MQTT_BROKER, MQTT_PORT, 60)
                client.loop_start()
                self.mqtt_clients.append((ctrl_id, client))
            except Exception as e:
                self.metrics["errors"] += 1
                
        threading.Thread(target=self.tap_thread, daemon=True).start()

    def tap_thread(self):
        taps_sent = 0
        while self.running and taps_sent < NUM_TAPS:
            try:
                if not self.mqtt_clients: break
                
                ctrl_id, client = random.choice(self.mqtt_clients)
                
                kartu = str(random.randint(1, NUM_USERS)).zfill(10)
                door = random.randint(1, 4)
                
                status = random.choice(["GRANTED", "DENIED"])
                reason = "OK" if status == "GRANTED" else random.choice(["NO_ACCESS", "UNKNOWN_CARD"])
                    
                payload = f"{kartu},{door},{status},{reason},{int(time.time()*1000)}"
                client.publish(f"access/{ctrl_id}/logs", payload, qos=1)
                
                self.metrics["taps"] += 1
                taps_sent += 1
            except:
                self.metrics["errors"] += 1
            
            time.sleep(0.01)
            
        if self.running:
            self.phase = "DONE"
            self.lbl_status.config(text="Status: SELESAI!", foreground="#00aa00")
            self.stop_test()

    def stop_test(self):
        self.running = False
        if self.phase != "DONE":
            self.phase = "IDLE"
            self.lbl_status.config(text="Status: DIHENTIKAN", foreground="#ff5555")
            
        self.btn_start.config(state=tk.NORMAL)
        self.btn_stop.config(state=tk.DISABLED)
        
        for _, client in getattr(self, "mqtt_clients", []):
            client.loop_stop()
            client.disconnect()

    def update_gui_loop(self):
        self.lbl_users.config(text=f"{self.metrics['users_created']}")
        self.lbl_taps.config(text=f"{self.metrics['taps']}")
        self.lbl_errors.config(text=f"{self.metrics['errors']}")
        self.root.after(100, self.update_gui_loop)

if __name__ == "__main__":
    root = tk.Tk()
    app = StressTestApp(root)
    root.mainloop()
