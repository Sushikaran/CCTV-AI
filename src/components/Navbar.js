import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ username, setToken }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">📹 AI SURVEILLANCE PLATFORM</div>
      <div className="nav-links">
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
        <Link to="/add-camera" className={location.pathname === '/add-camera' ? 'active' : ''}>Add Camera</Link>
        <Link to="/evidence" className={location.pathname === '/evidence' ? 'active' : ''}>Evidence History</Link>
        <span style={{ color: '#38bdf8' }}>👤 {username || 'Operator'}</span>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
}