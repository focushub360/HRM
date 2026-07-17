import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

const MyActivityLogs = () => {
    const { activityLog, user } = useAuth();

    // Filter logs for the current user
    const userLogs = useMemo(() => {
        if (!activityLog) return [];
        return activityLog.filter(log => log.userId === user?.empId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [activityLog, user]);

    return (
        <div className="card border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '15px' }}>
            <div className="card-header bg-transparent border-bottom pt-4 px-4" style={{ borderColor: 'var(--border-color)' }}>
                <h5 className="card-title fw-bold mb-0" style={{ color: 'var(--text-main)' }}>My Activity Tracker</h5>
                <p className="text-muted small">Monitor your mouse tracking, location updates, and inactivity alerts.</p>
            </div>
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-hover mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-4">Timestamp</th>
                                <th>Action Type</th>
                                <th>Details</th>
                                <th>Location</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userLogs.length > 0 ? (
                                userLogs.map((log) => (
                                    <tr key={log.id} style={{ borderBottomColor: 'var(--border-color)' }}>
                                        <td className="ps-4" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td>
                                            {log.action === "LOGIN" && <span className="badge bg-primary">Login</span>}
                                            {log.action === "LOGOUT" && <span className="badge bg-secondary">Logout</span>}
                                            {log.action === "CHECK_IN" && <span className="badge bg-success">Check In</span>}
                                            {log.action === "CHECK_OUT" && <span className="badge bg-danger">Check Out</span>}
                                            {log.action === "INACTIVITY_ALERT" && <span className="badge bg-warning text-dark">Inactivity</span>}
                                            {log.action === "MOUSE_ACTIVE" && <span className="badge bg-info text-dark">Active</span>}
                                        </td>
                                        <td style={{ color: 'var(--text-main)' }}>{log.details}</td>
                                        <td>
                                            {log.latitude && log.longitude ? (
                                                <a
                                                    href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-sm btn-outline-primary"
                                                >
                                                    <i className="bi bi-geo-alt-fill me-1"></i> View Map
                                                </a>
                                            ) : (
                                                <span className="text-muted small">N/A</span>
                                            )}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>
                                            {log.action === "INACTIVITY_ALERT" ? "⚠️ Flagged" : "✅ Logged"}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        No activity logs found for your account.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyActivityLogs;
