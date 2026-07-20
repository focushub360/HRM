import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import ApplicationUsageChart from './employee/ApplicationUsageChart';

const DesktopTracker = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState('Initializing...');
    const [lastActivity, setLastActivity] = useState(null);
    const [socket, setSocket] = useState(null);
    const [sessionStats, setSessionStats] = useState({});

    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hrms-backend-22uq.onrender.com'));
        setSocket(newSocket);

        if (user) {
            newSocket.emit('join-room', user._id);
        }

        return () => newSocket.close();
    }, [user]);

    useEffect(() => {
        if (!socket || !user) return;

        const trackActivity = async () => {
            try {
                // strict check for attendance
                if (localStorage.getItem('isActiveCheckIn') !== 'true') {
                    setStatus('Waiting for Check-In...');
                    setLastActivity(null);
                    return;
                }

                let activeWindow = null;
                let idleTime = 0;

                if (window.electronAPI) {
                    try {
                        activeWindow = await window.electronAPI.getActiveWindow();
                        idleTime = await window.electronAPI.getSystemIdleTime();
                        setStatus('Tracking Active');
                    } catch (err) {
                        console.error("Electron API Error:", err);
                        setStatus('Tracking Error (Electron API)');
                    }
                } else {
                    setStatus('Not running in Electron - OS tracking disabled');
                }

                const data = {
                    userId: user._id,
                    userName: user.name,
                    companyId: user.companyId,
                    activeWindow,
                    idleTime,
                    timestamp: new Date().toISOString()
                };

                setLastActivity(data);

                // Aggregate Stats locally for this session
                if (activeWindow && activeWindow.owner) {
                    const appName = activeWindow.owner.name || 'Unknown';
                    setSessionStats(prev => {
                        const newStats = { ...prev };
                        newStats[appName] = (newStats[appName] || 0) + 5; // Add 5 seconds
                        return newStats;
                    });
                }

                socket.emit('tracking-data', data);

            } catch (error) {
                console.error("Tracking error:", error);
                setStatus('Tracking Error');
            }
        };

        trackActivity();
        const interval = setInterval(trackActivity, 5000);

        return () => clearInterval(interval);
    }, [socket, user]);

    // UI Helpers
    const isActive = status.includes('Active');
    const isWaiting = status.includes('Waiting');
    const isIdle = lastActivity?.idleTime > 60;

    // Web Browser Enforcer - Block Access if not in Electron
    if (!window.electronAPI) {
        return (
            <div className="container mt-5">
                <div className="card glass-card border-0 text-center p-5 shadow-lg">
                    <div className="mb-4">
                        <i className="bi bi-display text-primary" style={{ fontSize: '5rem' }}></i>
                    </div>
                    <h2 className="fw-bold text-dark mb-3">Desktop Application Required</h2>
                    <p className="text-muted fs-5 mb-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        Activity Tracking and History features are <strong>exclusive to the Desktop Application</strong>.
                        To ensure accurate time and activity logging, please log in using the installed Desktop Client.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <button className="btn btn-secondary disabled" disabled>
                            <i className="bi bi-browser-chrome me-2"></i>
                            Web Version (Restricted)
                        </button>
                    </div>
                    <div className="mt-4 text-muted small">
                        Please close this tab and launch HRMS Desktop App.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-5 tracker-container">
            <div className="card card-glossy border-0" style={{ overflow: 'hidden' }}>
                <div className="text-center py-4 gradient-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <h2 className="mb-0 fw-bold text-white"><i className="bi bi-display me-2"></i>My Activity Tracker</h2>
                    <p className="mb-0 text-white-50 small mt-1">Real-time Activity Monitoring</p>
                </div>

                <div className="card-body p-4 p-md-5">

                    {/* Status Badge */}
                    <div className="text-center mb-4">
                        <span className={`badge rounded-pill px-4 py-2 fs-6 shadow-sm ${isActive ? 'bg-success text-white status-indicator-pulse' : isWaiting ? 'bg-secondary text-white' : 'bg-warning text-dark'}`}>
                            {isActive ? <i className="bi bi-check-circle-fill me-2"></i> : isWaiting ? <i className="bi bi-pause-circle-fill me-2"></i> : <i className="bi bi-exclamation-triangle-fill me-2"></i>}
                            {status}
                        </span>
                    </div>

                    {/* Waiting Message */}
                    {isWaiting && (
                        <div className="text-center py-5">
                            <i className="bi bi-clock-history text-muted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                            <h4 className="mt-3 text-muted">Tracking Paused</h4>
                            <p className="text-muted small">Please <strong>Check In</strong> via "My Attendance" to start activity tracking.</p>
                            <a href="/my-attendance" className="btn btn-glossy btn-sm mt-3 px-4 rounded-pill">Go to Attendance</a>
                        </div>
                    )}

                    {lastActivity && !isWaiting && (
                        <div className="row g-4 justify-content-center">
                            {/* Current App Card */}
                            <div className="col-md-6 col-lg-5">
                                <div className="p-4 rounded-4 h-100 text-center glass-card" style={{ background: 'white' }}>
                                    <div className="mb-3">
                                        <i className="bi bi-window-stack text-primary" style={{ fontSize: '2.5rem' }}></i>
                                    </div>
                                    <h6 className="text-muted text-uppercase fw-bold small ls-1">Current Application</h6>
                                    <h3 className="fw-bold text-dark mt-2 mb-0">
                                        {lastActivity.activeWindow?.owner?.name || 'Unknown'}
                                    </h3>
                                </div>
                            </div>

                            {/* System Status Card */}
                            <div className="col-md-6 col-lg-5">
                                <div className={`p-4 rounded-4 h-100 text-center text-white glass-card`} style={{
                                    background: isIdle ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                                }}>
                                    <div className="mb-3">
                                        <i className={`bi ${isIdle ? 'bi-moon-stars-fill' : 'bi-lightning-charge-fill'}`} style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}></i>
                                    </div>
                                    <h6 className="text-white-50 text-uppercase fw-bold small ls-1">System Status</h6>
                                    <h3 className="fw-bold mt-2 mb-0 text-white">
                                        {isIdle ? 'Idle' : 'Active'}
                                    </h3>
                                    <p className="mb-0 mt-2 small opacity-90">
                                        {isIdle ? `Inactive for ${lastActivity.idleTime}s` : 'User is active'}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Window Title */}
                            <div className="col-lg-10">
                                <div className="p-4 rounded-4 text-center mt-2 glass-card" style={{ background: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' }}>
                                    <h6 className="text-muted text-uppercase fw-bold small ls-1 mb-3">Window / Browser Tab Details</h6>
                                    <p className="fs-5 text-dark fw-medium mb-0 text-break" style={{ fontFamily: 'monospace', color: '#333' }}>
                                        {lastActivity.activeWindow?.title || 'No active window detected'}
                                    </p>
                                </div>
                            </div>

                            {/* Session Pie Chart */}
                            <div className="col-lg-10">
                                <div className="p-4 rounded-4 h-100 glass-card" style={{ background: 'white' }}>
                                    <ApplicationUsageChart data={sessionStats} />
                                </div>
                            </div>

                            <div className="col-12 text-center mt-4">
                                <small className="text-muted">
                                    <i className="bi bi-clock-history me-1"></i>
                                    Last synced: {new Date(lastActivity.timestamp).toLocaleTimeString()}
                                </small>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DesktopTracker;
