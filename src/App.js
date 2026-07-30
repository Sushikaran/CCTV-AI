import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AddCamera from './components/AddCamera';
import EvidenceHistory from './components/EvidenceHistory';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      if (username) localStorage.setItem('username', username);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
    }
  }, [token, username]);

  return (
    <BrowserRouter>
      {token && <Navbar username={username} setToken={setToken} />}
      <div className="main-layout">
        <Routes>
          <Route path="/login" element={!token ? <Login setToken={setToken} setUsername={setUsername} /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={token ? <Dashboard token={token} /> : <Navigate to="/login" />} />
          <Route path="/add-camera" element={token ? <AddCamera token={token} /> : <Navigate to="/login" />} />
          <Route path="/evidence" element={token ? <EvidenceHistory token={token} /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;