import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaUserShield, FaVideo, FaCircle } from 'react-icons/fa';

const LiveMonitoring = () => {
  const { user } = useAuth();
  const [proctoringData, setProctoringData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProctoringData = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_URL}/companies/${user.companyId}/proctoring`);
      const data = await res.json();
      
      // Group by user to show only the latest status per employee
      const latestData = {};
      data.forEach(log => {
        if (!latestData[log.empId]) {
          latestData[log.empId] = log;
        } else {
          // If this log is newer, replace it
          if (new Date(log.timestamp) > new Date(latestData[log.empId].timestamp)) {
            latestData[log.empId] = log;
          }
        }
      });
      
      setProctoringData(Object.values(latestData));
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch proctoring data", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProctoringData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchProctoringData, 30000);
    return () => clearInterval(interval);
  }, [user.companyId]);

  return (
    <div className="card border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', minHeight: '400px' }}>
      <div className="card-header border-0 bg-transparent py-4 px-4 d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0 fw-bold d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
            <FaUserShield className="me-2 text-primary" /> Live AI Proctoring
          </h5>
          <small className="text-muted">Real-time presence and alertness monitoring for remote staff</small>
        </div>
        <div className="d-flex align-items-center">
          <FaCircle className="text-success me-2" size={10} style={{ animation: 'pulse 2s infinite' }} />
          <small className="fw-bold" style={{ color: 'var(--success)' }}>Live</small>
        </div>
      </div>
      
      <div className="card-body px-0 pt-0 pb-4">
        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <p>Loading monitoring feeds...</p>
          </div>
        ) : proctoringData.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FaVideo className="display-4 opacity-25 mb-3 d-block mx-auto" />
            <p>No remote employees are currently active.</p>
          </div>
        ) : (
          <div className="table-responsive px-4">
            <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-main)' }}>
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="border-0 rounded-start">Employee</th>
                  <th className="border-0">Live Status</th>
                  <th className="border-0">Alertness</th>
                  <th className="border-0">Blinks/min</th>
                  <th className="border-0 rounded-end">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {proctoringData.map(log => {
                  // Determine if they've been gone for > 2 mins
                  const isStale = (new Date() - new Date(log.timestamp)) > 120000;
                  const displayStatus = isStale ? 'Offline' : log.status;
                  const isAway = displayStatus === 'Away' || displayStatus === 'Offline';
                  const isSleeping = displayStatus === 'Sleeping';

                  return (
                    <tr key={log.empId} style={{ borderBottomColor: 'var(--border-color)' }}>
                      <td className="py-3">
                        <div className="fw-bold">{log.name}</div>
                        <small className="text-muted">{log.empId}</small>
                      </td>
                      <td className="py-3">
                        <span className={`badge ${isSleeping ? 'bg-danger' : isAway ? 'bg-warning text-dark' : 'bg-success'} rounded-pill px-3 py-2`} style={isSleeping ? { animation: 'pulse 1s infinite' } : {}}>
                          {isSleeping ? '😴 SLEEPING' : displayStatus}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="d-flex align-items-center">
                          <div className="progress flex-grow-1 me-2" style={{ height: '6px', width: '60px' }}>
                            <div className={`progress-bar ${log.alertnessScore > 80 ? 'bg-success' : log.alertnessScore > 50 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${log.alertnessScore}%` }}></div>
                          </div>
                          <span className="fw-medium small">{log.alertnessScore}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="fw-medium">{log.blinks || 0}</span>
                      </td>
                      <td className="py-3 text-muted small">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default LiveMonitoring;
