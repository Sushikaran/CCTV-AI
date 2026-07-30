import React, { useState } from 'react';

export default function Login({ setToken, setUsername: setGlobalUsername }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const endpoint = isRegister ? '/api/register' : '/api/login';
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        if (isRegister) {
          setMessage({ type: 'success', text: data.message });
          setIsRegister(false);
        } else {
          setGlobalUsername(data.username);
          setToken(data.token);
        }
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Backend server unavailable. Start server.js first.' });
    }
  };

  return (
    <div className="login-container card">
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#38bdf8' }}>
        {isRegister ? 'Create Account' : 'AI Surveillance Login'}
      </h2>
      {message && <div className={`message-banner ${message.type}`}>{message.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary">{isRegister ? 'Register' : 'Login'}</button>
      </form>
      <button className="toggle-btn" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Already registered? Login' : "Don't have an account? Register"}
      </button>
    </div>
  );
}