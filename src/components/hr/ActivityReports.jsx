import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const ActivityReports = () => {
  const { user, activityLog: contextLogs, inactivityAlerts, deleteActivity, companies, getCompanyActivities, refreshActivityLogs } = useAuth();
  const location = useLocation();
  const [selectedCompany, setSelectedCompany] = useState("");
  // Helper to get local date string YYYY-MM-DD from timestamp
  const getLocalDateString = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - (offset * 60 * 1000));
    return local.toISOString().split("T")[0];
  };


  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [activityLogs, setActivityLogs] = useState([]);
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all'); // Filter by specific employee name/ID
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      if (user?.type === 'hr' || user?.type === 'company') {
        const logs = await getCompanyActivities(user.companyId);
        setActivityLogs(logs || []);
      } else if (!user?.companyId) {
        setActivityLogs(contextLogs || []);
      }
    } catch (e) {
      console.error("Error fetching activity logs:", e);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActivityLogs();
    await fetchLogs();
    setIsRefreshing(false);
  };

  // Initialize and auto-poll every 8 seconds for fast real-time synchronization
  useEffect(() => {
    if (user?.type === 'hr' || user?.type === 'company') {
      setSelectedCompany(user.companyId);
      fetchLogs();
    } else if (!user?.companyId) {
      setActivityLogs(contextLogs || []);
    }

    const interval = setInterval(() => {
      fetchLogs();
    }, 8000);

    return () => clearInterval(interval);
  }, [contextLogs, user]);

  const handleCompanyChange = async (e) => {
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
      if (log.userId && !emps.has(log.userId)) {
        emps.set(log.userId, log.userName || log.userId);
      }
    });
    return Array.from(emps.entries());
  }, [activityLogs]);

  // Filter logs logic
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      // Date Filter - Use Local Date
      const logDate = getLocalDateString(log.timestamp);
      const dateMatch = !selectedMonth || logDate.startsWith(selectedMonth);

      // Employee Type Filter
      const typeMatch = employeeTypeFilter === 'all' || (log.employeeType === employeeTypeFilter);

      // Specific Employee Filter
      const empMatch = employeeFilter === 'all' || (log.userId === employeeFilter);

      // Search Query Filter
      const searchMatch = !searchQuery || 
        (log.userName && log.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.userId && log.userId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));

      return dateMatch && typeMatch && empMatch && searchMatch;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [activityLogs, selectedMonth, employeeTypeFilter, employeeFilter, searchQuery]);

  // Calculate total active time per employee
  const calculateEmployeeStats = () => {
    const employees = {};

    filteredLogs.forEach((log) => {
      if (!employees[log.userId]) {
        employees[log.userId] = {
          userId: log.userId,
          userName: log.userName || log.userId,
          employeeType: log.employeeType || 'Office',
          loginCount: 0,
          checkInCount: 0,
          lastAction: log.action,
          lastActivityTime: log.timestamp,
          inactivityCount: 0,
        };
      }
      if (log.action === "LOGIN") {
        employees[log.userId].loginCount++;
      }
      if (log.action === "CHECK_IN") {
        employees[log.userId].checkInCount++;
      }
      if (!employees[log.userId].lastActivityTime || new Date(log.timestamp) > new Date(employees[log.userId].lastActivityTime)) {
        employees[log.userId].lastAction = log.action;
        employees[log.userId].lastActivityTime = log.timestamp;
      }
    });

    const relevantAlerts = inactivityAlerts.filter(alert => {
      const alertDate = getLocalDateString(alert.timestamp);
      return (!selectedMonth || alertDate.startsWith(selectedMonth));
    });

    relevantAlerts.forEach((alert) => {
      if (employees[alert.userId]) {
        employees[alert.userId].inactivityCount++;
      }
    });

    return Object.values(employees);
  };

  const employeeStats = calculateEmployeeStats();

  // Filter Inactivity Alerts by Date & Employee
  const filteredInactivityAlerts = useMemo(() => {
    return inactivityAlerts.filter(alert => {
      const alertDate = getLocalDateString(alert.timestamp);
      const dateMatch = !selectedMonth || alertDate.startsWith(selectedMonth);
      const empMatch = employeeFilter === 'all' || alert.userId === employeeFilter;
      return dateMatch && empMatch;
    });
  }, [inactivityAlerts, selectedMonth, employeeFilter]);

  const handleDeleteActivity = async (id) => {
    if (window.confirm("Are you sure you want to delete this activity log?")) {
      await deleteActivity(id);
      await fetchLogs();
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ["Employee ID", "Employee Name", "Type", "Action", "Details", "Timestamp", "Latitude", "Longitude"];
    const rows = filteredLogs.map(l => [
      `"${l.userId || ''}"`,
      `"${l.userName || ''}"`,
      `"${l.employeeType || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.timestamp || ''}"`,
      `"${l.latitude || ''}"`,
      `"${l.longitude || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Activity_Report_${selectedMonth || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const employeeParam = params.get('employee');
    const viewParam = params.get('view');

    if (employeeParam) {
      setEmployeeFilter(employeeParam);
    } else {
      setEmployeeFilter('all');
    }

    if (viewParam && ['dashboard', 'logins', 'events', 'inactivity'].includes(viewParam)) {
      setCurrentView(viewParam);
    } else if (employeeParam) {
      setCurrentView('logins');
    }
  }, [location.search]);

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const renderDashboard = () => (
    <div>
      {/* 3 Metric Cards */}
      <div className="row g-4 mb-4">
        {/* Employee Logins Card */}
        <div className="col-md-4">
          <div
            className="card shadow-sm border-start border-primary h-100 cursor-pointer hover-scale transition-all"
            onClick={() => handleViewChange('logins')}
            style={{ cursor: 'pointer', transition: 'transform 0.2s', borderLeftWidth: '5px', backgroundColor: 'var(--bg-card)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-uppercase fw-bold text-muted small mb-1">Employee Logins</h6>
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
            style={{ cursor: 'pointer', transition: 'transform 0.2s', borderLeftWidth: '5px', backgroundColor: 'var(--bg-card)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-uppercase fw-bold text-muted small mb-1">System Events</h6>
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
            style={{ cursor: 'pointer', transition: 'transform 0.2s', borderLeftWidth: '5px', backgroundColor: 'var(--bg-card)' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div className="card-body p-4 d-flex flex-column justify-content-between">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-uppercase fw-bold text-muted small mb-1">Inactivity Alerts</h6>
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

      {/* Employee-Wise Overview Table */}
      <div className="card shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '14px' }}>
        <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>
              <i className="bi bi-people-fill text-primary me-2"></i>Employee-Wise Activity Summary
            </h5>
            <span className="badge bg-primary bg-opacity-10 text-primary">{employeeStats.length} Employees</span>
          </div>
          <button className="btn btn-sm btn-outline-success" onClick={handleExportCSV}>
            <i className="bi bi-download me-1"></i> Export CSV
          </button>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-main)' }}>
              <thead style={{ backgroundColor: 'var(--bg-main)' }}>
                <tr>
                  <th className="py-3 ps-4" style={{ color: 'var(--text-muted)' }}>Employee</th>
                  <th style={{ color: 'var(--text-muted)' }}>Employee ID</th>
                  <th style={{ color: 'var(--text-muted)' }}>Type</th>
                  <th style={{ color: 'var(--text-muted)' }}>Check-Ins</th>
                  <th style={{ color: 'var(--text-muted)' }}>Logins</th>
                  <th style={{ color: 'var(--text-muted)' }}>Inactivity Alerts</th>
                  <th style={{ color: 'var(--text-muted)' }}>Latest Activity</th>
                  <th className="text-end pe-4" style={{ color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.length > 0 ? (
                  employeeStats.map((emp) => (
                    <tr key={emp.userId} style={{ borderBottomColor: 'var(--border-color)' }}>
                      <td className="ps-4">
                        <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{emp.userName}</div>
                      </td>
                      <td>
                        <span className="badge bg-secondary bg-opacity-75">{emp.userId}</span>
                      </td>
                      <td>
                        <span className="badge bg-info text-dark">{emp.employeeType}</span>
                      </td>
                      <td>
                        <span className="badge bg-success bg-opacity-15 text-success border border-success">{emp.checkInCount} Check-ins</span>
                      </td>
                      <td>{emp.loginCount} times</td>
                      <td>
                        {emp.inactivityCount > 0 ? (
                          <span className="badge bg-warning text-dark">⚠️ {emp.inactivityCount} flags</span>
                        ) : (
                          <span className="badge bg-success text-white">✅ Clean</span>
                        )}
                      </td>
                      <td>
                        <div className="small fw-semibold">{emp.lastAction || '-'}</div>
                        <small className="text-muted">{emp.lastActivityTime ? new Date(emp.lastActivityTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</small>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            setEmployeeFilter(emp.userId);
                            setCurrentView('logins');
                          }}
                        >
                          <i className="bi bi-eye me-1"></i> View Logs
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      No employee activity found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoginTable = () => (
    <div className="card shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '14px' }}>
      <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary)' }}><i className="bi bi-person-check me-2"></i>Login / Logout History</h5>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-primary-subtle text-primary border border-primary px-3">
            {filteredLogs.filter(l => (l.action === 'LOGIN' || l.action === 'LOGOUT') && l.userId?.startsWith('EMP-')).length} Records
          </span>
          <button className="btn btn-sm btn-outline-success" onClick={handleExportCSV}>
            <i className="bi bi-download me-1"></i> Export
          </button>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-main)' }}>
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
    <div className="card shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '14px' }}>
      <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--success)' }}><i className="bi bi-calendar-event me-2"></i>System Events</h5>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-success-subtle text-success border border-success px-3">Check-ins & Updates</span>
          <button className="btn btn-sm btn-outline-success" onClick={handleExportCSV}>
            <i className="bi bi-download me-1"></i> Export
          </button>
        </div>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-main)' }}>
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
    <div className="card shadow-sm border-0 border-start border-warning border-5" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '14px' }}>
      <div className="card-header py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)' }}>
        <h5 className="mb-0 fw-bold text-warning"><i className="bi bi-exclamation-triangle-fill me-2"></i>Inactivity Alerts</h5>
        <span className="badge bg-warning-subtle text-dark border border-warning px-3">Idle &gt; 150s</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ color: 'var(--text-main)' }}>
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
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-4">
        <div>
          {currentView !== 'dashboard' && (
            <button className="btn btn-link text-decoration-none ps-0 mb-1" onClick={() => handleViewChange('dashboard')}>
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
              title="Refresh Real-time Data"
              style={{ borderRadius: '8px' }}
            >
              <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'spin-animation' : ''}`}></i>
            </button>
            <span className="badge bg-success bg-opacity-10 text-success border border-success small">
              <span className="spinner-grow spinner-grow-sm me-1" style={{ width: '6px', height: '6px' }} role="status"></span>
              Live Sync
            </span>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {/* Search Box */}
          <div className="input-group" style={{ maxWidth: '200px' }}>
            <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
            />
          </div>

          {/* Employee Filter */}
          <select
            className="form-select"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)', minWidth: '170px' }}
          >
            <option value="all">👥 All Employees ({uniqueEmployees.length})</option>
            {uniqueEmployees.map(([id, name]) => (
              <option key={id} value={id}>
                {name || id} ({id})
              </option>
            ))}
          </select>

          {/* Employee Type Filter */}
          <select
            className="form-select"
            value={employeeTypeFilter}
            onChange={(e) => setEmployeeTypeFilter(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)', maxWidth: '130px' }}
          >
            <option value="all">All Types</option>
            <option value="office">Office</option>
            <option value="sales">Sales</option>
            <option value="wfh">WFH</option>
          </select>

          {/* Month Filter */}
          <input
            type="month"
            className="form-control"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)', maxWidth: '150px' }}
          />

          {/* Reset Filters */}
          {(employeeFilter !== 'all' || employeeTypeFilter !== 'all' || searchQuery !== '') && (
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => {
                setEmployeeFilter('all');
                setEmployeeTypeFilter('all');
                setSearchQuery('');
              }}
              title="Reset Filters"
            >
              <i className="bi bi-x-circle"></i>
            </button>
          )}
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


