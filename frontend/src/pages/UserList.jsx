import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const INITIAL_USERS = [
  { uid: 1, kartu: 'AABBCCDD', nama: 'John Doe', department: 'IT', isCustomAccess: false },
  { uid: 2, kartu: '99228811', nama: 'Jane Smith', department: 'IT', isCustomAccess: true },
  { uid: 3, kartu: '11223344', nama: 'Bob Wilson', department: 'HRD', isCustomAccess: false },
  { uid: 4, kartu: '55667788', nama: 'Alice Brown', department: 'Finance', isCustomAccess: false },
  { uid: 5, kartu: 'DEADBEEF', nama: 'David Miller', department: 'Security', isCustomAccess: true },
  { uid: 6, kartu: '88776655', nama: 'Sarah Conner', department: 'HRD', isCustomAccess: false }
];

const UserList = () => {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  
  // Add user Form State
  const [newNama, setNewNama] = useState('');
  const [newKartu, setNewKartu] = useState('');
  const [newDept, setNewDept] = useState('None');

  // CSV State
  const [csvResult, setCsvResult] = useState(null);

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newNama || !newKartu) return;

    // Normalisasi kartu (pad dengan 0 sampai 10 digit jika angka)
    let processedKartu = newKartu.trim();
    const isNumeric = /^\d+$/.test(processedKartu);
    if (isNumeric && processedKartu.length < 10) {
      processedKartu = processedKartu.padStart(10, '0');
    }

    const newUserObj = {
      uid: users.length + 1,
      kartu: processedKartu,
      nama: newNama,
      department: newDept,
      isCustomAccess: false
    };

    setUsers(prev => [newUserObj, ...prev]);
    setShowAddModal(false);
    setNewNama('');
    setNewKartu('');
    setNewDept('None');
  };

  const handleDeleteUser = (uid) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      setUsers(prev => prev.filter(u => u.uid !== uid));
    }
  };

  const handleCsvUpload = (e) => {
    // Simulasi parsing CSV sesuai aturan validasi proposal v0.2
    setCsvResult({
      total: 4,
      success: 3,
      failed: 1,
      errors: [
        { row: 3, card: '12345', error: 'Kartu duplikat di baris lain' }
      ]
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.kartu.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || user.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 className="card-title" style={{ margin: 0 }}>👤 Karyawan / Pemegang Kartu</h3>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setShowCsvModal(true)}>
            <span>📤</span> Upload CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <span>➕</span> Tambah User
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Cari berdasarkan nama atau UID kartu..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ width: '200px' }}>
          <select 
            className="form-input"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ appearance: 'auto' }}
          >
            <option value="All">Semua Departemen</option>
            <option value="None">Tanpa Departemen (None)</option>
            <option value="IT">IT</option>
            <option value="HRD">HRD</option>
            <option value="Finance">Finance</option>
            <option value="Security">Security</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Pemilik</th>
              <th>UID Kartu (RFID)</th>
              <th>Departemen</th>
              <th>Tipe Akses</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, idx) => (
              <tr key={user.uid}>
                <td>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{user.nama}</td>
                <td>
                  <code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{user.kartu}</code>
                </td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    backgroundColor: user.department === 'None' ? 'var(--accent-danger-bg)' : 'rgba(255,255,255,0.05)', 
                    color: user.department === 'None' ? 'var(--accent-danger)' : 'inherit',
                    fontWeight: user.department === 'None' ? 600 : 'normal',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}>
                    {user.department === 'None' ? 'Tanpa Departemen' : user.department}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.isCustomAccess ? 'badge-warning' : 'badge-success'}`}>
                    {user.isCustomAccess ? 'Custom Access' : 'Default Dept'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Link to={`/users/${user.uid}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      👁️ Detail
                    </Link>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-danger)' }}
                      onClick={() => handleDeleteUser(user.uid)}
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Tidak ada user ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '450px', marginBottom: 0 }}>
            <h3 className="card-title">➕ Tambah Karyawan Baru</h3>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newNama} 
                  onChange={(e) => setNewNama(e.target.value)}
                  placeholder="Contoh: Sarah Connor"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">UID Kartu RFID</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newKartu} 
                  onChange={(e) => setNewKartu(e.target.value)}
                  placeholder="Contoh: AABBCCDD atau 123456"
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  *Jika angka numerik murni &lt; 10 digit, otomatis akan ditambahkan padding 0 di depan.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Departemen</label>
                <select 
                  className="form-input" 
                  value={newDept} 
                  onChange={(e) => setNewDept(e.target.value)}
                  style={{ appearance: 'auto' }}
                >
                  <option value="None">Tanpa Departemen (None)</option>
                  <option value="IT">IT</option>
                  <option value="HRD">HRD</option>
                  <option value="Finance">Finance</option>
                  <option value="Security">Security</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '500px', marginBottom: 0 }}>
            <h3 className="card-title">📤 Bulk Import via CSV</h3>
            
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              border: '1px dashed var(--border-color)',
              borderRadius: '4px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '20px'
            }} onClick={handleCsvUpload}>
              <span style={{ fontSize: '2.5rem' }}>📄</span>
              <p style={{ fontWeight: 600, marginTop: '12px' }}>Pilih file CSV dari komputer Anda</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Format header wajib: <code style={{ color: 'var(--accent-primary)' }}>kartu,nama,department,doors</code>
              </p>
            </div>

            {csvResult && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Hasil Simulasi Validasi:</h4>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <span className="badge badge-success">Sukses: {csvResult.success} baris</span>
                  <span className="badge badge-danger">Gagal: {csvResult.failed} baris</span>
                </div>
                {csvResult.errors.map((err, i) => (
                  <div key={i} style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--accent-danger)', 
                    backgroundColor: 'var(--accent-danger-bg)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.1)'
                  }}>
                    Baris {err.row} (Kartu: {err.card}): {err.error}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowCsvModal(false); setCsvResult(null); }}>
                Tutup
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!csvResult}
                onClick={() => {
                  // Simulate applying
                  alert('Bulk Import sukses diterapkan!');
                  setShowCsvModal(false);
                  setCsvResult(null);
                }}
              >
                Terapkan Hasil Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
