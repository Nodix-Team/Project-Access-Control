import React, { useState, useEffect } from 'react';

const DUMMY_INITIAL_FEEDS = [
  { id: 1, time: '10:45:02', kartu: 'AABBCCDD', nama: 'John Doe', door: 'Lobby Utama', controller: 'ctrl-A', result: 'GRANTED', reason: 'OK' },
  { id: 2, time: '10:44:30', kartu: '99228811', nama: 'Jane Smith', door: 'Ruang Server', controller: 'ctrl-A', result: 'GRANTED', reason: 'OK' },
  { id: 3, time: '10:43:15', kartu: 'FF88CC22', nama: 'Bukan Karyawan', door: 'Lab Komputer', controller: 'ctrl-B', result: 'DENIED', reason: 'UNKNOWN_CARD' },
  { id: 4, time: '10:42:00', kartu: '11223344', nama: 'Bob Wilson', door: 'Ruang Arsip', controller: 'ctrl-A', result: 'DENIED', reason: 'NO_ACCESS' }
];

const SIMULATED_USERS = [
  { kartu: 'AABBCCDD', nama: 'John Doe' },
  { kartu: '99228811', nama: 'Jane Smith' },
  { kartu: '11223344', nama: 'Bob Wilson' },
  { kartu: '55667788', nama: 'Alice Brown' },
  { kartu: 'DEADBEEF', nama: 'David Miller' }
];

const SIMULATED_DOORS = [
  { name: 'Lobby Utama', ctrl: 'ctrl-A', num: 1 },
  { name: 'Ruang Server', ctrl: 'ctrl-A', num: 2 },
  { name: 'Lab Komputer', ctrl: 'ctrl-B', num: 2 },
  { name: 'Gudang Utama', ctrl: 'ctrl-C', num: 1 }
];

const Dashboard = () => {
  const [feeds, setFeeds] = useState(DUMMY_INITIAL_FEEDS);

  // Simulasi log tap kartu masuk secara dinamis
  useEffect(() => {
    const interval = setInterval(() => {
      const randomUser = SIMULATED_USERS[Math.floor(Math.random() * SIMULATED_USERS.length)];
      const randomDoor = SIMULATED_DOORS[Math.floor(Math.random() * SIMULATED_DOORS.length)];
      
      const isGranted = Math.random() > 0.3; // 70% GRANTED
      let reason = 'OK';
      let name = randomUser.nama;
      let kartu = randomUser.kartu;

      if (!isGranted) {
        const denyType = Math.random();
        if (denyType < 0.4) {
          reason = 'UNKNOWN_CARD';
          name = 'Unknown Card';
          kartu = 'FF' + Math.floor(Math.random() * 899999 + 100000).toString(16).toUpperCase();
        } else if (denyType < 0.8) {
          reason = 'NO_ACCESS';
        } else {
          reason = 'INVALID_DOOR';
        }
      }

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const newFeed = {
        id: Date.now(),
        time: timeStr,
        kartu,
        nama: name,
        door: randomDoor.name,
        controller: randomDoor.ctrl,
        result: isGranted ? 'GRANTED' : 'DENIED',
        reason,
        flashClass: isGranted ? 'feed-row-granted' : 'feed-row-denied'
      };

      setFeeds(prev => [newFeed, ...prev.slice(0, 5)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Statistik Grid */}
      <div className="grid-cols-4" style={{ marginBottom: '28px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL USERS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 700 }}>80</span>
            <span style={{ color: 'var(--accent-success)', fontSize: '0.8rem', fontWeight: 600 }}>👤 Aktif</span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL CONTROLLERS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 700 }}>3</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>🔌 ESP32</span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL DOORS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 700 }}>10</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>🚪 Pintu Fisik</span>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CONTROLLER STATUS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 700 }}>2/3</span>
            <span style={{ color: 'var(--accent-success)', fontSize: '0.8rem', fontWeight: 600 }}>🟢 Online</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Live Monitoring Feed */}
        <div className="card" style={{ minHeight: '440px' }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>🔴 Live Access Feed</h3>
            <span className="badge badge-success" style={{ animation: 'pulse 2s infinite' }}>Real-time</span>
          </div>
          
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Nama / Kartu</th>
                  <th>Pintu / Controller</th>
                  <th>Status</th>
                  <th>Alasan</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((feed) => (
                  <tr key={feed.id} className={feed.flashClass || ''}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{feed.time}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{feed.nama}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{feed.kartu}</div>
                    </td>
                    <td>
                      <div>{feed.door}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{feed.controller}</div>
                    </td>
                    <td>
                      <span className={`badge ${feed.result === 'GRANTED' ? 'badge-success' : 'badge-danger'}`}>
                        {feed.result}
                      </span>
                    </td>
                    <td>
                      <code style={{ 
                        fontSize: '0.8rem', 
                        color: feed.reason === 'OK' ? 'var(--accent-success)' : 'var(--accent-danger)' 
                      }}>
                        {feed.reason}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controllers Quick Status list */}
        <div className="card">
          <h3 className="card-title">🔌 Active Controllers</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div style={{ 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px', 
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{ fontWeight: 600 }}>Controller Gedung A</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Device ID: <code style={{ color: 'var(--accent-primary)' }}>esp32-ac-001</code> | IP: 192.168.1.50
                </p>
              </div>
              <span className="badge badge-success">🟢 Online</span>
            </div>

            <div style={{ 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px', 
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{ fontWeight: 600 }}>Controller Gedung B</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Device ID: <code style={{ color: 'var(--accent-primary)' }}>esp32-ac-002</code> | IP: 192.168.1.51
                </p>
              </div>
              <span className="badge badge-success">🟢 Online</span>
            </div>

            <div style={{ 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px', 
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: 0.7
            }}>
              <div>
                <h4 style={{ fontWeight: 600 }}>Controller Loading Dock</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Device ID: <code style={{ color: 'var(--accent-primary)' }}>esp32-ac-003</code> | IP: 192.168.1.52
                </p>
              </div>
              <span className="badge badge-danger">🔴 Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
