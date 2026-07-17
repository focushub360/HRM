import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const AttendanceRegister = () => {
    const { user, getCompanyActivities, companies } = useAuth();
    const navigate = useNavigate();

    // Use local date for default to avoid UTC mismatches
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [activities, setActivities] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);

    // Update current time every second for "Live" work hours ticking
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.type !== 'hr' && user?.type !== 'company') {
                navigate('/');
                return;
            }

            // Only show loader on initial fetch, not polling
            if (activities.length === 0) setLoading(true);

            try {
                // 1. Fetch Activities
                const logs = await getCompanyActivities(user.companyId);
                setActivities(logs || []);
            } catch (error) {
                console.error("Failed to load attendance data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData(); // Initial load

        // Poll every 5 seconds for real-time updates (Increased frequency)
        const intervalId = setInterval(fetchData, 5000);

        return () => clearInterval(intervalId);
    }, [user, getCompanyActivities, navigate]);

    // Derived State: Attendance Register
    const attendanceData = useMemo(() => {
        if (!user?.companyId || !companies.length) return [];

        const currentCompany = companies.find(c => c.id === parseInt(user.companyId));
        if (!currentCompany) return [];

        const allEmployees = currentCompany.employeeAccounts || [];

        // Map to store daily status
        const statusMap = new Map(); // userId -> { checkIn, checkOut, status, location }

        // Filter logs for selected date
        const dailyLogs = activities.filter(log => {
            const logDate = new Date(log.timestamp).toLocaleDateString('en-CA');
            return logDate === selectedDate;
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Process Logs
        dailyLogs.forEach(log => {
            if (!statusMap.has(log.userId)) {
                statusMap.set(log.userId, {
                    checkIn: null,
                    checkOut: null,
                    location: null,
                    status: 'Absent'
                });
            }
            const entry = statusMap.get(log.userId);

            if (log.action === 'CHECK_IN' || log.action === 'LOGIN' || log.action === 'SESSION_START') {
                if (!entry.checkIn) {
                    entry.checkIn = new Date(log.timestamp);
                    entry.location = log.address || (log.latitude ? 'Map Location' : (log.details || 'Web Login'));
                    entry.status = 'Present';
                }
            } else if (log.action === 'CHECK_OUT' || log.action === 'AUTO_CHECK_OUT' || log.action === 'LOGOUT') {
                entry.checkOut = new Date(log.timestamp);
            }
        });

        // Combine with All Employees to show Absentees
        return allEmployees.map(emp => {
            const activity = statusMap.get(emp.empId) || statusMap.get(emp.id) || statusMap.get(String(emp.id)) || statusMap.get(emp.userId);

            let calculatedHours = '--';
            if (activity?.checkIn) {
                const endTime = activity.checkOut || currentTime; // Use LIVE currentTime if still active
                const diff = endTime - activity.checkIn;
                const hrs = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);

                // Show floating point for chart but readable string for table
                calculatedHours = {
                    display: `${hrs}h ${mins}m ${secs}s`,
                    value: (diff / (1000 * 60 * 60)).toFixed(2)
                };
            }

            const isActive = activity?.checkIn && !activity?.checkOut;
            const status = activity?.checkIn ? (activity.checkOut ? 'Offline' : 'Present') : 'Absent';

            return {
                id: emp.id,
                name: emp.name,
                email: emp.email,
                type: emp.employeeType || 'Office',
                status,
                checkIn: activity?.checkIn ? activity.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
                checkOut: activity?.checkOut ? activity.checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (activity?.checkIn ? 'Working Now' : '--:--'),
                location: activity?.location || '--',
                workHours: calculatedHours,
                isActive
            };
        });

    }, [activities, companies, user.companyId, selectedDate, currentTime]);


    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <h2 className="mb-0 fw-bold text-dark">Attendance Register</h2>
                        <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: '0.7rem' }}>
                            <span className="rounded-circle bg-white" style={{ width: '6px', height: '6px' }}></span>
                            LIVE
                        </span>
                    </div>
                    <p className="text-muted mb-0">Real-time daily attendance monitoring.</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                        onClick={() => {
                            setLoading(true);
                            getCompanyActivities(user.companyId).then(logs => {
                                setActivities(logs || []);
                                setLoading(false);
                            });
                        }}
                        title="Refresh Data"
                    >
                        <i className={`bi bi-arrow-clockwise ${loading ? 'spin-animation' : ''}`}></i>
                        {!loading && "Refresh"}
                    </button>
                    <div className="d-flex align-items-center gap-2">
                        <label className="fw-bold text-muted small mb-0">Select Date:</label>
                        <input
                            type="date"
                            className="form-control form-control-sm border-secondary border-opacity-25"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ colorScheme: 'light' }}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-success text-white">
                        <div className="card-body text-center">
                            <h3 className="fw-bold mb-0">{attendanceData.filter(e => e.status === 'Present').length}</h3>
                            <small className="text-white-50 text-uppercase fw-bold">Present Today</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-danger text-white">
                        <div className="card-body text-center">
                            <h3 className="fw-bold mb-0">{attendanceData.filter(e => e.status === 'Absent').length}</h3>
                            <small className="text-white-50 text-uppercase fw-bold">Absent</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm bg-info text-white">
                        <div className="card-body text-center">
                            <h3 className="fw-bold mb-0">{attendanceData.length}</h3>
                            <small className="text-white-50 text-uppercase fw-bold">Total Employees</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Register Table */}
            <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 border-0">
                    <h5 className="mb-0 fw-bold text-primary">Employee List</h5>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4 py-3">Employee Name</th>
                                    <th className="py-3">Type</th>
                                    <th className="py-3">Status</th>
                                    <th className="py-3">Check In</th>
                                    <th className="py-3">Check Out</th>
                                    <th className="py-3">Work Hours</th>
                                    <th className="py-3 pe-4 text-end">Last Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceData.length > 0 ? (
                                    attendanceData.map(emp => (
                                        <tr key={emp.id} className={emp.isActive ? 'bg-primary bg-opacity-10' : ''}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="fw-bold text-dark">{emp.name}</div>
                                                    {emp.isActive && (
                                                        <span className="badge bg-success border-0 pulse-slow p-0" style={{ width: '8px', height: '8px', borderRadius: '50%' }}></span>
                                                    )}
                                                </div>
                                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>{emp.email}</small>
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill ${emp.type === 'sales' ? 'bg-indigo' :
                                                    emp.type === 'wfh' ? 'bg-teal' : 'bg-secondary'
                                                    }`} style={{ backgroundColor: emp.type === 'sales' ? '#6610f2' : emp.type === 'wfh' ? '#20c997' : '#6c757d' }}>
                                                    {emp.type?.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                {emp.status === 'Present' ? (
                                                    <span className="badge bg-success-subtle text-success border border-success px-2">Present</span>
                                                ) : emp.status === 'Offline' ? (
                                                    <span className="badge bg-secondary-subtle text-secondary border border-secondary px-2">Offline</span>
                                                ) : (
                                                    <span className="badge bg-danger-subtle text-danger border border-danger px-2">Absent</span>
                                                )}
                                            </td>
                                            <td className="fw-bold text-dark">{emp.checkIn}</td>
                                            <td className="text-muted">{emp.checkOut}</td>
                                            <td className={`fw-bold ${emp.isActive ? 'text-success' : 'text-primary'}`}>{emp.workHours?.display || '--'}</td>
                                            <td className="text-end pe-4 text-muted small" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {emp.location}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">
                                            No employees found for this company.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Data Visualization Section */}
            {attendanceData.some(e => e.status === 'Present') && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white py-3">
                                <h5 className="mb-0 fw-bold text-primary"><i className="bi bi-bar-chart-fill me-2"></i>Working Hours Analysis</h5>
                            </div>
                            <div className="card-body">
                                <div style={{ height: '300px' }}>
                                    <Bar
                                        data={{
                                            labels: attendanceData.map(e => e.name),
                                            datasets: [
                                                {
                                                    label: 'Working Hours',
                                                    data: attendanceData.map(e => parseFloat(e.workHours?.value) || 0),
                                                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                                                    borderColor: 'rgba(59, 130, 246, 1)',
                                                    borderWidth: 1,
                                                    borderRadius: 4,
                                                },
                                            ],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    callbacks: {
                                                        label: (context) => `${context.raw} hrs`
                                                    }
                                                }
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    title: { display: true, text: 'Hours' }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceRegister;
