import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { io } from 'socket.io-client';
import { FaMapMarkerAlt, FaUser, FaCalendarAlt, FaClock, FaTrash } from 'react-icons/fa';
import RouteTimeline from './RouteTimeline';

const SalesVisits = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [visits, setVisits] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState([]);

    // Filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [totalDistance, setTotalDistance] = useState(0);

    useEffect(() => {
        const init = async () => {
            await fetchEmployees();
            await fetchVisits(true); // Initial load with spinner
        };
        init();
    }, [user]);

    // Socket.io for Real-time Updates
    useEffect(() => {
        const socket = io(import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hrms-backend-22uq.onrender.com'));

        socket.emit('join-company-room', user.companyId);

        socket.on('visit-logged', (newVisit) => {
            console.log("New visit received via socket:", newVisit);
            // Only add to list if it matches today's date filter
            if (newVisit.timestamp && newVisit.timestamp.slice(0, 10) === selectedDate) {
                // If an employee is selected, check if it matches
                if (!selectedEmployee || newVisit.userId === selectedEmployee) {
                    setVisits(prev => {
                        // Avoid duplicates if polling also hit it
                        if (prev.find(v => v.id === newVisit.id)) return prev;
                        return [newVisit, ...prev].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    });

                    // If this employee is selected, update their route too
                    if (selectedEmployee === newVisit.userId) {
                        fetchRoute(false);
                    }
                }
            }
        });

        return () => socket.disconnect();
    }, [user, selectedDate, selectedEmployee]);

    // Re-fetch when filters change & Polling fallback
    useEffect(() => {
        fetchVisits(true);
        if (selectedEmployee) {
            fetchRoute(true);
            fetchStats();
        } else {
            setTotalDistance(0);
        }

        const interval = setInterval(() => {
            fetchVisits(false);
            if (selectedEmployee) {
                fetchRoute(false);
                fetchStats();
            }
        }, 8000);

        return () => clearInterval(interval);
    }, [selectedDate, selectedEmployee]);

    const fetchStats = async () => {
        if (!selectedEmployee) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/gps/stats/${selectedEmployee}?date=${selectedDate}`);
            if (res.ok) {
                const data = await res.json();
                setTotalDistance(data.totalDistance || 0);
            }
        } catch (e) { console.error("Stats fetch failed", e); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/companies/${user.companyId}/employees`);
            if (res.ok) setEmployees(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchVisits = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            let url = `${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/visits/${user.companyId}`;
            const response = await fetch(url);
            if (response.ok) {
                let data = await response.json();

                // Filter by Date (Robust YYYY-MM-DD)
                data = data.filter(v => v.timestamp && v.timestamp.slice(0, 10) === selectedDate);

                // Filter by Employee
                if (selectedEmployee) {
                    data = data.filter(v => v.userId === selectedEmployee);
                }

                setVisits(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
            }
        } catch (error) {
            console.error("Failed to fetch visits", error);
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const fetchRoute = async (showLoader = false) => {
        if (!selectedEmployee) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/gps/route/${selectedEmployee}`);
            if (res.ok) {
                let data = await res.json();
                data = data.filter(p => p.timestamp && p.timestamp.slice(0, 10) === selectedDate);
                setRoute(data);
            }
        } catch (e) { console.error("Route fetch failed", e); }
    };

    const handleDeleteVisit = async (visitId) => {
        if (!window.confirm('Are you sure you want to delete this visit log?')) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/visits/${visitId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setVisits(prev => prev.filter(v => v.id !== visitId));
            } else {
                alert('Failed to delete visit');
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    return (
        <div className={`container-fluid py-3 ${theme === 'dark' ? 'text-light' : 'text-dark'}`} style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                    <h2 className="fw-bold mb-0">Field Activity Timeline</h2>
                    {selectedEmployee && (
                        <span className="badge bg-info text-dark rounded-pill py-2 px-3">
                            <FaMapMarkerAlt className="me-2" />
                            Total Travel Today: <strong>{totalDistance.toFixed(2)} KM</strong>
                        </span>
                    )}
                </div>
                <div className="d-flex gap-2">
                    <input
                        type="date"
                        className="form-control"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                    <select
                        className="form-select"
                        style={{ minWidth: '200px' }}
                        value={selectedEmployee}
                        onChange={e => setSelectedEmployee(e.target.value)}
                    >
                        <option value="">Select Employee...</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.empId}>{e.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="row g-4 flex-grow-1" style={{ minHeight: 0 }}>
                {/* Left: Timeline List */}
                <div className="col-lg-4">
                    <div className={`card shadow-sm border-0 h-100 ${theme === 'dark' ? 'bg-dark' : 'bg-white'}`} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className={`card-header border-0 py-3 ${theme === 'dark' ? 'bg-dark' : 'bg-white'}`}>
                            <h5 className="mb-0 fw-bold text-primary">Daily Activity</h5>
                        </div>
                        <div className="card-body p-0 overflow-auto" style={{ flex: 1, overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center p-4">Loading...</div>
                            ) : visits.length === 0 ? (
                                <div className="text-center p-5 text-muted">
                                    <div className="mb-2"><FaCalendarAlt size={30} /></div>
                                    <p>No visits.</p>
                                </div>
                            ) : (
                                <ul className="list-group list-group-flush timeline-list">
                                    {visits.map((visit, index) => (
                                        <li key={visit.id} className="list-group-item border-0 ps-4 py-3 position-relative">
                                            {/* Timeline Line */}
                                            <div className="position-absolute h-100 border-start border-2 border-primary" style={{ left: '20px', top: '0', zIndex: 0 }}></div>
                                            {/* Timeline Dot */}
                                            <div className="position-absolute bg-white border border-2 border-primary rounded-circle"
                                                style={{ width: '12px', height: '12px', left: '15px', top: '24px', zIndex: 1 }}></div>

                                            <div className={`card border-0 shadow-sm ${theme === 'dark' ? 'bg-secondary' : 'bg-light'}`}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <strong className={`${theme === 'dark' ? 'text-light' : 'text-dark'}`}>{new Date(visit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                                        <span className="badge bg-primary rounded-pill">Visit</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                                        <h6 className="card-title fw-bold mb-0 text-primary">{visit.clientName}</h6>
                                                        <button
                                                            className="btn btn-link text-danger p-0 border-0"
                                                            onClick={() => handleDeleteVisit(visit.id)}
                                                            title="Delete Visit"
                                                        >
                                                            <FaTrash size={14} />
                                                        </button>
                                                    </div>
                                                    <p className="card-text small text-muted mb-1">{visit.notes}</p>
                                                    {visit.image && (
                                                        <div className="mb-2">
                                                            <img
                                                                src={visit.image}
                                                                alt="Visit Selfie"
                                                                className="rounded shadow-sm"
                                                                style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', cursor: 'pointer' }}
                                                                onClick={() => window.open(visit.image, '_blank')}
                                                            />
                                                        </div>
                                                    )}
                                                    {visit.address && (
                                                        <div className="text-primary small mb-2" style={{ fontSize: '0.8rem' }}>
                                                            <FaMapMarkerAlt className="me-1" /> {visit.address}
                                                        </div>
                                                    )}
                                                    <div className="d-flex align-items-center text-muted small">
                                                        <FaUser className="me-1" /> {visit.userName}
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Map View */}
                <div className="col-lg-8">
                    <div className={`card shadow-sm border-0 h-100 ${theme === 'dark' ? 'bg-dark' : 'bg-white'}`} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className={`card-header border-0 py-3 ${theme === 'dark' ? 'bg-dark' : 'bg-white'}`}>
                            <h5 className="mb-0 fw-bold text-primary">Route Map</h5>
                        </div>
                        <div className="card-body p-0 flex-grow-1 position-relative">
                            <div style={{ height: '100%', width: '100%' }}>
                                <RouteTimeline routePoints={route} visits={visits} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesVisits;
