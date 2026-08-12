import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import MyPermissions from './MyPermissions.jsx';
import MyActivityLogs from './MyActivityLogs.jsx';
import DailyWorkCheckoutModal from './DailyWorkCheckoutModal.jsx';

const MyAttendance = () => {
    const { user, logActivity, activityLog, notifyInactivityAlert } = useAuth();
    const navigate = useNavigate();

    // Tabs State
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'permissions', 'activity'

    // Attendance Logic State
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState(null);
    const [checkOutTime, setCheckOutTime] = useState(null);
    const [locationAddress, setLocationAddress] = useState("Fetching location...");
    const [locationCoords, setLocationCoords] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showDailyWorkModal, setShowDailyWorkModal] = useState(false);

    // Inactivity State
    const [inactivityWarning, setInactivityWarning] = useState(false);
    const [lastActivityTime, setLastActivityTime] = useState(null);
    const [locating, setLocating] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        presentDays: 0,
        totalHours: 0,
        avgHours: 0,
        pendingRequests: 0
    });

    const [attendanceHistory, setAttendanceHistory] = useState([]);

    // 1. Clock & Auto-Reset Logic (11 PM)
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            // Auto Reset at 11:00 PM (23:00)
            if (now.getHours() === 23 && now.getMinutes() === 0 && isCheckedIn) {
                handleCheckOut(true);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isCheckedIn]);

    // 2. Load State from LocalStorage on Mount
    useEffect(() => {
        const storedCheckIn = localStorage.getItem('isActiveCheckIn');
        const storedStartTime = localStorage.getItem('checkInTime');
        const storedLoc = localStorage.getItem('checkInLocation');

        if (storedCheckIn === 'true' && storedStartTime) {
            setIsCheckedIn(true);
            setCheckInTime(new Date(storedStartTime));
            if (storedLoc) setLocationAddress(storedLoc);
            setLastActivityTime(new Date());
        }

        calculateStats();
    }, [activityLog, currentTime]);

    // 3. Inactivity Tracking
    useEffect(() => {
        if (!isCheckedIn) return;

        const INACTIVITY_THRESHOLD = 150000; // 150 seconds

        const handleActivity = () => {
            setLastActivityTime(new Date());
            setInactivityWarning(false);
        };

        const checkInactivity = setInterval(() => {
            if (lastActivityTime) {
                const timeSinceLastActivity = Date.now() - lastActivityTime.getTime();
                if (timeSinceLastActivity > INACTIVITY_THRESHOLD && !inactivityWarning) {
                    setInactivityWarning(true);
                    notifyInactivityAlert({
                        action: "INACTIVITY_ALERT",
                        details: `User inactive for ${Math.floor(timeSinceLastActivity / 1000)} seconds`,
                        duration: timeSinceLastActivity,
                    });
                }
            }
        }, 5000);

        window.addEventListener("mousemove", handleActivity);
        window.addEventListener("keypress", handleActivity);
        window.addEventListener("click", handleActivity);

        return () => {
            window.removeEventListener("mousemove", handleActivity);
            window.removeEventListener("keypress", handleActivity);
            window.removeEventListener("click", handleActivity);
            clearInterval(checkInactivity);
        };
    }, [isCheckedIn, lastActivityTime, inactivityWarning]);

    const calculateStats = () => {
        const currentMonth = new Date().getMonth();
        // Filter logs for current user and month
        const userLogs = activityLog?.filter(log =>
            log.userId === user?.empId &&
            new Date(log.timestamp).getMonth() === currentMonth
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) || [];

        // 1. Calculate Historical Data & Build Table Rows
        let totalMs = 0;
        let tempCheckIn = null;
        let tempCheckInObj = null;
        const workedDays = new Set();
        const historyMap = new Map(); // DateString -> { date, status, checkIn, checkOut, workHours, location }

        userLogs.forEach(log => {
            const d = new Date(log.timestamp);
            const dateStr = d.toDateString();
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (log.action === 'CHECK_IN') {
                if (!tempCheckIn) {
                    tempCheckIn = d.getTime();
                    tempCheckInObj = log;
                    workedDays.add(dateStr);

                    // Init history entry
                    if (!historyMap.has(dateStr)) {
                        historyMap.set(dateStr, {
                            date: d.toLocaleDateString(),
                            status: 'Present',
                            checkIn: timeStr,
                            checkOut: '--',
                            workHours: '--',
                            latitude: log.latitude,
                            longitude: log.longitude
                        });
                    }
                }
            } else if (log.action === 'CHECK_OUT' || log.action === 'AUTO_CHECK_OUT') {
                if (tempCheckIn) {
                    const diff = d.getTime() - tempCheckIn;
                    totalMs += diff;

                    // Update history entry
                    if (historyMap.has(dateStr)) {
                        const entry = historyMap.get(dateStr);
                        entry.checkOut = timeStr;

                        // Calculate hours for this session (accumulative if multiple sessions? Simplification: just last checkout determines session end for display, logic mimics dashboard)
                        // Precise session math:
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        entry.workHours = `${h}h ${m}m`;
                    }
                    tempCheckIn = null;
                }
            }
        });

        // 2. Add Live Session
        if (isCheckedIn && checkInTime) {
            const currentSessionMs = currentTime.getTime() - checkInTime.getTime();
            if (currentSessionMs > 0) {
                totalMs += currentSessionMs;
                workedDays.add(checkInTime.toDateString());
            }
        }

        // Stats
        const hours = (totalMs / (1000 * 60 * 60)).toFixed(2);
        const avg = workedDays.size ? (hours / workedDays.size).toFixed(2) : 0;

        // Pending Permissions
        const storedPermissions = JSON.parse(localStorage.getItem('myPermissions') || '[]');
        const pendingCount = storedPermissions.filter(p => p.status === 'Pending').length;

        setStats({
            presentDays: workedDays.size,
            totalHours: hours,
            avgHours: avg,
            pendingRequests: pendingCount
        });

        setAttendanceHistory(Array.from(historyMap.values()).reverse()); // Newest first
    };

    // 3. Reverse Geocoding
    const fetchAddress = async (lat, lon) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            return data.display_name || "Unknown Location";
        } catch (error) {
            console.error("Geocoding failed", error);
            return "Lat: " + lat.toFixed(4) + ", Lon: " + lon.toFixed(4);
        }
    };

    // 4. Precise Location Helper
    const getPreciseLocation = (onSuccess, onError) => {
        if (!navigator.geolocation) {
            onError("Geolocation is not supported by this browser.");
            return;
        }

        let watchId;
        let timeoutId;
        let bestPosition = null;

        const cleanup = () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            if (timeoutId) clearTimeout(timeoutId);
        };

        const onPosition = (pos) => {
            console.log(`GPS Signal: ${pos.coords.accuracy}m accuracy`);
            // Keep the best position found so far
            if (!bestPosition || pos.coords.accuracy < bestPosition.coords.accuracy) {
                bestPosition = pos;
            }
            // If GPS is warmed up and very accurate (< 20m), stop immediately
            if (pos.coords.accuracy <= 20) {
                cleanup();
                onSuccess(pos);
            }
        };

        const onTimeout = () => {
            cleanup();
            if (bestPosition) {
                console.log("Location timeout. Using best available position:", bestPosition.coords.accuracy + "m");
                onSuccess(bestPosition);
            } else {
                onError("Unable to retrieve location. Please check your GPS signal.");
            }
        };

        // Watch for 6 seconds to allow GPS warm-up
        watchId = navigator.geolocation.watchPosition(onPosition, (err) => console.warn(err), {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        });

        timeoutId = setTimeout(onTimeout, 6000);
    };

    // 5. Actions
    const handleCheckIn = () => {
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

        const proceedCheckIn = async (pos) => {
            const { latitude, longitude } = pos.coords;
            setLocationCoords({ latitude, longitude });

            // Resolve Address
            const address = await fetchAddress(latitude, longitude);

            const now = new Date();
            setIsCheckedIn(true);
            setCheckInTime(now);
            setLocationAddress(address);
            setCheckOutTime(null);
            setLastActivityTime(now);

            localStorage.setItem('isActiveCheckIn', 'true');
            localStorage.setItem('checkInTime', now.toISOString());
            localStorage.setItem('checkInLocation', address);

            logActivity({
                action: "CHECK_IN",
                details: `Checked In from ${address}`,
                latitude,
                longitude
            });
            setLocating(false);
        };

        const defaultPos = { coords: { latitude: 12.9165, longitude: 79.1325 } };

        setLocating(true);
        getPreciseLocation(
            (pos) => proceedCheckIn(pos),
            (err) => {
                console.warn("Location failed, using default:", err);
                proceedCheckIn(defaultPos);
            });
    };

    const handleCheckOut = (auto = false) => {
        setLocating(true);

        const defaultPos = { coords: { latitude: 12.9165, longitude: 79.1325 } };

        const proceedCheckOut = async (pos) => {
            const { latitude, longitude } = pos.coords;
            const address = await fetchAddress(latitude, longitude);
            processCheckOut(auto, { latitude, longitude, address });
            setLocating(false);
        };

        getPreciseLocation(
            (pos) => proceedCheckOut(pos),
            (err) => {
                console.warn("Logout location failed or timed out", err);
                proceedCheckOut(defaultPos);
            }
        );
    };

    const processCheckOut = (auto, locationData) => {
        const now = new Date();
        setIsCheckedIn(false);
        setCheckOutTime(now);

        localStorage.removeItem('isActiveCheckIn');
        localStorage.removeItem('checkInTime');
        localStorage.removeItem('checkInLocation');

        let durationStr = "00:00:00";
        if (checkInTime) {
            const diff = now - checkInTime;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            durationStr = `${h}h ${m}m`;
        }

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
    };

    const formatTime = (date) => {
        if (!date) return "--:--";
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Render Content based on Tab
    const renderContent = () => {
        switch (activeTab) {
            case 'permissions':
                return <MyPermissions isEmbedded={true} />;
            case 'activity':
                return <MyActivityLogs />;
            case 'attendance':
            default:
                return (
                    <div className="row g-3 mb-4">
                        {/* Status Overview Row */}
                        <div className="col-md-4">
                            {/* Today's Status Card - Compact */}
                            <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                                <div className="card-header bg-transparent border-0 pt-3 px-3">
                                    <h6 className="card-title mb-0 small text-uppercase fw-bold text-muted">Today's Status</h6>
                                </div>
                                <div className="card-body px-3 pb-3 d-flex flex-column justify-content-center">
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <div className="text-center">
                                            {isCheckedIn ?
                                                <i className="bi bi-check-circle-fill text-success fs-1"></i> :
                                                <i className="bi bi-circle text-muted fs-1"></i>
                                            }
                                            <div className={`fw-bold small mt-1 ${isCheckedIn ? "text-success" : "text-muted"}`}>
                                                {isCheckedIn ? "Checked In" : "Not Checked In"}
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <h2 className="fw-bold mb-0 display-6" style={{ color: 'var(--text-main)' }}>
                                                {formatTime(checkInTime || (isCheckedIn ? currentTime : null))}
                                            </h2>
                                            <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>Check In Time</small>
                                        </div>
                                    </div>

                                    <div className="p-2 rounded bg-light border mb-3 small d-flex align-items-center justify-content-between">
                                        <div className="text-truncate" style={{ maxWidth: '180px' }} title={locationAddress}>
                                            <i className="bi bi-geo-alt me-2 text-primary"></i>
                                            <span className="text-muted">{locationAddress === "Fetching location..." && !isCheckedIn ? "--" : locationAddress}</span>
                                        </div>
                                        {isCheckedIn && locationCoords && (
                                            <a href={`https://www.google.com/maps?q=${locationCoords.latitude},${locationCoords.longitude}`} target="_blank" rel="noreferrer" className="text-primary smaller">Map</a>
                                        )}
                                    </div>

                                    <div className="row g-2 text-center small">
                                        <div className="col-4">
                                            <div className="p-2 bg-light border rounded">
                                                <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{formatTime(checkInTime)}</div>
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>In</div>
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="p-2 bg-light border rounded">
                                                <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{formatTime(checkOutTime)}</div>
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>Out</div>
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="p-2 bg-light border rounded">
                                                <div className="text-primary fw-bold">
                                                    {isCheckedIn ? (() => {
                                                        const diff = currentTime - checkInTime;
                                                        const h = Math.floor(diff / 3600000);
                                                        const m = Math.floor((diff % 3600000) / 60000);
                                                        return `${h}h ${m}m`;
                                                    })() : "--"}
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>Hrs</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-8">
                            {/* Monthly Summary - Grid Compact */}
                            <div className="card h-100 border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                                <div className="card-header bg-transparent border-0 pt-3 px-3">
                                    <h6 className="card-title mb-0 small text-uppercase fw-bold text-muted">Summary - {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}</h6>
                                </div>
                                <div className="card-body px-3 pb-3">
                                    <div className="row g-2 h-100">
                                        <div className="col-sm-6 col-md-3">
                                            <div className="h-100 p-3 rounded-3 text-center d-flex flex-column justify-content-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                                <h3 className="text-success fw-bold mb-0">{stats.presentDays}</h3>
                                                <small className="text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Present</small>
                                            </div>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <div className="h-100 p-3 rounded-3 text-center d-flex flex-column justify-content-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                                <h3 className="text-primary fw-bold mb-0">{stats.totalHours}</h3>
                                                <small className="text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Total Hours</small>
                                            </div>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <div className="h-100 p-3 rounded-3 text-center d-flex flex-column justify-content-center" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                                                <h3 className="fw-bold mb-0" style={{ color: '#a855f7' }}>{stats.avgHours}</h3>
                                                <small className="text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Avg Hrs/Day</small>
                                            </div>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <div className="h-100 p-3 rounded-3 text-center d-flex flex-column justify-content-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                                <h3 className="text-warning fw-bold mb-0">{stats.pendingRequests}</h3>
                                                <small className="text-muted text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>Pending</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {inactivityWarning && (
                            <div className="col-12">
                                <div className="alert alert-warning d-flex align-items-center justify-content-between shadow-sm border-0" role="alert" style={{ backgroundColor: '#ffdb4d', color: '#664d03' }}>
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                                        <div>
                                            <h6 className="fw-bold mb-0">Inactivity Detected</h6>
                                            <small>Logging alert to HR...</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Attendance History Table - Compact */}
                        <div className="col-12">
                            <div className="card border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                                <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                                    <h6 className="card-title mb-0 small text-uppercase fw-bold text-muted">Attendance History</h6>
                                    <div className="d-flex gap-2">
                                        <select className="form-select form-select-sm bg-dark text-white border-secondary py-0" style={{ fontSize: '0.8rem' }}>
                                            <option>{new Date().toLocaleString('default', { month: 'long' })}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="card-body p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover mb-0 align-middle small">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="ps-4">Date</th>
                                                    <th>Status</th>
                                                    <th>Check In</th>
                                                    <th>Check Out</th>
                                                    <th>Work Hours</th>
                                                    <th className="text-end pe-4">Location</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attendanceHistory.length > 0 ? attendanceHistory.map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td className="ps-4">{row.date}</td>
                                                        <td><span className="badge bg-success bg-opacity-75" style={{ fontSize: '0.7em' }}>{row.status}</span></td>
                                                        <td>{row.checkIn}</td>
                                                        <td>{row.checkOut}</td>
                                                        <td>{row.workHours}</td>
                                                        <td className="text-end pe-4">
                                                            {row.latitude && row.longitude ? (
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="btn btn-sm btn-link text-info p-0"
                                                                    style={{ fontSize: '0.8rem' }}
                                                                    title="View on Google Maps"
                                                                >
                                                                    <i className="bi bi-geo-alt-fill me-1"></i>View Map
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>No Loc</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="6" className="text-center py-3 text-muted">No attendance activity found for this month.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-main)' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1 fw-bold">My Attendance</h2>
                    <p className="text-muted mb-0">Track your daily attendance, permissions, and activity.</p>
                </div>
                <div className="d-flex gap-3">
                    {!isCheckedIn ? (
                        <button className="btn btn-primary px-4" onClick={handleCheckIn} disabled={locating}>
                            {locating ? <><span className="spinner-border spinner-border-sm me-2"></span>Locating...</> : <><i className="bi bi-play-circle me-2"></i> Check In</>}
                        </button>
                    ) : (
                        <button className="btn btn-outline-danger px-4" onClick={() => setShowDailyWorkModal(true)} disabled={locating}>
                            {locating ? <><span className="spinner-border spinner-border-sm me-2"></span>Locating...</> : <><i className="bi bi-stop-circle me-2"></i> Check Out</>}
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <ul className="nav nav-pills mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'attendance' ? 'active bg-primary' : 'text-dark'}`}
                        onClick={() => setActiveTab('attendance')}
                    >
                        <i className="bi bi-calendar-check me-2"></i>Attendance
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'permissions' ? 'active bg-primary' : 'text-dark'}`}
                        onClick={() => setActiveTab('permissions')}
                    >
                        <i className="bi bi-file-earmark-text me-2"></i>Permission Requests
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'activity' ? 'active bg-primary' : 'text-dark'}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        <i className="bi bi-mouse me-2"></i>Activity Tracker
                    </button>
                </li>
            </ul>

            {/* Tab Content */}
            {renderContent()}

            {/* Daily Work Checkout Modal */}
            <DailyWorkCheckoutModal
                isOpen={showDailyWorkModal}
                onClose={() => setShowDailyWorkModal(false)}
                onConfirmCheckout={() => handleCheckOut(false)}
                checkInTime={checkInTime}
                locationAddress={locationAddress}
            />
        </div>
    );
};

export default MyAttendance;
