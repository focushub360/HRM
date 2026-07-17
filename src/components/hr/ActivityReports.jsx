import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

const ActivityReports = () => {
  const { user, activityLog: contextLogs, inactivityAlerts, deleteActivity, companies, getCompanyActivities, refreshActivityLogs } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState('');
  // Helper to get local date string YYYY-MM-DD from timestamp
  const getLocalDateString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  const [activityLogs, setActivityLogs] = useState([]);
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all'); // Filter by specific employee name/ID
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActivityLogs();
    setIsRefreshing(false);
  };

  // Initialize logs from context
  useEffect(() => {
    // If HR or Company Admin, force selection to their company
    if (user?.type === 'hr' || user?.type === 'company') {
      setSelectedCompany(user.companyId);
      getCompanyActivities(user.companyId).then(logs => setActivityLogs(logs || []));
    }
    // If Super Admin (no companyId), load all or default
    else if (!user?.companyId) {
      setActivityLogs(contextLogs || []);
    }
  }, [contextLogs, user]);

  const handleCompanyChange = async (e) => {
    // Prevent HR from changing company if filtered
    if ((user?.type === 'hr' || user?.type === 'company') && parseInt(e.target.value) !== user.companyId) {
      return;
    }
    const companyId = e.target.value;
    setSelectedCompany(companyId);
    if (companyId) {
      const logs = await getCompanyActivities(companyId);
      setActivityLogs(logs || []);
    } else {
      setActivityLogs(contextLogs || []);
    }
  };

  // Extract unique employees for the filter dropdown
  const uniqueEmployees = useMemo(() => {
    const emps = new Map();
    activityLogs.forEach(log => {
      if (!emps.has(log.userId)) {
        emps.set(log.userId, log.userName);
      }
    });
    return Array.from(emps.entries());
  }, [activityLogs]);

  // Filter logs logic
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      // Date Filter - Use Local Date
      const logDate = getLocalDateString(log.timestamp);
      const dateMatch = !selectedDate || logDate === selectedDate;

      // Employee Type Filter
      const typeMatch = employeeTypeFilter === 'all' || (log.employeeType === employeeTypeFilter);

      // Specific Employee Filter
      const empMatch = employeeFilter === 'all' || (log.userId === employeeFilter);

      return dateMatch && typeMatch && empMatch;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [activityLogs, selectedDate, employeeTypeFilter, employeeFilter]);

  // Calculate total active time per employee
  const calculateEmployeeStats = () => {
    const employees = {};

    filteredLogs.forEach((log) => {
      if (!employees[log.userId]) {
        employees[log.userId] = {
          userId: log.userId,
          userName: log.userName,
          employeeType: log.employeeType,
          loginCount: 0,
          lastLogin: null,
          inactivityCount: 0,
        };
      }
      if (log.action === "LOGIN") {
        employees[log.userId].loginCount++;
        employees[log.userId].lastLogin = log.timestamp;
      }
    });

    const relevantAlerts = inactivityAlerts.filter(alert => {
      const alertDate = getLocalDateString(alert.timestamp);
      return (!selectedDate || alertDate === selectedDate);
    });

    relevantAlerts.forEach((alert) => {
      if (employees[alert.userId]) {
        employees[alert.userId].inactivityCount++;
      }
    });

    return Object.values(employees);
  };

  const employeeStats = calculateEmployeeStats();

  // Filter Inactivity Alerts by Date
  const filteredInactivityAlerts = useMemo(() => {
    return inactivityAlerts.filter(alert => {
      const alertDate = getLocalDateString(alert.timestamp);
      return !selectedDate || alertDate === selectedDate;
    });
  }, [inactivityAlerts, selectedDate]);

  const handleDeleteActivity = async (id) => {
    if (window.confirm("Are you sure you want to delete this activity log?")) {
      await deleteActivity(id);
    }
  };

  const isSuperAdmin = !user?.companyId;

  const [currentView, setCurrentView] = useState('dashboard');

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const renderDashboard = () => (
    <div className="row g-4">
      {/* Employee Logins Card */}
      <div className="col-md-4">
        <div
          className="card shadow-sm border-start border-primary h-100 cursor-pointer hover-scale transition-all"
          onClick={() => handleViewChange('logins')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s', borderLeftWidth: '5px' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div className="card-body p-4 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="text-uppercase fw-bold text-muted small mb-1">Employee Logins</h5>
                <h2 className="fw-bold mb-0 text-primary">
                  {filteredLogs.filter(l => (l.action === 'LOGIN' || l.action === 'LOGOUT') && l.userId?.startsWith('EMP-')).length}
                </h2>
              </div>
              <div className="p-3 rounded-circle" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
                <i className="bi bi-person-check-fill fs-3 text-primary"></i>
              </div>
            </div>
            <p className="text-muted small mb-0">
              <i className="bi bi-clock-history me-1"></i> View Login & Logout History
            </p>
          </div>
        </div>
      </div>

      {/* System Events Card */}
      <div className="col-md-4">
        <div
          className="card shadow-sm border-start border-success h-100 cursor-pointer transition-all"
          onClick={() => handleViewChange('events')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s', borderLeftWidth: '5px' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div className="card-body p-4 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="text-uppercase fw-bold text-muted small mb-1">System Events</h5>
                <h2 className="fw-bold mb-0 text-success">
                  {filteredLogs.filter(l => ['CHECK_IN', 'CHECK_OUT', 'LOCATION_UPDATE'].includes(l.action)).length}
                </h2>
              </div>
              <div className="p-3 rounded-circle" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <i className="bi bi-calendar-event-fill fs-3 text-success"></i>
              </div>
            </div>
            <p className="text-muted small mb-0">
              <i className="bi bi-geo-alt me-1"></i> Check-ins & Locations
            </p>
          </div>
        </div>
      </div>

      {/* Inactivity Alerts Card */}
      <div className="col-md-4">
        <div
          className="card shadow-sm border-start border-warning h-100 cursor-pointer transition-all"
          onClick={() => handleViewChange('inactivity')}
          style={{ cursor: 'pointer', transition: 'transform 0.2s', borderLeftWidth: '5px' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div className="card-body p-4 d-flex flex-column justify-content-between">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="text-uppercase fw-bold text-muted small mb-1">Inactivity Alerts</h5>
                <h2 className="fw-bold mb-0 text-warning">
                  {filteredInactivityAlerts.length}
                </h2>
              </div>
              <div className="p-3 rounded-circle" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                <i className="bi bi-exclamation-triangle-fill fs-3 text-warning"></i>
              </div>
            </div>
            <p className="text-muted small mb-0">
              <i className="bi bi-activity me-1"></i> Monitor Idle Time
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoginTable = () => (
    <div className="card shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
      <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary)' }}><i className="bi bi-person-check me-2"></i>Login / Logout History</h5>
        <span className="badge bg-primary-subtle text-primary border border-primary px-3">Logins & Logouts</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ color: 'var(--text-main)' }}>
            <thead style={{ backgroundColor: 'var(--bg-main)' }}>
              <tr>
                <th className="py-3 ps-4" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Employee</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Type</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Source</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Action</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Timestamp</th>
                <th className="text-end pe-4" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.filter(l => (l.action === 'LOGIN' || l.action === 'LOGOUT') && l.userId?.startsWith('EMP-')).map(log => (
                <tr key={log.id} style={{ borderBottomColor: 'var(--border-color)' }}>
                  <td className="ps-4">
                    <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{log.userName}</div>
                    <small style={{ color: 'var(--text-muted)' }}>{log.userId}</small>
                  </td>
                  <td><span className="badge bg-secondary">{log.employeeType}</span></td>
                  <td className="text-center">
                    {/* Check platform field or fallback to details string */}
                    {(log.platform === 'Desktop' || log.details?.includes('Desktop')) ? (
                      <span className="badge bg-info text-white" title="Desktop App"><i className="bi bi-laptop"></i> Desktop</span>
                    ) : (
                      <span className="badge bg-primary text-white" title="Web Portal"><i className="bi bi-globe"></i> Web</span>
                    )}
                  </td>
                  <td>
                    {log.action === "LOGIN" ?
                      <span className="badge bg-success text-white">LOGIN</span> :
                      <span className="badge bg-danger text-white">LOGOUT</span>}
                  </td>
                  <td>{new Date(log.timestamp).toLocaleTimeString()} <small className="ms-1" style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleDateString()}</small></td>
                  <td className="text-end pe-4">
                    <button className="btn btn-link text-danger p-0" onClick={() => handleDeleteActivity(log.id)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {filteredLogs.filter(l => (l.action === 'LOGIN' || l.action === 'LOGOUT') && l.userId?.startsWith('EMP-')).length === 0 && (
                <tr><td colSpan="6" className="text-center py-4 text-muted">No login activity found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEventsTable = () => (
    <div className="card shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
      <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--success)' }}><i className="bi bi-calendar-event me-2"></i>System Events</h5>
        <span className="badge bg-success-subtle text-success border border-success px-3">Check-ins & Updates</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ color: 'var(--text-main)' }}>
            <thead style={{ backgroundColor: 'var(--bg-main)' }}>
              <tr>
                <th className="py-3 ps-4" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Employee</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Action</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Details</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Location</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Timestamp</th>
                <th className="text-end pe-4" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.filter(l => ['CHECK_IN', 'CHECK_OUT', 'LOCATION_UPDATE'].includes(l.action)).map(log => (
                <tr key={log.id} style={{ borderBottomColor: 'var(--border-color)' }}>
                  <td className="ps-4">
                    <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{log.userName}</div>
                  </td>
                  <td>
                    {log.action === "CHECK_IN" && <span className="badge bg-primary">CHECK IN</span>}
                    {log.action === "CHECK_OUT" && <span className="badge bg-dark">CHECK OUT</span>}
                    {log.action === "LOCATION_UPDATE" && <span className="badge bg-warning text-dark">LOCATION</span>}
                  </td>
                  <td className="small" style={{ color: 'var(--text-muted)' }}>{log.details || '-'}</td>
                  <td>
                    {log.latitude ? (
                      <a href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} target="_blank" rel="noreferrer" className="text-decoration-none">
                        <i className="bi bi-geo-alt-fill text-danger"></i> View
                      </a>
                    ) : '-'}
                  </td>
                  <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="text-end pe-4">
                    <button className="btn btn-link text-danger p-0" onClick={() => handleDeleteActivity(log.id)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {filteredLogs.filter(l => ['CHECK_IN', 'CHECK_OUT', 'LOCATION_UPDATE'].includes(l.action)).length === 0 && (
                <tr><td colSpan="6" className="text-center py-4 text-muted">No system events found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInactivityTable = () => (
    <div className="card shadow-sm border-0 border-start border-warning border-5" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
      <div className="card-header py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h5 className="mb-0 fw-bold text-warning"><i className="bi bi-exclamation-triangle-fill me-2"></i>Inactivity Alerts</h5>
        <span className="badge bg-warning-subtle text-dark border border-warning px-3">Idle &gt; 150s</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ color: 'var(--text-main)' }}>
            <thead style={{ backgroundColor: 'var(--bg-main)' }}>
              <tr>
                <th className="ps-4" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Employee</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Type</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Duration (Idle)</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Timestamp</th>
                <th style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredInactivityAlerts.length > 0 ? (
                filteredInactivityAlerts.map(alert => (
                  <tr key={alert.id || Math.random()} style={{ borderBottomColor: 'var(--border-color)' }}>
                    <td className="ps-4 fw-bold" style={{ color: 'var(--text-main)' }}>{alert.userName}</td>
                    <td><span className="badge bg-secondary">{alert.employeeType}</span></td>
                    <td className="text-danger fw-bold">{Math.floor(alert.duration / 1000)} sec</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(alert.timestamp).toLocaleTimeString()}</td>
                    <td className="small" style={{ color: 'var(--text-muted)' }}>{alert.details}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center py-4 text-muted">No inactivity alerts.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid py-4" style={{ minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Header & Filters */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
        <div>
          {currentView !== 'dashboard' && (
            <button className="btn btn-link text-decoration-none ps-0 mb-2" onClick={() => handleViewChange('dashboard')}>
              <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
            </button>
          )}
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>
              {currentView === 'dashboard' ? 'Activity Reports Dashboard' :
                currentView === 'logins' ? 'Employee Login Reports' :
                  currentView === 'events' ? 'System Event Reports' : 'Inactivity Activity Reports'}
            </h4>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Data"
            >
              <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin-animation' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Filters stay accessible so users can filter before drilling down or while in view */}
        <div className="d-flex gap-2">
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
          />
          <select
            className="form-select"
            value={employeeTypeFilter}
            onChange={(e) => setEmployeeTypeFilter(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
          >
            <option value="all">All Types</option>
            <option value="office">Office</option>
            <option value="sales">Sales</option>
            <option value="wfh">WFH</option>
          </select>
        </div>
      </div>

      {/* View Rendering */}
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'logins' && renderLoginTable()}
      {currentView === 'events' && renderEventsTable()}
      {currentView === 'inactivity' && renderInactivityTable()}

    </div>
  );
};

export default ActivityReports;
