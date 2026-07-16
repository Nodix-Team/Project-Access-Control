import React, { useState } from 'react';

const INITIAL_LOGS = [
  { id: 1, kartu: 'AABBCCDD', userNama: 'John Doe', doorNama: 'Lobby Utama', controllerName: 'Gedung A', result: 'GRANTED', reason: 'OK', serverTs: '2026-07-16 10:45:02.124', replayed: false },
  { id: 2, kartu: '99228811', userNama: 'Jane Smith', doorNama: 'Ruang Server', controllerName: 'Gedung A', result: 'GRANTED', reason: 'OK', serverTs: '2026-07-16 10:44:30.512', replayed: false },
  { id: 3, kartu: 'FF88CC22', userNama: 'Unknown Card', doorNama: 'Lab Komputer', controllerName: 'Gedung B', result: 'DENIED', reason: 'UNKNOWN_CARD', serverTs: '2026-07-16 10:43:15.008', replayed: false },
  { id: 4, kartu: '11223344', userNama: 'Bob Wilson', doorNama: 'Ruang Arsip', controllerName: 'Gedung A', result: 'DENIED', reason: 'NO_ACCESS', serverTs: '2026-07-16 10:42:00.672', replayed: false },
  { id: 5, kartu: 'AABBCCDD', userNama: 'John Doe', doorNama: 'Lobby Utama', controllerName: 'Gedung A', result: 'GRANTED', reason: 'OK', serverTs: '2026-07-16 09:30:15.110', replayed: true },
  { id: 6, kartu: '11223344', userNama: 'Bob Wilson', doorNama: 'Ruang Server', controllerName: 'Gedung A', result: 'DENIED', reason: 'NO_ACCESS', serverTs: '2026-07-16 09:29:45.321', replayed: true }
];

const AccessLogs = () => {
  const [logs] = useState(INITIAL_LOGS);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [replayedFilter, setReplayedFilter] = useState('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.userNama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.kartu.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.doorNama.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResult = resultFilter === 'ALL' || log.result === resultFilter;
    const matchesReason = reasonFilter === 'ALL' || log.reason === reasonFilter;
    
    const matchesReplayed = replayedFilter === 'ALL' || 
                            (replayedFilter === 'YES' && log.replayed) || 
                            (replayedFilter === 'NO' && !log.replayed);

    return matchesSearch && matchesResult && matchesReason && matchesReplayed;
  });

  const handleExportCsv = () => {
    alert('Exporting log audit ke format file CSV...');
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>📜 Audit Log Transaksi Akses</h3>
        <button className="btn btn-secondary" onClick={handleExportCsv}>
          <span>📥</span> Export CSV
        </button>
      </div>

      {/* Filter and Search controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label className="form-label">Cari Log</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Cari berdasarkan nama, kartu, atau pintu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">Hasil Akses</label>
          <select 
            className="form-input"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            style={{ appearance: 'auto' }}
          >
            <option value="ALL">Semua Hasil</option>
            <option value="GRANTED">GRANTED</option>
            <option value="DENIED">DENIED</option>
          </select>
        </div>

        <div>
          <label className="form-label">Alasan Deteksi</label>
          <select 
            className="form-input"
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            style={{ appearance: 'auto' }}
          >
            <option value="ALL">Semua Alasan</option>
            <option value="OK">OK</option>
            <option value="NO_ACCESS">NO_ACCESS</option>
            <option value="UNKNOWN_CARD">UNKNOWN_CARD</option>
            <option value="INVALID_DOOR">INVALID_DOOR</option>
          </select>
        </div>

        <div>
          <label className="form-label">Offline Replayed</label>
          <select 
            className="form-input"
            value={replayedFilter}
            onChange={(e) => setReplayedFilter(e.target.value)}
            style={{ appearance: 'auto' }}
          >
            <option value="ALL">Semua Tipe</option>
            <option value="YES">REPLAYED (Offline)</option>
            <option value="NO">Real-time (Online)</option>
          </select>
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', fontStyle: 'italic' }}>
        * Catatan Audit: Log riwayat ini menyimpan snapshot nama user dan nama pintu pada saat kejadian tap kartu untuk validitas audit keamanan.
      </p>

      {/* Logs Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Waktu Server (UTC)</th>
              <th>UID Kartu</th>
              <th>Nama Pemilik (Snapshot)</th>
              <th>Pintu (Snapshot)</th>
              <th>Controller</th>
              <th>Hasil</th>
              <th>Alasan</th>
              <th>Tipe</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{log.serverTs}</td>
                <td>
                  <code style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{log.kartu}</code>
                </td>
                <td style={{ fontWeight: 600 }}>{log.userNama}</td>
                <td>{log.doorNama}</td>
                <td>{log.controllerName}</td>
                <td>
                  <span className={`badge ${log.result === 'GRANTED' ? 'badge-success' : 'badge-danger'}`}>
                    {log.result}
                  </span>
                </td>
                <td>
                  <code style={{ 
                    fontWeight: 600,
                    color: log.reason === 'OK' ? 'var(--accent-success)' : 'var(--accent-danger)' 
                  }}>
                    {log.reason}
                  </code>
                </td>
                <td>
                  {log.replayed ? (
                    <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                      ⏳ REPLAYED
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Tidak ada audit log yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccessLogs;
