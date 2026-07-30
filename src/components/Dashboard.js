import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

function CameraCard({ cam, onDelete }) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting fullscreen:", err);
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="card camera-card"
      style={{
        padding: isFullscreen ? '0' : '1.25rem',
        background: '#0f172a',
        borderRadius: isFullscreen ? '0px' : '10px',
        border: isFullscreen ? 'none' : '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: isFullscreen ? '100vh' : 'auto',
        width: isFullscreen ? '100vw' : 'auto'
      }}
    >
      {/* HEADER CONTROLS BAR */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: isFullscreen ? '0' : '1rem',
          position: isFullscreen ? 'absolute' : 'relative',
          top: isFullscreen ? '15px' : '0',
          left: isFullscreen ? '15px' : '0',
          right: isFullscreen ? '15px' : '0',
          zIndex: 50,
          background: isFullscreen ? 'rgba(15, 23, 42, 0.85)' : 'transparent',
          padding: isFullscreen ? '10px 15px' : '0',
          borderRadius: '8px',
          backdropFilter: isFullscreen ? 'blur(8px)' : 'none'
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>{cam.name}</h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Zone: {cam.locationType}</span>
        </div>

        {/* CONTROL BUTTON GROUP */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

          {/* MINIMIZE / EXPAND BUTTON */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand Stream" : "Minimize Stream"}
            style={{
              background: '#334155',
              color: '#f8fafc',
              border: 'none',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}
          >
            {isMinimized ? '➕ Expand' : '➖ Minimize'}
          </button>

          {/* FULLSCREEN BUTTON */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}
          >
            {isFullscreen ? '🗗 Exit Fullscreen' : '⛶ Fullscreen'}
          </button>

          {/* REMOVE BUTTON (Hidden in Fullscreen mode for clean viewing) */}
          {!isFullscreen && (
            <button
              onClick={() => onDelete(cam.id)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid #ef4444',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              🗑️ Remove
            </button>
          )}
        </div>
      </div>

      {/* VIDEO CONTAINER */}
      {!isMinimized ? (
        <div style={{ width: '100%', height: isFullscreen ? '100%' : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          <img
            src="http://localhost:5001/video_feed"
            alt="Live AI Stream"
            style={{ width: '100%', maxHeight: isFullscreen ? '100vh' : '450px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://via.placeholder.com/640x360?text=Start+detector.py+to+View+AI+Feed";
            }}
          />
        </div>
      ) : (
        <div style={{ padding: '1rem', background: '#020617', textAlign: 'center', borderRadius: '6px', color: '#94a3b8', fontSize: '0.9rem' }}>
          📹 Video Feed Minimized
        </div>
      )}

    </div>
  );
}

export default function Dashboard({ token }) {
  const [cameras, setCameras] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [emailSavedMsg, setEmailSavedMsg] = useState('');

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    fetch('http://localhost:5000/api/cameras', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCameras(Array.isArray(data) ? data : []))
      .catch(() => setCameras([]));

    fetch('http://localhost:5000/api/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUserEmail(data.email || ''))
      .catch(err => console.error(err));

    const socket = io('http://localhost:5000');
    return () => socket.disconnect();
  }, [token]);

  const handleSaveEmail = (e) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email: userEmail })
    }).then(() => {
      setEmailSavedMsg('Alert recipient email updated successfully!');
      setTimeout(() => setEmailSavedMsg(''), 3000);
    });
  };

  const handleDeleteCamera = (id) => {
    fetch(`http://localhost:5000/api/cameras/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(() => {
      setCameras(prev => (Array.isArray(prev) ? prev.filter(c => c.id !== id) : []));
    });
  };

  const safeCameras = Array.isArray(cameras) ? cameras : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ALERT CONFIGURATION */}
      <div className="card" style={{ background: '#1e293b', borderLeft: '4px solid #38bdf8', padding: '1.25rem', borderRadius: '10px' }}>
        <h3 style={{ margin: 0 }}>⚙️ Alert Notification Configuration</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.5rem 0 1rem 0' }}>
          Recipient email for threat detection alerts and incident logs.
        </p>

        {emailSavedMsg && <div className="message-banner success">{emailSavedMsg}</div>}

        <form onSubmit={handleSaveEmail} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <input
              type="email"
              placeholder="admin@surveillance.com"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 0, padding: '0.65rem 1.5rem', background: '#38bdf8', color: '#0f172a', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Save Settings
          </button>
        </form>
      </div>

      {/* STREAM FEEDS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Live Stream Feeds ({safeCameras.length})</h2>
          <span style={{ color: '#34d399', fontWeight: '600' }}>● AI Computer Vision Engine Active</span>
        </div>

        {safeCameras.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', background: '#0f172a', borderRadius: '10px' }}>
            <p style={{ color: '#94a3b8' }}>No active camera streams configured.</p>
          </div>
        ) : (
          <div className="camera-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {safeCameras.map((cam) => (
              <CameraCard key={cam.id} cam={cam} onDelete={handleDeleteCamera} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}