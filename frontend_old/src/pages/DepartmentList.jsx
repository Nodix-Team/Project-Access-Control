import React, { useState } from 'react';

const INITIAL_DEPARTMENTS = [
  { id: 1, nama: 'IT', deskripsi: 'Divisi Teknologi Informasi', defaultDoors: [1, 2, 6] },
  { id: 2, nama: 'HRD', deskripsi: 'Human Resource Development', defaultDoors: [1, 5] },
  { id: 3, nama: 'Finance', deskripsi: 'Pengelola Keuangan & Akuntansi', defaultDoors: [1] },
  { id: 4, nama: 'Security', deskripsi: 'Tim Keamanan Utama', defaultDoors: [1, 2, 3, 4, 5, 6, 7, 8] }
];

const ALL_DOORS = [
  { id: 1, name: 'Lobby Utama (ctrl-A:1)' },
  { id: 2, name: 'Ruang Server (ctrl-A:2)' },
  { id: 3, name: 'Ruang Meeting (ctrl-A:3)' },
  { id: 4, name: 'Ruang Arsip (ctrl-A:4)' },
  { id: 5, name: 'Lobby B (ctrl-B:1)' },
  { id: 6, name: 'Lab Komputer (ctrl-B:2)' },
  { id: 7, name: 'Gudang Utama (ctrl-C:1)' },
  { id: 8, name: 'Loading Gate (ctrl-C:2)' }
];

const DepartmentList = () => {
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(INITIAL_DEPARTMENTS[0]);
  
  // Form State
  const [newNama, setNewNama] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAddDept = (e) => {
    e.preventDefault();
    if (!newNama) return;

    const newDeptObj = {
      id: departments.length + 1,
      nama: newNama,
      deskripsi: newDesc,
      defaultDoors: [1] // Default door Lobby Utama
    };

    setDepartments(prev => [...prev, newDeptObj]);
    setSelectedDept(newDeptObj);
    setShowAddModal(false);
    setNewNama('');
    setNewDesc('');
  };

  const handleDoorToggle = (doorId) => {
    const updatedDoors = selectedDept.defaultDoors.includes(doorId)
      ? selectedDept.defaultDoors.filter(id => id !== doorId)
      : [...selectedDept.defaultDoors, doorId];

    const updatedDept = { ...selectedDept, defaultDoors: updatedDoors };
    
    // Update local state
    setSelectedDept(updatedDept);
    setDepartments(prev => prev.map(d => d.id === selectedDept.id ? updatedDept : d));
  };

  const handleSyncDept = () => {
    alert(`Otorisasi massal sukses! Mengirim perintah sync MQTT ke semua controller untuk seluruh user di departemen ${selectedDept.nama}.`);
  };

  return (
    <div className="grid-cols-2">
      {/* List Departemen */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>🏢 Departemen</h3>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <span>➕</span> Tambah
          </button>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Departemen</th>
                <th>Deskripsi</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr 
                  key={dept.id} 
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: selectedDept.id === dept.id ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    borderLeft: selectedDept.id === dept.id ? '4px solid var(--accent-primary)' : 'none'
                  }}
                  onClick={() => setSelectedDept(dept)}
                >
                  <td style={{ fontWeight: 600 }}>{dept.nama}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{dept.deskripsi}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDept(dept);
                      }}
                    >
                      ⚙️ Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Default Access & Sync */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>🔑 Akses Default: {selectedDept.nama}</h3>
          <button className="btn btn-secondary" style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} onClick={handleSyncDept}>
            🔄 Sync Masal
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
          Setiap user yang didaftarkan ke departemen <strong>{selectedDept.nama}</strong> secara otomatis akan mendapatkan hak akses ke pintu-pintu yang dicentang di bawah ini (kecuali jika disetel ke mode Custom Access).
        </p>

        {/* Akses Pintu Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ALL_DOORS.map(door => {
            const active = selectedDept.defaultDoors.includes(door.id);
            return (
              <div 
                key={door.id} 
                className={`door-item ${active ? 'active' : ''}`}
                onClick={() => handleDoorToggle(door.id)}
                style={{ padding: '10px 14px' }}
              >
                <span>{active ? '✅' : '⬜'}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{door.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Dept Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px', marginBottom: 0 }}>
            <h3 className="card-title">🏢 Tambah Departemen Baru</h3>
            <form onSubmit={handleAddDept}>
              <div className="form-group">
                <label className="form-label">Nama Departemen</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newNama} 
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: HRD, IT, R&D"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi Singkat</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Deskripsi tugas divisi..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Departemen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentList;
