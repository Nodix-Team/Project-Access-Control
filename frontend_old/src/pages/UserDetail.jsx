import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const USER_MOCK_DATA = {
  "1": { uid: 1, kartu: 'AABBCCDD', nama: 'John Doe', department: 'IT', isCustomAccess: false, doors: [1, 2, 6] },
  "2": { uid: 2, kartu: '99228811', nama: 'Jane Smith', department: 'IT', isCustomAccess: true, doors: [1, 2, 3, 6] },
  "3": { uid: 3, kartu: '11223344', nama: 'Bob Wilson', department: 'HRD', isCustomAccess: false, doors: [1, 5] },
  "4": { uid: 4, kartu: '55667788', nama: 'Alice Brown', department: 'Finance', isCustomAccess: false, doors: [1] },
  "5": { uid: 5, kartu: 'DEADBEEF', nama: 'David Miller', department: 'Security', isCustomAccess: true, doors: [1, 2, 3, 4, 5, 6, 7, 8] },
  "6": { uid: 6, kartu: '88776655', nama: 'Sarah Conner', department: 'HRD', isCustomAccess: false, doors: [1, 5] }
};

const DEPT_DEFAULT_DOORS = {
  'IT': [1, 2, 6], // Lobby Utama, Ruang Server, Lab Komputer
  'HRD': [1, 5],   // Lobby Utama, Lobby B
  'Finance': [1],  // Lobby Utama
  'Security': [1, 2, 3, 4, 5, 6, 7, 8] // Semua Pintu
};

const ALL_DOORS_METADATA = [
  { id: 1, name: 'Lobby Utama', controller: 'Controller Gedung A (ctrl-A)', number: 1 },
  { id: 2, name: 'Ruang Server', controller: 'Controller Gedung A (ctrl-A)', number: 2 },
  { id: 3, name: 'Ruang Meeting', controller: 'Controller Gedung A (ctrl-A)', number: 3 },
  { id: 4, name: 'Ruang Arsip', controller: 'Controller Gedung A (ctrl-A)', number: 4 },
  { id: 5, name: 'Lobby B', controller: 'Controller Gedung B (ctrl-B)', number: 1 },
  { id: 6, name: 'Lab Komputer', controller: 'Controller Gedung B (ctrl-B)', number: 2 },
  { id: 7, name: 'Gudang Utama', controller: 'Controller Loading Dock (ctrl-C)', number: 1 },
  { id: 8, name: 'Loading Gate', controller: 'Controller Loading Dock (ctrl-C)', number: 2 }
];

const UserDetail = () => {
  const { id } = useParams();
  const user = USER_MOCK_DATA[id] || USER_MOCK_DATA["1"];

  const [isCustom, setIsCustom] = useState(user.isCustomAccess);
  const [selectedDoors, setSelectedDoors] = useState(user.doors);

  // Switch ke mode department defaults
  const handleAccessModeChange = (mode) => {
    if (mode === 'dept') {
      setIsCustom(false);
      setSelectedDoors(DEPT_DEFAULT_DOORS[user.department] || []);
    } else {
      setIsCustom(true);
    }
  };

  const handleDoorToggle = (doorId) => {
    if (!isCustom) return; // Mode department tidak bisa diubah

    setSelectedDoors(prev => {
      if (prev.includes(doorId)) {
        return prev.filter(id => id !== doorId);
      } else {
        return [...prev, doorId];
      }
    });
  };

  const handleSaveAndSync = () => {
    alert(`Konfigurasi hak akses untuk ${user.nama} berhasil disimpan dan di-sync ke Controller via MQTT QoS 1.`);
  };

  return (
    <div>
      <Link to="/users" className="btn btn-secondary" style={{ marginBottom: '24px' }}>
        ⬅️ Kembali ke Daftar User
      </Link>

      <div className="grid-cols-2">
        {/* Info & Access Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card Info User */}
          <div className="card">
            <h3 className="card-title">👤 Data Profil</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Nama Pemilik</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{user.nama}</div>
              </div>
              <div style={{ display: 'flex', gap: '40px' }}>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>UID Kartu</span>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                    {user.kartu}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Departemen</span>
                  <div>{user.department === 'None' ? 'Tanpa Departemen (None)' : user.department}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Pengaturan Hak Akses */}
          <div className="card">
            <h3 className="card-title">🛡️ Otorisasi Pintu</h3>
            
            {/* Toggle Mode */}
            <div style={{ 
              display: 'flex', 
              backgroundColor: 'rgba(0,0,0,0.1)', 
              padding: '6px', 
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              marginBottom: '20px'
            }}>
              <button 
                className="btn" 
                style={{ 
                  flex: 1, justifyContent: 'center', 
                  backgroundColor: !isCustom ? 'var(--accent-primary)' : 'transparent',
                  color: !isCustom ? 'white' : 'var(--text-primary)',
                  boxShadow: !isCustom ? '0 4px 10px rgba(99, 102, 241, 0.2)' : 'none'
                }}
                onClick={() => handleAccessModeChange('dept')}
              >
                Ikut Departemen ({user.department})
              </button>
              <button 
                className="btn"
                style={{ 
                  flex: 1, justifyContent: 'center',
                  backgroundColor: isCustom ? 'var(--accent-primary)' : 'transparent',
                  color: isCustom ? 'white' : 'var(--text-primary)',
                  boxShadow: isCustom ? '0 4px 10px rgba(99, 102, 241, 0.2)' : 'none'
                }}
                onClick={() => handleAccessModeChange('custom')}
              >
                Custom Access
              </button>
            </div>

            {/* Checkbox Pintu */}
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Daftar Pintu Terotorisasi:
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                {/* Grouping by Controller */}
                {['Controller Gedung A (ctrl-A)', 'Controller Gedung B (ctrl-B)', 'Controller Loading Dock (ctrl-C)'].map(ctrlName => {
                  const ctrlDoors = ALL_DOORS_METADATA.filter(d => d.controller === ctrlName);
                  return (
                    <div key={ctrlName} style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                        {ctrlName}
                      </span>
                      <div className="door-grid">
                        {ctrlDoors.map(door => {
                          const active = selectedDoors.includes(door.id);
                          return (
                            <div 
                              key={door.id} 
                              className={`door-item ${active ? 'active' : ''} ${!isCustom ? 'disabled' : ''}`}
                              onClick={() => handleDoorToggle(door.id)}
                            >
                              <span>{active ? '✅' : '⬜'}</span>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{door.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nomor Lokal: {door.number}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSaveAndSync}>
                💾 Simpan & Sync ke Controller
              </button>
            </div>
          </div>
        </div>

        {/* Tab Log Aktivitas Khusus */}
        <div className="card">
          <h3 className="card-title">📜 Log Aktivitas Karyawan</h3>
          <div className="table-container" style={{ marginTop: '16px' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pintu</th>
                  <th>Status</th>
                  <th>Alasan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>2026-07-16 08:30:05</td>
                  <td>Lobby Utama (Pintu 1)</td>
                  <td><span className="badge badge-success">GRANTED</span></td>
                  <td><code>OK</code></td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>2026-07-16 08:29:10</td>
                  <td>Ruang Server (Pintu 2)</td>
                  <td><span className="badge badge-success">GRANTED</span></td>
                  <td><code>OK</code></td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>2026-07-15 17:15:30</td>
                  <td>Ruang Arsip (Pintu 4)</td>
                  <td><span className="badge badge-danger">DENIED</span></td>
                  <td><code>NO_ACCESS</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
