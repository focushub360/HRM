import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage if available (Persists across restarts)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Error parsing user from local storage", error);
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('user');
  });

  const [companies, setCompanies] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [inactivityAlerts, setInactivityAlerts] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  /* REMOVED SINGLE-RUN EFFECT */

  const fetchCompanies = async () => {
    try {
      console.log('Fetching companies from:', API_URL);
      setLoading(true);
      const response = await fetch(`${API_URL}/companies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('Response status:', response.status);
      if (!response.ok) {
        console.error('HTTP Error:', response.status);
        setCompanies([]);
        return;
      }
      const data = await response.json();
      console.log('Companies loaded:', data);
      setCompanies(data || []);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies on mount AND when authenticated
  useEffect(() => {
    fetchCompanies();
  }, [isAuthenticated]);

  // Log active session on mount to ensure attendance tracking catches refreshes/auto-logins
  useEffect(() => {
    if (isAuthenticated && user) {
      logActivity({ action: 'SESSION_START', details: 'App Open / Refresh' });
    }
  }, []); // Run once on mount

  const refreshDashboardData = async () => {
    setLoading(true);
    try {
      console.log('Refreshing dashboard data...');
      const response = await fetch(`${API_URL}/companies`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data || []);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs, alerts, AND leave requests when authenticated
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated || !user?.companyId) return;

      try {
        setLoading(true);

        // Fetch Inactivity Alerts
        const alertsRes = await fetch(`${API_URL}/companies/${user.companyId}/inactivity-alerts`);
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setInactivityAlerts(alertsData);
        }

        // Fetch Activity Logs
        let logsUrl = `${API_URL}/activities/${user.empId}`;
        if (user.type === 'hr' || user.type === 'company') {
          logsUrl = `${API_URL}/companies/${user.companyId}/activities`;
        }
        const logsRes = await fetch(logsUrl);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setActivityLog(logsData);
        }

        // Fetch Leave Requests (NEW)
        let leaveUrl = `${API_URL}/leaverequests/user/${user.empId}`;
        if (user.type === 'hr' || user.type === 'company') {
          leaveUrl = `${API_URL}/leaverequests/company/${user.companyId}`;
        }

        console.log(`Fetching leave requests from: ${leaveUrl}`);
        const leaveRes = await fetch(leaveUrl);
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          setLeaveRequests(leaveData);
        } else {
          console.error("Failed to fetch leave requests:", leaveRes.status);
        }

        // Fetch Notifications
        let notifUrl = `${API_URL}/notifications/${user.empId || user.id}`;
        if (user.type === 'hr' || user.type === 'company') {
          notifUrl = `${API_URL}/notifications/${user.companyId}`;
        }
        const notifRes = await fetch(notifUrl);
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData);
          
          // Auto-clear unread notification badges after 8 seconds
          setTimeout(() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          }, 8000);
        }

      } catch (error) {
        console.error('Error fetching logs/alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user]);

  // Socket Connection for Real-time Notifications
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Join personal room
    const personalRoomId = user.empId || user.id;
    if (personalRoomId) newSocket.emit('join-room', String(personalRoomId));
    
    // Join company room for broadcasts and general chats
    if (user.companyId) newSocket.emit('join-room', String(user.companyId));

    newSocket.on('new-notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      
      // Auto-clear this unread notification badge after 8 seconds
      setTimeout(() => {
        setNotifications(prev => prev.map(n => n.id === notif.id || n._id === notif._id ? { ...n, read: true } : n));
      }, 8000);
    });

    // Listen for new chat messages globally to increment badge
    newSocket.on('new-chat-message', (msg) => {
      // Only increment if we aren't currently viewing the chat. 
      // The Chat component will reset this to 0 when it mounts or receives focus.
      if (window.location.pathname !== '/chat') {
        setChatUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id, user?.empId]);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);

    // Log Activity (Pass userData as state update is async)
    const source = userData.loginSource || 'Web';
    logActivity({
      action: 'LOGIN',
      details: `${source} Login`,
      platform: source
    }, userData);
  };

  const logout = () => {
    // Log Logout before clearing state
    if (user) {
      logActivity({ action: 'LOGOUT', details: 'Web Logout' });
    }

    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setActivityLog([]);
    setLeaveRequests([]);
  };

  const authenticate = async (type, email, password) => {
    try {
      console.log('🔐 AuthContext.authenticate called with:', { type, email });
      
      const rolesToTry = type ? [type] : ['company', 'hr', 'employee'];

      for (const role of rolesToTry) {
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: role, email, password }),
          });

          if (response.ok) {
            const userData = await response.json();
            console.log('✅ Authenticated user:', userData);
            return userData;
          }
        } catch (fetchErr) {
          console.warn(`Attempt for role [${role}] failed:`, fetchErr);
        }
      }

      // If all role-scoped attempts failed, try a single payload without type (in case backend is universal)
      try {
        const fallbackRes = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      } catch (e) {
        // ignore
      }

      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  };

  const addCompany = async (companyData) => {
    try {
      const response = await fetch(`${API_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) throw new Error('Failed to create company');

      const newCompany = await response.json();
      setCompanies((prev) => [...prev, newCompany]);
      return newCompany;
    } catch (error) {
      console.error('Error adding company:', error);
      return null;
    }
  };

  const updateCompany = async (id, companyData) => {
    try {
      const response = await fetch(`${API_URL}/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) throw new Error('Failed to update company');

      const updatedCompany = await response.json();
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updatedCompany } : c))
      );
      return updatedCompany;
    } catch (error) {
      console.error('Error updating company:', error);
      return null;
    }
  };

  const addHRToCompany = async (companyId, hrData) => {
    try {
      const response = await fetch(`${API_URL}/companies/${companyId}/hr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hrData),
      });

      if (!response.ok) throw new Error('Failed to add HR');

      const result = await response.json();

      // Update local companies state
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === parseInt(companyId)) {
            return { ...c, hrAccounts: [...(c.hrAccounts || []), result.hrAccount], hrCount: (c.hrAccounts || []).length + 1 };
          }
          return c;
        })
      );

      return result;
    } catch (error) {
      console.error('Error adding HR:', error);
      return null;
    }
  };

  const addEmployeeToCompany = async (companyId, employeeData) => {
    try {
      const response = await fetch(`${API_URL}/companies/${companyId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to add employee');
      }

      const result = await response.json();

      // Update local companies state
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === parseInt(companyId)) {
            return { ...c, employeeAccounts: [...(c.employeeAccounts || []), result.employeeAccount], employees: (c.employeeAccounts || []).length + 1 };
          }
          return c;
        })
      );

      return result;
    } catch (error) {
      console.error('Error adding employee:', error);
      return { error: error.message };
    }
  };

  const removeCompany = async (id) => {
    try {
      const response = await fetch(`${API_URL}/companies/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete company');

      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  const removeHRFromCompany = async (companyId, hrId) => {
    try {
      const response = await fetch(`${API_URL}/companies/${companyId}/hr/${hrId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete HR');

      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === parseInt(companyId)) {
            return { ...c, hrAccounts: (c.hrAccounts || []).filter((hr) => hr.id !== hrId), hrCount: Math.max(0, (c.hrAccounts || []).length - 1) };
          }
          return c;
        })
      );
    } catch (error) {
      console.error('Error deleting HR:', error);
    }
  };

  const updateHRStatus = async (companyId, hrId, status) => {
    try {
      const response = await fetch(`${API_URL}/companies/${companyId}/hr/${hrId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update HR status');

      const updatedHR = await response.json();

      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === parseInt(companyId)) {
            return {
              ...c,
              hrAccounts: (c.hrAccounts || []).map(hr => hr.id === parseInt(hrId) ? { ...hr, status } : hr)
            };
          }
          return c;
        })
      );
      return true;
    } catch (error) {
      console.error('Error updating HR status:', error);
      return false;
    }
  };

  const removeEmployeeFromCompany = async (companyId, employeeId) => {
    try {
      const response = await fetch(`${API_URL}/companies/${companyId}/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete employee');

      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === parseInt(companyId)) {
            return { ...c, employeeAccounts: (c.employeeAccounts || []).filter((e) => e.id !== employeeId), employees: Math.max(0, (c.employeeAccounts || []).length - 1) };
          }
          return c;
        })
      );
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const updateEmployeeInCompany = async (companyId, employeeId, updateData) => {
    try {
      const response = await fetch(`${API_URL}/companies/${companyId}/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to update employee');

      const updatedEmployee = await response.json();

      setCompanies((prev) =>
        prev.map((c) => {
          if (c.id === parseInt(companyId)) {
            return {
              ...c,
              employeeAccounts: (c.employeeAccounts || []).map((e) =>
                e.id === parseInt(employeeId) ? { ...e, ...updatedEmployee } : e
              )
            };
          }
          return c;
        })
      );
      return updatedEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      return null;
    }
  };

  const logActivity = async (activityData, userOverride = null) => {
    const activeUser = userOverride || user;
    try {
      const activity = {
        userId: activeUser?.empId,
        companyId: activeUser?.companyId,
        action: activityData.action,
        details: activityData.details || '',
        latitude: activityData.latitude,
        longitude: activityData.longitude,
        userName: activeUser?.name,
        employeeType: activeUser?.employeeType,
      };

      const response = await fetch(`${API_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });

      if (!response.ok) throw new Error('Failed to log activity');

      const logged = await response.json();
      setActivityLog((prev) => [...prev, logged]);
      return logged;
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const getCompanyActivities = async (companyId) => {
    try {
      const response = await fetch(`${API_URL}/companies/${companyId}/activities`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching company activities:', error);
      return [];
    }
  };

  const deleteActivity = async (id) => {
    try {
      const response = await fetch(`${API_URL}/activities/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete activity');

      setActivityLog((prev) => prev.filter((log) => log.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting activity:', error);
      return false;
    }
  };

  const logInactivityAlert = async (alertData) => {
    try {
      const alert = {
        userId: user?.empId,
        companyId: user?.companyId,
        action: alertData.action,
        details: alertData.details || '',
        duration: alertData.duration,
        userName: user?.name,
        employeeType: user?.employeeType,
      };

      const response = await fetch(`${API_URL}/inactivity-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });

      if (!response.ok) throw new Error('Failed to log inactivity alert');

      const logged = await response.json();
      setInactivityAlerts((prev) => [...prev, logged]);
      return logged;
    } catch (error) {
      console.error('Error logging inactivity alert:', error);
    }
  };

  const notifyInactivityAlert = async (alertData) => {
    // Create notifications for both employee and HR
    const notification = {
      id: notifications.length + 1,
      recipientType: 'dual',
      recipientId: user?.empId,
      companyId: user?.companyId,
      message: `Inactivity detected for ${alertData.duration}ms`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'INACTIVITY_ALERT',
    };

    setNotifications((prev) => [...prev, notification]);
    await logInactivityAlert(alertData);
  };

  const getEmployeeActivityLog = (empId) => {
    return activityLog.filter((log) => log.userId === empId);
  };

  const getInactivityAlertsForCompany = (companyId) => {
    return inactivityAlerts.filter((alert) => alert.companyId === companyId);
  };

  const getNotifications = (filterType = 'all', recipientId = null) => {
    let filtered = notifications;
    if (filterType === 'employee' && recipientId) {
      filtered = notifications.filter((n) => n.recipientId === recipientId);
    } else if (filterType === 'company' && recipientId) {
      filtered = notifications.filter((n) => n.companyId === recipientId);
    }
    return filtered;
  };

  const markNotificationAsRead = async (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => ((n.id || n._id) === notificationId ? { ...n, read: true } : n))
    );
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // --- NEW LEAVE MANAGEMENT FUNCTIONS ---

  const submitLeaveRequest = async (requestData) => {
    try {
      const payload = {
        ...requestData,
        userId: user?.empId,
        companyId: user?.companyId,
        userName: user?.name,
        empId: user?.empId
      };
      const response = await fetch(`${API_URL}/leaverequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to submit leave request");

      const newReq = await response.json();
      setLeaveRequests(prev => [newReq, ...prev]);
      return newReq;
    } catch (error) {
      console.error("Error submitting leave request:", error);
      return null;
    }
  };

  const updateLeaveStatus = async (requestId, status) => {
    try {
      const response = await fetch(`${API_URL}/leaverequests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approverId: user?.empId, approverName: user?.name || 'HR' })
      });

      if (!response.ok) throw new Error("Failed to update leave request");

      const updatedReq = await response.json();
      setLeaveRequests(prev => prev.map(req => req.id === requestId ? updatedReq : req));
      return updatedReq;
    } catch (error) {
      console.error("Error updating leave status:", error);
      return null;
    }
  };

  const [events, setEvents] = useState([]);

  // ... (existing helper functions)

  // --- EVENTS ---
  const submitEvent = async (eventData) => {
    try {
      const payload = {
        ...eventData,
        hostId: user?.empId,
        hostName: user?.name,
        companyId: user?.companyId
      };
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const newEvent = await response.json();
        setEvents(prev => [...prev, newEvent]);
        return newEvent;
      }
      return null;
    } catch (err) {
      console.error("Error submitting event", err);
      return null;
    }
  };

  const fetchEvents = async () => {
    if (!user?.companyId) return;
    try {
      const response = await fetch(`${API_URL}/events?companyId=${user.companyId}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Error fetching events", err);
    }
  };

  // Recogntions
  const [recognitions, setRecognitions] = useState([]);

  const fetchRecognitions = async () => {
    if (!user?.companyId) return;
    try {
      const res = await fetch(`${API_URL}/recognitions/${user.companyId}`);
      if (res.ok) {
        const data = await res.json();
        setRecognitions(data);
      }
    } catch (err) {
      console.error("Fetch recognitions failed:", err);
    }
  };

  const submitRecognition = async (data) => {
    const tempId = Date.now();
    const tempRec = {
      ...data,
      companyId: user.companyId,
      recognizerId: user.empId,
      recognizerName: user.name,
      date: new Date().toISOString(),
      id: tempId,
      isTemp: true
    };

    setRecognitions(prev => [tempRec, ...prev]);

    try {
      const payload = { ...data, companyId: user.companyId, recognizerId: user.empId, recognizerName: user.name };
      const res = await fetch(`${API_URL}/recognitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newRec = await res.json();
        setRecognitions(prev => prev.map(r => r.id === tempId ? newRec : r));
        return true;
      }
      setRecognitions(prev => prev.filter(r => r.id !== tempId));
      return false;
    } catch (err) {
      console.error(err);
      setRecognitions(prev => prev.filter(r => r.id !== tempId));
      return false;
    }
  };

  // Refetch events and recognitions when needed
  useEffect(() => {
    if (isAuthenticated && user?.companyId) {
      fetchEvents();
      fetchRecognitions();
    }
  }, [isAuthenticated, user]);

  const hasPermission = (permission) => {
    if (!user) return false;

    // Company Admin has all permissions globally (can see Company Management)
    if (user.type === 'company') return true;

    const hrPermissions = [
      'view_dashboard',
      'manage_users', // Activity Reports
      'manage_employees', // Employees
      'manage_leaves', // Added for Leave Management
      'manage_attendance', // Added for HR Attendance view
      'monitor_employees', // Live Tracking
      'view_attendance',
      'manage_payroll',
      'view_reports',
      'chat',
      'feed',
      'recognition',
      'events',
      'manage_projects' // Allow HR and PM to manage projects
    ];

    // HR Permissions
    if (user.type === 'hr') {
      return hrPermissions.includes(permission);
    }

    // Employee Permissions
    if (user.type === 'employee') {
      // If employee is a project manager, they get the same rights as HR
      if (user.role === 'project_manager') {
        return hrPermissions.includes(permission);
      }

      const employeePermissions = [
        'view_dashboard',
        'view_attendance',
        'chat',
        'feed',
        'recognition',
        'events'
      ];
      
      return employeePermissions.includes(permission);
    }

    return false;
  };

  const submitDailyWorkReport = async (reportData) => {
    try {
      const payload = {
        ...reportData,
        userId: user?.empId || user?.id || 'unknown',
        userName: user?.name || user?.employeeName || user?.email || 'Employee',
        companyId: user?.companyId || user?.company_id || 'unknown',
      };
      const res = await fetch(`${API_URL}/daily-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return data.report || data;
      } else {
        const errText = await res.text();
        console.error("Backend returned error for daily report:", errText);
        return null;
      }
    } catch (err) {
      console.error("Error submitting daily work report:", err);
      return null;
    }
  };

  const getDailyWorkReports = async (filters = {}) => {
    try {
      const companyId = filters.companyId || user?.companyId;
      const queryParams = new URLSearchParams();
      if (companyId) queryParams.append('companyId', companyId);
      if (filters.date) queryParams.append('date', filters.date);
      if (filters.month) queryParams.append('month', filters.month);
      if (filters.userId) queryParams.append('userId', filters.userId);

      const res = await fetch(`${API_URL}/daily-reports?${queryParams.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (err) {
      console.error("Error fetching daily work reports:", err);
      return [];
    }
  };

  const value = {
    user,
    isAuthenticated,
    hasPermission,
    socket,
    companies,
    activityLog,
    inactivityAlerts,
    leaveRequests,
    notifications,
    chatUnreadCount,
    setChatUnreadCount,
    loading,
    login,
    logout,
    authenticate,
    addCompany,
    updateCompany,
    addHRToCompany,
    addEmployeeToCompany,
    removeCompany,
    removeHRFromCompany,
    updateHRStatus,
    removeEmployeeFromCompany,
    logActivity,
    deleteActivity,
    getCompanyActivities,
    logInactivityAlert,
    notifyInactivityAlert,
    getEmployeeActivityLog,
    getInactivityAlertsForCompany,
    getNotifications,
    markNotificationAsRead,
    refreshDashboardData,
    submitLeaveRequest,
    updateLeaveStatus,
    updateEmployeeInCompany,
    events,
    submitEvent,
    fetchEvents,
    recognitions,
    fetchRecognitions,
    submitRecognition,
    submitDailyWorkReport,
    getDailyWorkReports,
    refreshActivityLogs: async () => {
      if (!isAuthenticated || !user?.companyId) return;
      setLoading(true);
      try {
        // Fetch Inactivity Alerts
        const alertsRes = await fetch(`${API_URL}/companies/${user.companyId}/inactivity-alerts`);
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setInactivityAlerts(alertsData);
        }

        // Fetch Activity Logs
        let logsUrl = `${API_URL}/activities/${user.empId}`;
        if (user.type === 'hr' || user.type === 'company') {
          logsUrl = `${API_URL}/companies/${user.companyId}/activities`;
        }
        const logsRes = await fetch(logsUrl);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setActivityLog(logsData);
        }
      } catch (err) {
        console.error("Error refreshing activity logs:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
