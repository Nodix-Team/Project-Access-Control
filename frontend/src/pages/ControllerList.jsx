import React, { useState } from 'react';

const INITIAL_CONTROLLERS = [
  { 
    id: 1, 
    deviceId: 'esp32-ac-001', 
    nama: 'Controller Gedung A', 
    lokasi: 'Gedung A Lantai 1', 
    wifiSsid: 'REDMI', 
    mqttBroker: '127.0.0.1', 
    mqttPort: 1883,
    totalDoors: 4, 
    heartbeatS: 30, 
    ipMode: 'static', 
    ipAddress: '192.168.1.50',
    webPort: 8081,
    userCount: 80,
    online: true 
  },
  { 
    id: 2, 
    deviceId: 'esp32-ac-002', 
    nama: 'Controller Gedung B', 
    lokasi: 'Gedung B Lantai 1', 
    wifiSsid: 'REDMI', 
    mqttBroker: '127.0.0.1', 
    mqttPort: 1883,
    totalDoors: 4, 
    heartbeatS: 30, 
    ipMode: 'dhcp', 
    ipAddress: '192.168.1.102',
    webPort: 8081,
    userCount: 80,
    online: true 
  },
  { 
    id: 3, 
    deviceId: 'esp32-ac-003', 
    nama: 'Controller Loading Dock', 
    lokasi: 'Gedung C (Belakang)', 
    wifiSsid: 'REDMI_OUTDOOR', 
    mqttBroker: '127.0.0.1', 
    mqttPort: 1883,
    totalDoors: 2, 
    heartbeatS: 30, 
    ipMode: 'static', 
    ipAddress: '192.168.1.52',
    webPort: 8081,
    userCount: 80,
    online: false 
  }
];

const ControllerList = () => {
  const [controllers, setControllers] = useState(INITIAL_CONTROLLERS);
  const [selectedCtrl, setSelectedCtrl] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Edit Config Form State
  const [heartbeat, setHeartbeat] = useState(30);
  const [totalDoors, setTotalDoors] = useState(4);
  const [wifiSsid, setWifiSsid] = useState('');

  const handleOpenConfig = (ctrl) => {
    setSelectedCtrl(ctrl);
    setHeartbeat(ctrl.heartbeatS);
    setTotalDoors(ctrl.totalDoors);
    setWifiSsid(ctrl.wifiSsid);
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setControllers(prev => prev.map(c => {
      if (c.id === selectedCtrl.id) {
        return {
          ...c,
          heartbeatS: heartbeat,
          totalDoors: totalDoors,
          wifiSsid: wifiSsid
        };
      }
      return c;
    }));
    setShowConfigModal(false);
    alert(`Konfigurasi untuk ${selectedCtrl.nama} sukses disimpan dan di-push ke MQTT!`);
  };

  const handleAtomicSync = (ctrl) => {
    const confirmSync = window.confirm(`Apakah Anda yakin ingin memicu Full Sync Atomik untuk ${ctrl.nama}?`);
    if (confirmSync) {
      alert(`Full Sync Atomik dipicu! Mengirim sync/start -> users/set (${ctrl.userCount} kali) -> sync/end. Menunggu sync/result dari ESP32...`);
    }
  };

  return (
    <div className="card">
      <h3 className="card-title">🔌 Management Controller (ESP32)</h3>
      
      <div className="table-container" style={{ marginTop: '20px' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Device ID / Nama</th>
              <th>Wi-Fi & Broker</th>
              <th>IP Info</th>
              <th>User</th>
              <th>Status</th>
              <th>Web Server Lokal</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {controllers.map(ctrl => (
              <tr key={ctrl.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{ctrl.nama}</div>
                  <code style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}>{ctrl.deviceId}</code>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>SSID: <strong>{ctrl.wifiSsid}</strong></div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Broker: {ctrl.mqttBroker}:{ctrl.mqttPort}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>IP: <strong>{ctrl.ipAddress}</strong></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mode: {ctrl.ipMode.toUpperCase()}</div>
                </td>
                <td style={{ fontWeight: 600 }}>{ctrl.userCount}</td>
                <td>
                  <span className={`badge ${ctrl.online ? 'badge-success' : 'badge-danger'}`}>
                    {ctrl.online ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </td>
                <td>
                  {ctrl.online ? (
                    <a 
                      href={`http://${ctrl.ipAddress}:${ctrl.webPort}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      🔗 http://{ctrl.ipAddress}:{ctrl.webPort}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tidak dapat dijangkau</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleOpenConfig(ctrl)}
                    >
                      ⚙️ Config
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => handleAtomicSync(ctrl)}
                      disabled={!ctrl.online}
                    >
                      🔄 Full Sync
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Config Edit Modal */}
      {showConfigModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px', marginBottom: 0 }}>
            <h3 className="card-title">⚙️ Konfigurasi: {selectedCtrl.nama}</h3>
            
            <form onSubmit={handleSaveConfig}>
              <div className="form-group">
                <label className="form-label">Heartbeat Interval (detik)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={heartbeat} 
                  onChange={(e) => setHeartbeat(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jumlah Pintu Fisik</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={totalDoors} 
                  onChange={(e) => setTotalDoors(e.target.value)}
                  max="4"
                  min="1"
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  *Maksimal 4 pintu per ESP32 controller.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">WiFi SSID (Bahaya - Memicu Reboot)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={wifiSsid} 
                  onChange={(e) => setWifiSsid(e.target.value)}
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: 600 }}>
                  ⚠️ Merubah WiFi SSID akan memicu mekanisme rollback dan reboot pada Controller!
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Push Config 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControllerList;
