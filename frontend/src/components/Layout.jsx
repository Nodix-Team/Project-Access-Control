import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './ThemeContext';

const Layout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    navigate('/login');
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard & Live Monitor';
      case '/users':
        return 'User Management';
      case '/departments':
        return 'Department Management';
      case '/controllers':
        return 'Controller Management';
      case '/doors':
        return 'Door Management';
      case '/logs':
        return 'Access Audit Logs';
      default:
        if (location.pathname.startsWith('/users/')) return 'User Details';
        return 'Access Control System';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigasi */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🛡️</div>
          <div className="logo-text">ACS Control</div>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>👤</span> Users
          </NavLink>
          <NavLink to="/departments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>🏢</span> Departments
          </NavLink>
          <NavLink to="/controllers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>🔌</span> Controllers
          </NavLink>
          <NavLink to="/doors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>🚪</span> Doors
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span>📜</span> Access Logs
          </NavLink>
        </nav>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Konten Utama */}
      <main className="main-content">
        <header className="header">
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>{getPageTitle()}</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Toggle Theme Button */}
            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Admin Profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}>
                AD
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Danas Wara</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-body">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
