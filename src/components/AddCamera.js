import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AddCamera({ token }) {
  const [name, setName] = useState('Laptop Integrated Camera');
  const [locationType, setLocationType] = useState('home');
  const [rtspUrl, setRtspUrl] = useState('0');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);

    // Retrieve token from props or localStorage fallback
    const activeToken = token || localStorage.getItem('token');

    if (!activeToken) {
      setError('Session expired. Please log out and log in again.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ name, locationType, rtspUrl })
      });

      if (res.ok) {
        navigate('/dashboard');
      } else if (res.status === 401 || res.status === 403) {
        setError('Authentication failed. Please log out and log in back.');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to add camera stream.');
      }
    } catch (err) {
      setError('Backend communication error. Make sure server.js is running.');
    }
  };

  return (
    <div style={{ maxWidth: '550px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', color: '#38bdf8' }}>Connect New Camera Stream</h2>

        {error && <div className="message-banner error" style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleAdd}>
          <div className="form-group">
            <label>Camera Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Location Type</label>
            <select value={locationType} onChange={e => setLocationType(e.target.value)}>
              <option value="home">Home</option>
              <option value="road">Road</option>
              <option value="college">College</option>
              <option value="mall">Mall</option>
              <option value="railway station">Railway Station</option>
              <option value="others">Others</option>
            </select>
          </div>

          <div className="form-group">
            <label>RTSP Stream Address / Webcam Index</label>
            <input
              type="text"
              placeholder="Enter 0 for laptop webcam, or rtsp://..."
              value={rtspUrl}
              onChange={e => setRtspUrl(e.target.value)}
              required
            />
            <small style={{ color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
              💡 Enter <strong>0</strong> to connect directly to your Laptop's built-in webcam.
            </small>
          </div>

          <button type="submit" className="btn-primary">Connect Stream</button>
        </form>
      </div>
    </div>
  );
}