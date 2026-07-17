import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import "bootstrap-icons/font/bootstrap-icons.css";
import SuccessModal from "../common/SuccessModal";
import WebcamMonitor from "./WebcamMonitor";

const EmployeeDashboard = () => {
  const { user, logout, logActivity, notifyInactivityAlert, activityLog } = useAuth();
  const navigate = useNavigate();

  // State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [locationAddress, setLocationAddress] = useState("Fetching location...");
  const [locationCoords, setLocationCoords] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [mouseActive, setMouseActive] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(null);
  const [sessionDuration, setSessionDuration] = useState("00:00:00");

  // Stats
  const [stats, setStats] = useState({
    presentDays: 0,
    totalHours: 0,
    avgHours: 0,
    pendingRequests: 0,
  });

  // Tasks State
  const [myTasks, setMyTasks] = useState([]);

  // Fetch Tasks
  const fetchMyTasks = async () => {
    if (!user?.empId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/user/${user.empId}`);
      if (res.ok) {
        const data = await res.json();
        setMyTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [user]);

  const handleTaskStatusUpdate = async (taskId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/project-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };


  // 1. Clock & Auto-Reset Logic (11 PM) & Live Timer
  useEffect(() => {
    let interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Session Duration Timer
      if (isCheckedIn && checkInTime) {
        const diff = Math.floor((now - checkInTime) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setSessionDuration(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      }

      // Auto Reset at 11:00 PM (23:00)
      if (now.getHours() === 23 && now.getMinutes() === 0 && isCheckedIn) {
        handleCheckOut(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime]);

  // 2. Load State from LocalStorage & Calc Stats
  useEffect(() => {
    const storedCheckIn = localStorage.getItem("isActiveCheckIn");
    const storedStartTime = localStorage.getItem("checkInTime");
    const storedLoc = localStorage.getItem("checkInLocation");

    if (storedCheckIn === "true" && storedStartTime) {
      setIsCheckedIn(true);
      setCheckInTime(new Date(storedStartTime));
      setLastActivityTime(new Date());
      setMouseActive(true);
      if (storedLoc) setLocationAddress(storedLoc);
    }

    calculateStats();
  }, [activityLog, currentTime]); // Recalculate on every tick if checked-in

  // Inactivity tracking (Only runs when Checked In and is Employee)
  const lastActivityRef = React.useRef(new Date());

  useEffect(() => {
    // Strict Limit: Only for 'employee' type. Not HR, Not Admin(Company).
    if (!isCheckedIn || user?.type !== 'employee') return;

    const INACTIVITY_THRESHOLD = 150000; // 150 seconds

    const handleActivity = () => {
      lastActivityRef.current = new Date();
      if (inactivityWarning) setInactivityWarning(false);
      // Optional: Update visual state only if meaningful changes to avoid re-renders
      if (!mouseActive) setMouseActive(true);
    };

    const checkInactivity = setInterval(() => {
      const now = new Date();
      if (lastActivityRef.current) {
        const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();

        if (timeSinceLastActivity > INACTIVITY_THRESHOLD && !inactivityWarning) {
          setInactivityWarning(true);
          setMouseActive(false);

          // Log alert
          notifyInactivityAlert({
            action: "INACTIVITY_ALERT",
            details: `Mouse/Keyboard Idle detected for ${Math.floor(timeSinceLastActivity / 1000)} seconds`,
            duration: timeSinceLastActivity,
          });
        }
      }
    }, 5000);

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keypress", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(checkInactivity);
    };
  }, [isCheckedIn, inactivityWarning, user, mouseActive]);

  const calculateStats = () => {
    const currentMonth = new Date().getMonth();
    const userLogs = activityLog?.filter(
      (log) =>
        log.userId === user?.empId &&
        new Date(log.timestamp).getMonth() === currentMonth
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) || [];

    // 1. Calculate Historical Hours from closed sessions
    let totalMs = 0;
    let tempCheckIn = null;
    const workedDays = new Set(); // Track unique days for Avg calculation

    userLogs.forEach(log => {
      const time = new Date(log.timestamp).getTime();
      const dateStr = new Date(log.timestamp).toDateString();

      if (log.action === 'CHECK_IN') {
        if (!tempCheckIn) {
          tempCheckIn = time; // First check-in of a session
          workedDays.add(dateStr);
        }
      } else if (log.action === 'CHECK_OUT' || log.action === 'AUTO_CHECK_OUT') {
        if (tempCheckIn) {
          totalMs += (time - tempCheckIn);
          tempCheckIn = null; // Session closed
        }
      }
    });

    // 2. Add Current Active Session (Live)
    if (isCheckedIn && checkInTime) {
      // We use the 'currentTime' state which updates every second
      const currentSessionMs = currentTime.getTime() - checkInTime.getTime();
      if (currentSessionMs > 0) {
        totalMs += currentSessionMs;
        workedDays.add(checkInTime.toDateString());
      }
    }

    // Convert to decimal hours (e.g. 8.5)
    // Avoid division by zero
    const hours = (totalMs / (1000 * 60 * 60)).toFixed(2);
    const avg = workedDays.size ? (hours / workedDays.size).toFixed(2) : 0;

    // Retrieve pending requests from localStorage
    const storedPermissions = JSON.parse(localStorage.getItem('myPermissions') || '[]');
    const pendingCount = storedPermissions.filter(p => p.status === 'Pending').length;

    setStats({
      presentDays: workedDays.size,
      totalHours: hours,
      avgHours: avg,
      pendingRequests: pendingCount,
    });
  };

  // 3. Reverse Geocoding
  const fetchAddress = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      return (
        data.display_name?.split(",").slice(0, 3).join(",") ||
        "Unknown Location"
      );
    } catch (error) {
      console.error("Geocoding failed", error);
      return "Lat: " + lat.toFixed(4) + ", Lon: " + lon.toFixed(4);
    }
  };

  // 4. Actions
  const handleCheckIn = () => {
    // Daily Limit Check
    const todayStr = new Date().toDateString();
    const todayCheckIns = activityLog?.filter(log =>
      log.userId === user?.empId &&
      log.action === 'CHECK_IN' &&
      new Date(log.timestamp).toDateString() === todayStr
    ).length || 0;

    if (todayCheckIns >= 2) {
      alert("Limit Reached: You can only Check In 2 times per day.");
      return;
    }

    const processCheckIn = (lat, lon, addr) => {
      const now = new Date();
      setIsCheckedIn(true);
      setCheckInTime(now);
      setLastActivityTime(now);
      setMouseActive(true);
      setLocationAddress(addr);
      setCheckOutTime(null);
      setLocationCoords({ latitude: lat, longitude: lon });

      localStorage.setItem("isActiveCheckIn", "true");
      localStorage.setItem("checkInTime", now.toISOString());
      localStorage.setItem("checkInLocation", addr);

      logActivity({
        action: "CHECK_IN",
        details: `Checked In from ${addr}`,
        latitude: lat,
        longitude: lon,
      });

      alert("You have Checked In! Work timer started.");
    };

    const defaultLocation = {
      latitude: 12.9165,
      longitude: 79.1325,
      address: "Vellore, Tamil Nadu, India"
    };

    if (!navigator.geolocation) {
      // Fallback to default
      processCheckIn(defaultLocation.latitude, defaultLocation.longitude, defaultLocation.address);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const address = await fetchAddress(latitude, longitude);
        processCheckIn(latitude, longitude, address);
      },
      (err) => {
        console.warn("Location access denied or failed. Using default location.", err);
        // Fallback to default on error
        processCheckIn(defaultLocation.latitude, defaultLocation.longitude, defaultLocation.address);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckOut = (auto = false) => {
    const defaultLocation = {
      coords: {
        latitude: 12.9165,
        longitude: 79.1325
      }
    };

    const processLogoutWithPos = async (pos) => {
      const { latitude, longitude } = pos.coords;
      const address = await fetchAddress(latitude, longitude);
      processCheckOut(auto, { latitude, longitude, address });
    };

    if (!navigator.geolocation) {
      processLogoutWithPos(defaultLocation);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => processLogoutWithPos(pos),
      (err) => {
        console.error("Logout location unavailable:", err);
        processLogoutWithPos(defaultLocation);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const processCheckOut = (auto, locationData) => {
    const now = new Date();
    setIsCheckedIn(false);
    setCheckOutTime(now);
    setMouseActive(false);

    localStorage.removeItem("isActiveCheckIn");
    localStorage.removeItem("checkInTime");
    localStorage.removeItem("checkInLocation");

    let durationStr = sessionDuration;

    const logDetails = {
      action: auto ? "AUTO_CHECK_OUT" : "CHECK_OUT",
      details: `Checked Out. Session: ${durationStr} ${locationData ? `from ${locationData.address}` : ''}`,
    };

    if (locationData) {
      logDetails.latitude = locationData.latitude;
      logDetails.longitude = locationData.longitude;
    }

    logActivity(logDetails);

    if (auto) alert("System auto-checked you out (End of Day).");
    else alert("You have Checked Out!");
  };

  const formatTime = (date) => {
    if (!date) return "--:--";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Get employee type label
  const getEmployeeTypeLabel = () => {
    const labels = {
      office: "Office Employee",
      sales: "Sales & Marketing Employee",
      wfh: "Work From Home Employee",
    };
    return labels[user?.employeeType] || "Employee";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="container-fluid" style={{ display: "flex", flexDirection: "column", padding: "16px 20px", color: 'var(--text-main)', scrollBehavior: 'smooth' }}>
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
        <div>
          <h4 className="fw-bold mb-0" style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>Employee Dashboard</h4>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Overview & Attendance</p>
        </div>

        <div className="dropdown">
          <button
            className="btn border-0 p-0 d-flex align-items-center gap-2"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center shadow-sm text-white"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--primary)',
                overflow: 'hidden',
                fontSize: '1.2rem'
              }}
            >
              {user?.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-100 h-100 object-fit-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'E'
              )}
            </div>
            <div className="d-none d-md-block text-start">
              <div className="fw-bold small lh-1" style={{ color: 'var(--text-main)' }}>{user?.name || 'Employee'}</div>
              <small className="text-muted" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getEmployeeTypeLabel()}</small>
            </div>
            <i className="bi bi-chevron-down small" style={{ color: 'var(--text-muted)' }}></i>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <li><button className="dropdown-item" onClick={() => navigate('/profile')} style={{ color: 'var(--text-main)' }}><i className="bi bi-person me-2"></i>My Profile</button></li>
            <li><button className="dropdown-item" onClick={() => navigate('/settings')} style={{ color: 'var(--text-main)' }}><i className="bi bi-gear me-2"></i>Settings</button></li>
            <li><hr className="dropdown-divider" style={{ borderColor: 'var(--border-color)' }} /></li>
            <li><button className="dropdown-item text-danger" onClick={() => { logout(); navigate('/login'); }}><i className="bi bi-box-arrow-right me-2"></i>Logout</button></li>
          </ul>
        </div>
      </div>

      {/* Welcome Header */}
      <div className="d-flex justify-content-between align-items-center mb-3 p-3 rounded shadow-sm card-custom flex-shrink-0">
        <div>
          <h3 className="mb-1 fw-bold text-primary">
            {getGreeting()}, {user?.name || "Employee"}! 👋
          </h3>
          <p className="text-muted mb-0" style={{ color: 'var(--text-muted)' }}>
            Logged in as: <span className="fw-bold" style={{ color: 'var(--text-main)' }}>{user?.email}</span>
            <span className="ms-2 badge bg-info">{getEmployeeTypeLabel()}</span>
          </p>
          {/* Display Head HR Info */}
          {user?.headHrName && (
            <div className="mt-2 pt-2 border-top d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark border" style={{fontSize: '0.75rem'}}><i className="bi bi-person-badge me-1"></i> Head HR</span>
              <div>
                <span className="fw-bold me-2" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{user.headHrName}</span>
                <span className="small opacity-75" style={{ color: 'var(--text-main)' }}>({user.headHrEmail})</span>
              </div>
            </div>
          )}
        </div>
        <div className="d-flex gap-2">
          {!isCheckedIn ? (
            <button className="btn btn-success px-4 py-2" onClick={handleCheckIn}>
              <i className="bi bi-play-circle me-2"></i> CHECK IN
            </button>
          ) : (
            <button className="btn btn-danger px-4 py-2" onClick={() => handleCheckOut(false)}>
              <i className="bi bi-stop-circle me-2"></i> CHECK OUT
            </button>
          )}
        </div>
      </div>

      {/* Inactivity Warning */}
      {inactivityWarning && isCheckedIn && (
        <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: 'var(--warning)' }}>
          <strong>⚠️ Inactivity Alert!</strong> You have been inactive. HR has been notified.
          <button type="button" className="btn-close" onClick={() => setInactivityWarning(false)}></button>
        </div>
      )}

      {/* AI Proctoring / Webcam Monitor */}
      {isCheckedIn && (
        <WebcamMonitor />
      )}

      <div className="row g-3 flex-grow-1" style={{ minHeight: 0 }}>
        {/* Today's Status Card */}
        <div className="col-md-6">
          <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
            <div className="card-header border-0 pt-4 px-4" style={{ backgroundColor: 'transparent' }}>
              <h5 className="card-title mb-0" style={{ fontWeight: 'bold' }}>
                Today's Status - {new Date().toLocaleDateString()}
              </h5>
            </div>
            <div className="card-body px-4 pb-4">
              {/* ... (Keep existing content inside simpler wrapper to save space) ... */}
              <div className="d-flex flex-column align-items-center mb-3 mt-2">
                <div className="text-center mb-3">
                  <h1 className="display-4 fw-bold mb-0">
                    {formatTime(checkInTime || (isCheckedIn ? currentTime : null))}
                  </h1>
                  <small className="opacity-75">Check In Time</small>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <span className={isCheckedIn ? "badge bg-success" : "badge bg-secondary"}>
                    {isCheckedIn ? "Checked In" : "Offline"}
                  </span>
                  <span className="small mt-1">{locationAddress !== "Fetching location..." ? locationAddress.substring(0, 30) + "..." : "--"}</span>
                </div>
              </div>

              <div className="d-grid gap-2">
                {/* Actions moved here or kept on top? Top is fine. This is just status display */}
                <div className="d-flex justify-content-between text-center border-top pt-3" style={{ borderColor: 'var(--border-color)', borderTop: '1px solid var(--glass-border)' }}>
                  <div>
                    <h5 className="mb-0" style={{ color: 'var(--text-main)' }}>{formatTime(checkInTime)}</h5>
                    <small style={{ color: 'var(--text-main)', opacity: 0.7 }}>In</small>
                  </div>
                  <div>
                    <h5 className="mb-0 text-primary">{sessionDuration}</h5>
                    <small style={{ color: 'var(--text-main)', opacity: 0.7 }}>Active</small>
                  </div>
                  <div>
                    <h5 className="mb-0" style={{ color: 'var(--text-main)' }}>{formatTime(checkOutTime)}</h5>
                    <small style={{ color: 'var(--text-main)', opacity: 0.7 }}>Out</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* My Tasks Widget */}
        <div className="col-md-6">
          <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
            <div className="card-header border-0 pt-4 px-4" style={{ backgroundColor: 'transparent' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0"><i className="bi bi-kanban me-2"></i>My Tasks</h5>
                <span className="badge bg-primary rounded-pill">{myTasks.filter(t => t.status !== 'Completed').length} Pending</span>
              </div>
            </div>
            <div className="card-body p-3">
              {myTasks.length > 0 ? (
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
                  {myTasks.map(task => (
                    <div key={task.id} className="p-2 rounded border" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--glass-border)' }}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h6 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>{task.title}</h6>
                          <small className="text-muted" style={{ fontSize: '0.75rem' }}>{task.projectTitle}</small>
                        </div>
                        <span className={`badge ${task.status === 'Completed' ? 'bg-success' : task.status === 'In Progress' ? 'bg-warning' : 'bg-secondary'}`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="small text-muted mb-2">{task.description}</p>

                      {task.status !== 'Completed' && (
                        <div className="d-flex gap-2 justify-content-end mt-2">
                          {task.status === 'Pending' && (
                            <button className="btn btn-sm btn-outline-warning" onClick={() => handleTaskStatusUpdate(task.id, 'In Progress')}>
                              Start
                            </button>
                          )}
                          <button className="btn btn-sm btn-outline-success" onClick={() => handleTaskStatusUpdate(task.id, 'Completed')}>
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-check-circle fs-1 mb-2 d-block opacity-25"></i>
                  No tasks assigned. Great job!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Summary moved to next row */}
        <div className="col-12">
          <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
            <div className="card-header border-0 pt-4 px-4" style={{ backgroundColor: 'transparent' }}>
              <h5 className="card-title mb-0" style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
                Monthly Summary -{" "}
                {new Date().toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </h5>
            </div>
            <div className="card-body p-3">
              <div className="row g-2">
                <div className="col-md-3">
                  <div
                    className="p-2 rounded-3 text-center h-100 d-flex flex-column justify-content-center"
                    style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)" }}
                  >
                    <h3 className="text-success fw-bold mb-1">
                      {stats.presentDays}
                    </h3>
                    <p className="text-success mb-0 fw-semibold">
                      Present Days
                    </p>
                    <i className="bi bi-calendar-check text-success fs-4 mt-2"></i>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="p-2 rounded-3 text-center h-100 d-flex flex-column justify-content-center"
                    style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)" }}
                  >
                    <h3 className="text-primary fw-bold mb-1">
                      {stats.totalHours}
                    </h3>
                    <p className="text-primary mb-0 fw-semibold">Total Hours</p>
                    <i className="bi bi-clock-history text-primary fs-4 mt-2"></i>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="p-2 rounded-3 text-center h-100 d-flex flex-column justify-content-center"
                    style={{ backgroundColor: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.2)" }}
                  >
                    <h3
                      className="fw-bold mb-1"
                      style={{ color: "#a855f7" }}
                    >
                      {stats.avgHours}
                    </h3>
                    <p className="mb-0 fw-semibold" style={{ color: "#a855f7" }}>
                      Avg Hours/Day
                    </p>
                    <i
                      className="bi bi-graph-up-arrow fs-4 mt-2"
                      style={{ color: "#a855f7" }}
                    ></i>
                  </div>
                </div>
                <div className="col-md-3">
                  <div
                    className="p-2 rounded-3 text-center h-100 d-flex flex-column justify-content-center"
                    style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}
                  >
                    <h3 className="text-warning fw-bold mb-1">
                      {stats.pendingRequests}
                    </h3>
                    <p className="text-warning mb-0 fw-semibold">
                      Pending Requests
                    </p>
                    <i className="bi bi-hourglass-split text-warning fs-4 mt-2"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
