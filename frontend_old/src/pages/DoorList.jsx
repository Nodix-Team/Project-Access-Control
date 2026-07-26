import React, { useState } from 'react';

const INITIAL_DOORS = [
  { id: 1, doorNumber: 1, nama: 'Lobby Utama', lokasi: 'Pintu Masuk Depan Gedung A', controllerName: 'Controller Gedung A (ctrl-A)' },
  { id: 2, doorNumber: 2, nama: 'Ruang Server', lokasi: 'Gedung A Lantai 1', controllerName: 'Controller Gedung A (ctrl-A)' },
  { id: 3, doorNumber: 3, nama: 'Ruang Meeting', lokasi: 'Gedung A Lantai 2', controllerName: 'Controller Gedung A (ctrl-A)' },
  { id: 4, doorNumber: 4, nama: 'Ruang Arsip', lokasi: 'Gedung A Lantai 2', controllerName: 'Controller Gedung A (ctrl-A)' },
  { id: 5, doorNumber: 1, nama: 'Lobby B', lokasi: 'Pintu Masuk Utama Gedung B', controllerName: 'Controller Gedung B (ctrl-B)' },
  { id: 6, doorNumber: 2, nama: 'Lab Komputer', lokasi: 'Gedung B Lantai 1', controllerName: 'Controller Gedung B (ctrl-B)' },
  { id: 7, doorNumber: 1, nama: 'Gudang Utama', lokasi: 'Loading Dock Area Belakang', controllerName: 'Controller Loading Dock (ctrl-C)' },
  { id: 8, doorNumber: 2, nama: 'Loading Gate', lokasi: 'Pagar Utama Belakang', controllerName: 'Controller Loading Dock (ctrl-C)' }
];

const DoorList = () => {
  const [doors, setDoors] = useState(INITIAL_DOORS);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [newNama, setNewNama] = useState('');
  const [newLokasi, setNewLokasi] = useState('');
  const [newDoorNum, setNewDoorNum] = useState(1);
  const [newCtrl, setNewCtrl] = useState('Controller Gedung A (ctrl-A)');

  const handleAddDoor = (e) => {
    e.preventDefault();
    if (!newNama) return;

    const newDoorObj = {
      id: doors.length + 1,
      doorNumber: parseInt(newDoorNum),
      nama: newNama,
      lokasi: newLokasi,
      controllerName: newCtrl
    };

    setDoors(prev => [...prev, newDoorObj]);
    setShowAddModal(false);
    setNewNama('');
    setNewLokasi('');
    setNewDoorNum(1);
  };

  const handleDeleteDoor = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pintu ini?')) {
      setDoors(prev => prev.filter(d => d.id !== id));
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>🚪 Manajemen Pintu Fisik</h3>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <span>➕</span> Tambah Pintu
        </button>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
        <strong>📝 CATATAN PENTING:</strong> Sesuai dengan aturan kritis arsitektur v0.2, ID Pintu database (Door ID) tidak pernah dikirim ke Controller. Controller hanya mengenali nomor pintu lokal (1 sampai N). Backend akan menerjemahkan asosiasi ini secara otomatis.
      </p>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID Database</th>
              <th>Nama Pintu</th>
              <th>Nomor Pintu Lokal (ESP32)</th>
              <th>Lokasi</th>
              <th>Controller Induk</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {doors.map(door => (
              <tr key={door.id}>
                <td>
                  <span style={{ 
                    padding: '2px 6px', 
                    backgroundColor: 'rgba(255,255,255,0.05)', 
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace'
                  }}>
                    {door.id}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{door.nama}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1rem' }}>
                  {door.doorNumber}
                </td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{door.lokasi}</td>
                <td>{door.controllerName}</td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-danger)' }}
                    onClick={() => handleDeleteDoor(door.id)}
                  >
                    🗑️ Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Door Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px', marginBottom: 0 }}>
            <h3 className="card-title">🚪 Tambah Pintu Fisik Baru</h3>
            <form onSubmit={handleAddDoor}>
              <div className="form-group">
                <label className="form-label">Nama Pintu</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newNama} 
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Ruang Server Utama"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nomor Pintu Lokal (di ESP32)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={newDoorNum} 
                  onChange={(e) => setNewDoorNum(e.target.value)}
                  max="4"
                  min="1"
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  *Nomor fisik relay/reader 1 sampai 4 yang tersambung di Controller.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Lokasi Detail</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newLokasi} 
                  onChange={(e) => setNewLokasi(e.target.value)}
                  placeholder="Contoh: Gedung A Lantai 1 sebelah pantry"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Controller Induk</label>
                <select 
                  className="form-input" 
                  value={newCtrl} 
                  onChange={(e) => setNewCtrl(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="Controller Gedung A (ctrl-A)">Controller Gedung A (ctrl-A)</option>
                  <option value="Controller Gedung B (ctrl-B)">Controller Gedung B (ctrl-B)</option>
                  <option value="Controller Loading Dock (ctrl-C)">Controller Loading Dock (ctrl-C)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Pintu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoorList;
