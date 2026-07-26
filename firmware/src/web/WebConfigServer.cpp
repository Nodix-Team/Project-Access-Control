// ============================================================
//  WebConfigServer.cpp
//  ESP32 Access Control System — v0.2.0
// ============================================================
#include "WebConfigServer.h"
#include <LittleFS.h>
#include <Update.h>
#include "../sensing/WatchdogManager.h" // Feed WDT during OTA

extern WatchdogManager watchdogManager;


WebConfigServer::WebConfigServer(ConfigManager& config, UserStorage& storage)
    : _config(config),
      _storage(storage),
      _server(8081)
{}

void WebConfigServer::begin() {
    _server.on("/", HTTP_GET, std::bind(&WebConfigServer::_handleRoot, this));
    _server.on("/save", HTTP_POST, std::bind(&WebConfigServer::_handleSave, this));
    _server.on("/update", HTTP_POST, std::bind(&WebConfigServer::_handleUpdateSuccess, this), std::bind(&WebConfigServer::_handleUpdateUpload, this));
    _server.onNotFound(std::bind(&WebConfigServer::_handleNotFound, this));
    
    _server.begin();
    Serial.println("[WebServer] Local Web Config Server started on port 8081");
}

void WebConfigServer::handleClient() {
    _server.handleClient();
}

void WebConfigServer::_handleRoot() {
    if (!_server.authenticate("admin", "p@ssw0rd")) {
        _server.sendHeader("WWW-Authenticate", "Basic realm=\"ESP32 Config\"");
        _server.send(401, "text/html", "<html><head><title>Unauthorized</title></head>"
                                       "<body style='background:#080b11;color:#fff;text-align:center;padding-top:100px;font-family:sans-serif;'>"
                                       "<h2>401 Unauthorized</h2><p>Login required to access this portal.</p></body></html>");
        return;
    }
    _server.send(200, "text/html", _generateHtml());
}

void WebConfigServer::_handleSave() {
    if (!_server.authenticate("admin", "p@ssw0rd")) {
        _server.sendHeader("WWW-Authenticate", "Basic realm=\"ESP32 Config\"");
        _server.send(401, "text/html", "<html><head><title>Unauthorized</title></head>"
                                       "<body style='background:#080b11;color:#fff;text-align:center;padding-top:100px;font-family:sans-serif;'>"
                                       "<h2>401 Unauthorized</h2><p>Login required to access this portal.</p></body></html>");
        return;
    }
    SystemConfig& cfg = _config.getConfig();
    bool dangerousChanged = false;

    // Baca input form
    if (_server.hasArg("wifi_ssid") && _server.arg("wifi_ssid") != cfg.wifi_ssid) {
        cfg.wifi_ssid = _server.arg("wifi_ssid");
        dangerousChanged = true;
    }
    
    // WiFi Password hanya diupdate jika diinputkan (tidak kosong)
    if (_server.hasArg("wifi_password") && _server.arg("wifi_password").length() > 0) {
        cfg.wifi_password = _server.arg("wifi_password");
        dangerousChanged = true;
    }

    if (_server.hasArg("mqtt_broker") && _server.arg("mqtt_broker") != cfg.mqtt_broker) {
        cfg.mqtt_broker = _server.arg("mqtt_broker");
        dangerousChanged = true;
    }

    if (_server.hasArg("mqtt_port") && _server.arg("mqtt_port").toInt() != cfg.mqtt_port) {
        cfg.mqtt_port = _server.arg("mqtt_port").toInt();
        dangerousChanged = true;
    }

    if (_server.hasArg("mqtt_user") && _server.arg("mqtt_user") != cfg.mqtt_user) {
        cfg.mqtt_user = _server.arg("mqtt_user");
        dangerousChanged = true;
    }

    if (_server.hasArg("mqtt_password") && _server.arg("mqtt_password").length() > 0) {
        cfg.mqtt_password = _server.arg("mqtt_password");
        dangerousChanged = true;
    }

    if (_server.hasArg("heartbeat_s")) {
        cfg.heartbeat_s = _server.arg("heartbeat_s").toInt();
    }

    if (_server.hasArg("total_doors")) {
        cfg.total_doors = _server.arg("total_doors").toInt();
    }

    if (_server.hasArg("ip_mode") && _server.arg("ip_mode") != cfg.ip_mode) {
        cfg.ip_mode = _server.arg("ip_mode");
        dangerousChanged = true;
    }

    if (_server.hasArg("ip_address") && _server.arg("ip_address") != cfg.ip_address) {
        cfg.ip_address = _server.arg("ip_address");
        dangerousChanged = true;
    }

    if (_server.hasArg("subnet_mask") && _server.arg("subnet_mask") != cfg.subnet_mask) {
        cfg.subnet_mask = _server.arg("subnet_mask");
        dangerousChanged = true;
    }

    if (_server.hasArg("gateway") && _server.arg("gateway") != cfg.gateway) {
        cfg.gateway = _server.arg("gateway");
        dangerousChanged = true;
    }

    // Kirim response HTML pemberitahuan reboot ke browser
    String rebootHtml = "<html><head><meta http-equiv='refresh' content='10;url=/'></head>"
                        "<body style='font-family:sans-serif; background:#0b0f19; color:#fff; text-align:center; padding-top:100px;'>"
                        "<h2>Konfigurasi Disimpan!</h2>"
                        "<p>ESP32 sedang melakukan reboot untuk mencoba koneksi baru.</p>"
                        "<p>Halaman ini akan me-load ulang secara otomatis dalam 10 detik...</p>"
                        "</body></html>";
    _server.send(200, "text/html", rebootHtml);
    delay(1000);

    if (dangerousChanged) {
        Serial.println("[WebServer] Dangerous settings changed! Menyiapkan rollback & reboot...");
        _config.saveLastKnownGood();
        _config.setPending(true); // Tandai status pending untuk dibuktikan saat boot
    } else {
        _config.saveConfig();
    }

    ESP.restart();
}

void WebConfigServer::_handleUpdateSuccess() {
    if (!_server.authenticate("admin", "p@ssw0rd")) return _server.requestAuthentication();
    _server.sendHeader("Connection", "close");
    _server.send(200, "text/plain", (Update.hasError()) ? "Update Gagal" : "Update Sukses! Alat akan direstart...");
    delay(1000);
    ESP.restart();
}

void WebConfigServer::_handleUpdateUpload() {
    if (!_server.authenticate("admin", "p@ssw0rd")) return _server.requestAuthentication();
    HTTPUpload& upload = _server.upload();
    if (upload.status == UPLOAD_FILE_START) {
        Serial.printf("[OTA] Memulai Update: %s\n", upload.filename.c_str());
        if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
            Update.printError(Serial);
        }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
        if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
            Update.printError(Serial);
        }
        delay(1); // Feed internal Task WDT
        watchdogManager.loop(); // Feed external hardware WDT

    } else if (upload.status == UPLOAD_FILE_END) {
        if (Update.end(true)) {
            Serial.printf("[OTA] Update Selesai: %u bytes\n", upload.totalSize);
        } else {
            Update.printError(Serial);
        }
    }
}

void WebConfigServer::_handleNotFound() {
    _server.send(404, "text/plain", "404 Not Found");
}

String WebConfigServer::_generateHtml() {
    const SystemConfig& cfg = _config.getConfig();
    
    // Status alat
    String wifiStatus = (WiFi.status() == WL_CONNECTED) ? "TERHUBUNG" : "TERPUTUS";
    String ipAddress = WiFi.localIP().toString();
    int rssi = WiFi.RSSI();
    int userCount = _storage.getUserCount();
    unsigned long freeHeap = ESP.getFreeHeap();
    unsigned long uptimeMin = millis() / 60000;

    String html;
    html.reserve(8192);

    html += "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
    html += "<title>ESP32 Access Control Configuration</title>";
    html += "<link href='https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap' rel='stylesheet'>";
    html += "<style>";
    html += "body { font-family: 'Inter', sans-serif; background: #080b11; color: #f3f4f6; margin: 0; padding: 20px; display: flex; justify-content: center; height: 100vh; box-sizing: border-box; overflow: hidden; }";
    html += ".dashboard { width: 100%; max-width: 1200px; display: flex; gap: 20px; height: 100%; }";
    html += "@media (max-width: 900px) { body { height: auto; overflow: auto; } .dashboard { flex-direction: column; height: auto; } }";
    html += ".panel { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box; display: flex; flex-direction: column; }";
    html += ".sidebar { flex: 1; max-width: 320px; height: 100%; justify-content: flex-start; gap: 14px; }";
    html += "@media (max-width: 900px) { .sidebar { max-width: 100%; height: auto; } }";
    html += ".main-content { flex: 2.5; height: 100%; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }";
    html += "@media (max-width: 900px) { .main-content { height: auto; overflow: visible; } }";
    html += "h1 { margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; }";
    html += ".subtitle { font-size: 11px; color: #9ca3af; text-align: center; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }";
    html += ".section-title { font-size: 13px; font-weight: 600; color: #3b82f6; margin: 0 0 12px 0; border-left: 3px solid #3b82f6; padding-left: 8px; text-transform: uppercase; letter-spacing: 1px; }";
    html += ".status-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; }";
    html += ".status-val { font-weight: 600; color: #10b981; }";
    html += ".status-val.error { color: #ef4444; }";
    html += ".alert-box { background: rgba(59, 130, 246, 0.06); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px; padding: 12px; font-size: 12px; color: #60a5fa; line-height: 1.4; text-align: left; }";
    html += "form { display: flex; flex-direction: column; height: 100%; overflow: hidden; }";
    html += "@media (max-width: 900px) { form { height: auto; overflow: visible; } }";
    html += ".form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; overflow-y: auto; flex: 1; margin-bottom: 16px; padding-right: 4px; }";
    html += "@media (max-width: 900px) { .form-grid { grid-template-columns: 1fr; overflow-y: visible; height: auto; } }";
    html += ".form-grid::-webkit-scrollbar { width: 6px; }";
    html += ".form-grid::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }";
    html += ".form-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }";
    html += ".form-grid::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }";
    html += ".form-section { background: rgba(10, 15, 26, 0.4); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 12px; padding: 16px; box-sizing: border-box; }";
    html += "label { display: block; font-size: 11px; color: #9ca3af; margin-bottom: 4px; text-transform: uppercase; font-weight: 600; }";
    html += "input, select { width: 100%; padding: 10px; background: #0c101b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; color: #fff; font-size: 13px; margin-bottom: 12px; box-sizing: border-box; transition: border-color 0.2s; }";
    html += "input:focus, select:focus { outline: none; border-color: #3b82f6; }";
    html += ".btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 8px; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; transition: transform 0.1s, opacity 0.2s; flex-shrink: 0; }";
    html += ".btn:hover { opacity: 0.95; }";
    html += ".btn:active { transform: scale(0.99); }";
    html += "</style>";
    html += "</head><body>";
    
    html += "<div class='dashboard'>";
    
    // Sidebar Status
    html += "<div class='panel sidebar'>";
    html += "<h1>" + cfg.device_id + "</h1>";
    html += "<div class='subtitle'>Local Admin Portal</div>";
    html += "<div class='section-title' style='margin-top: 10px;'>System Status</div>";
    html += "<div class='status-row'><span>WiFi Status</span><span class='status-val " + String(WiFi.status() == WL_CONNECTED ? "" : "error") + "'>" + wifiStatus + "</span></div>";
    html += "<div class='status-row'><span>IP Address</span><span class='status-val'>" + ipAddress + "</span></div>";
    html += "<div class='status-row'><span>Signal RSSI</span><span class='status-val'>" + String(rssi) + " dBm</span></div>";
    html += "<div class='status-row'><span>Active Users</span><span class='status-val'>" + String(userCount) + " Users</span></div>";
    html += "<div class='status-row'><span>Free Memory</span><span class='status-val'>" + String(freeHeap / 1024) + " KB</span></div>";
    html += "<div class='status-row'><span>Uptime</span><span class='status-val'>" + String(uptimeMin) + " Menit</span></div>";
    html += "</div>";
    
    // Main Settings
    html += "<div class='panel main-content'>";
    html += "<div class='section-title' style='margin-bottom: 0;'>Configuration Panel</div>";
    html += "<div class='alert-box'>Peringatan: Mengubah parameter WiFi, MQTT, atau IP Static akan memicu tes koneksi 60 detik pasca reboot. Jika gagal terhubung kembali ke jaringan, sistem secara otomatis me-rollback ke pengaturan aman sebelumnya.</div>";
    
    html += "<form action='/save' method='POST'>";
    html += "<div class='form-grid'>";
    
    // WiFi Section
    html += "<div class='form-section'>";
    html += "<div class='section-title'>WiFi Network</div>";
    html += "<label>WiFi SSID</label>";
    html += "<input type='text' name='wifi_ssid' value='" + cfg.wifi_ssid + "' required>";
    html += "<label>WiFi Password (kosongkan jika tidak diganti)</label>";
    html += "<input type='password' name='wifi_password' placeholder='********'>";
    html += "</div>";
    
    // MQTT Section
    html += "<div class='form-section'>";
    html += "<div class='section-title'>MQTT Broker</div>";
    html += "<label>MQTT Broker Host</label>";
    html += "<input type='text' name='mqtt_broker' value='" + cfg.mqtt_broker + "' required>";
    html += "<label>MQTT Port</label>";
    html += "<input type='number' name='mqtt_port' value='" + String(cfg.mqtt_port) + "' required>";
    html += "<label>MQTT Username</label>";
    html += "<input type='text' name='mqtt_user' value='" + cfg.mqtt_user + "'>";
    html += "<label>MQTT Password (kosongkan jika tidak diganti)</label>";
    html += "<input type='password' name='mqtt_password' placeholder='********'>";
    html += "</div>";
    
    // General Settings Section
    html += "<div class='form-section'>";
    html += "<div class='section-title'>General Config</div>";
    html += "<label>Heartbeat Interval (Detik)</label>";
    html += "<input type='number' name='heartbeat_s' value='" + String(cfg.heartbeat_s) + "' required>";
    html += "<label>Total Pintu Lokal (1-4)</label>";
    html += "<input type='number' name='total_doors' min='1' max='4' value='" + String(cfg.total_doors) + "' required>";
    html += "</div>";
    
    // IP Network Section
    html += "<div class='form-section'>";
    html += "<div class='section-title'>IP Configuration</div>";
    html += "<label>IP Address Mode</label>";
    html += "<select name='ip_mode'>";
    html += "<option value='dhcp'" + String(cfg.ip_mode == "dhcp" ? " selected" : "") + ">DHCP (Otomatis)</option>";
    html += "<option value='static'" + String(cfg.ip_mode == "static" ? " selected" : "") + ">Static IP</option>";
    html += "</select>";
    html += "<label>Static IP Address</label>";
    html += "<input type='text' name='ip_address' value='" + cfg.ip_address + "' placeholder='e.g., 10.120.254.5'>";
    html += "<label>Subnet Mask</label>";
    html += "<input type='text' name='subnet_mask' value='" + cfg.subnet_mask + "' placeholder='e.g., 255.255.255.0'>";
    html += "<label>Gateway Address</label>";
    html += "<input type='text' name='gateway' value='" + cfg.gateway + "' placeholder='e.g., 10.120.254.254'>";
    html += "</div>";
    
    html += "</div>"; // End form-grid
    
    html += "<button type='submit' class='btn'>Simpan & Terapkan Konfigurasi</button>";
    html += "</form>";
    
    // OTA Update Section
    html += "<div class='form-section' style='margin-top: 16px;'>";
    html += "<div class='section-title'>Firmware Update (OTA)</div>";
    html += "<p style='font-size: 11px; color: #9ca3af; margin-bottom: 10px;'>Upload file firmware.bin untuk melakukan update via OTA. Sistem otomatis me-rollback jika gagal boot (Partisi A/B).</p>";
    html += "<form method='POST' action='/update' enctype='multipart/form-data' style='display: flex; flex-direction: row; gap: 10px; height: auto;'>";
    html += "<input type='file' name='update' accept='.bin' style='margin-bottom: 0;' required>";
    html += "<button type='submit' class='btn' style='width: auto; padding: 10px 20px; background: linear-gradient(135deg, #10b981, #059669);'>Upload Firmware</button>";
    html += "</form>";
    html += "</div>";
    
    html += "</div>"; // End main-content
    
    html += "</div>"; // End dashboard
    html += "</body></html>";
    return html;
}
