import React, { useState, useEffect } from 'react';

export default function EvidenceHistory({ token }) {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const fetchLogs = () => {
    fetch('http://localhost:5000/api/evidence', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      })
      .catch(err => {
        console.error("Failed to load evidence logs:", err);
        setLogs([]);
      });
  };

  // Safe Filtering Logic (Guards against undefined properties)
  const safeSearch = (searchTerm || '').toLowerCase();

  const filteredLogs = (Array.isArray(logs) ? logs : []).filter(log => {
    const cameraName = (log.cameraName || '').toLowerCase();
    const locationType = (log.locationType || '').toLowerCase();
    const alertType = (log.alertType || '').toLowerCase();

    const matchesSearch = cameraName.includes(safeSearch) ||
      locationType.includes(safeSearch) ||
      alertType.includes(safeSearch);

    if (filterType === 'ALL') return matchesSearch;
    if (filterType === 'WEAPON') return matchesSearch && alertType.includes('weapon');
    if (filterType === 'FIRE') return matchesSearch && alertType.includes('fire');
    if (filterType === 'HELMET') return matchesSearch && alertType.includes('helmet');

    return matchesSearch;
  });

  return (
    <div className="card" style={{ background: '#0f172a', padding: '1.5rem', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>🛡️ Evidence Log History</h2>
        <button onClick={fetchLogs} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          🔄 Refresh Logs
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by camera, location, or threat type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '250px', padding: '0.6rem', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
        />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#fff' }}
        >
          <option value="ALL">All Incidents</option>
          <option value="WEAPON">Weapons</option>
          <option value="FIRE">Fire Hazards</option>
          <option value="HELMET">Helmets</option>
        </select>
      </div>

      {/* EVIDENCE TABLE */}
      {filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          No recorded evidence matching your criteria.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem' }}>Camera Source</th>
                <th style={{ padding: '0.75rem' }}>Location</th>
                <th style={{ padding: '0.75rem' }}>Threat Detected</th>
                <th style={{ padding: '0.75rem' }}>Severity</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const alertStr = log.alertType || 'UNKNOWN_ALERT';
                const isCritical = alertStr.includes('WEAPON') || alertStr.includes('FIRE');

                return (
                  <tr key={log.id || Math.random()} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>#{log.id}</td>
                    <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#f8fafc', fontWeight: '500' }}>
                      {log.cameraName || 'Webcam'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#94a3b8' }}>
                      {log.locationType || 'General Zone'}
                    </td>
                    <td style={{ padding: '0.75rem', color: isCritical ? '#f87171' : '#facc15', fontWeight: 'bold' }}>
                      {alertStr}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        background: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: isCritical ? '#f87171' : '#facc15',
                        border: `1px solid ${isCritical ? '#ef4444' : '#eab308'}`
                      }}>
                        {isCritical ? 'CRITICAL' : 'WARNING'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}