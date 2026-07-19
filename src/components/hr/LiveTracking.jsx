import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import io from 'socket.io-client';

const LiveTracking = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState({});
    const [socket, setSocket] = useState(null);

    const [myEmployeeIds, setMyEmployeeIds] = useState(new Set());

    // Fecth "My Employees" to filter the socket stream
    useEffect(() => {
        const fetchMyEmployees = async () => {
            if (!user?.companyId || !user?.id) return;
            // If Company Admin, maybe see all? User said "same company other hr doesnt have access".
            // I will assume Company Admin sees all, but HR sees only theirs.
            // Actually user said "hr who is creating ... are head ... other hr cannt".
            // If I am 'hr', I filter.
            let url = `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}`}'}/companies/${user.companyId}/employees`;
            if (user.type === 'hr') {
                url += `?hrId=${user.id}`;
            }

            try {
                const res = await fetch(url);
                const data = await res.json();
                if (Array.isArray(data)) {
                    // Store IDs (check if matches socket userId which is usually empId string or db ID)
                    // Electron app usually sends 'id' or 'empId'.
                    // Let's assume matches one of them. Storing both to be safe.
                    const ids = new Set(data.flatMap(e => [String(e.id), e.empId]));
                    setMyEmployeeIds(ids);
                }
            } catch (err) {
                console.error("Failed to fetch my employees", err);
            }
        };

        fetchMyEmployees();
    }, [user]);

    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
        setSocket(newSocket);

        // Join company room
        if (user && user.companyId) {
            newSocket.emit('join-company-room', user.companyId);
        }

        newSocket.on('employee-update', (data) => {
            // data: { userId, ... }
            // Filter: Only update if this employee belongs to me (or I am Admin)
            const isMine = user.type === 'company' || myEmployeeIds.has(String(data.userId));

            if (isMine) {
                setEmployees(prev => ({
                    ...prev,
                    [data.userId]: data
                }));
            }
        });

        return () => newSocket.close();
    }, [user, myEmployeeIds]);

    // Clean up stale data (e.g., no update for 1 min -> Offline)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setEmployees(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(key => {
                    const emp = next[key];
                    if (now - new Date(emp.timestamp).getTime() > 60000) {
                        // Mark as offline or remove? Let's just mark offline visually if needed, or remove.
                        // For now, let's keep them but maybe gray out.
                    }
                });
                return next;
                // Functionally we aren't changing state here effectively unless we add an offline flag
            });
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container-fluid p-4">
            <div className="d-flex align-items-center gap-3 mb-4">
                <h2 className="mb-0 text-primary fw-bold"><i className="bi bi-broadcast me-2"></i>Live Employee Tracking</h2>
                <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: '0.8rem', height: 'fit-content', padding: '0.4rem 0.6rem' }}>
                    <span className="rounded-circle bg-white" style={{ width: '6px', height: '6px' }}></span>
                    STREAMING
                </span>
            </div>

            <div className="row">
                {Object.keys(employees).length === 0 ? (
                    <div className="col-12 text-center text-muted">
                        <h4>No active employees tracking right now.</h4>
                        <p>Employees effectively appear here when they have the desktop tracker running.</p>
                    </div>
                ) : (
                    Object.values(employees).map(emp => {
                        const isIdle = emp.idleTime > 60; // Idle if no input for 60s
                        const lastSeen = new Date(emp.timestamp).getTime();
                        const isOffline = Date.now() - lastSeen > 60000; // Offline if no signal for 1 min

                        return (
                            <div key={emp.userId} className="col-md-4 col-lg-3 mb-4">
                                <div className={`card h-100 shadow-sm border-0 ${isOffline ? 'bg-light' : ''}`}>
                                    <div className="card-body">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3 ${isOffline ? 'bg-secondary' : isIdle ? 'bg-warning' : 'bg-success'}`} style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                                                {emp.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-0">{emp.userName}</h5>
                                                <small className={isOffline ? 'text-muted' : isIdle ? 'text-warning' : 'text-success'}>
                                                    {isOffline ? 'Offline' : isIdle ? 'Idle' : 'Active'}
                                                </small>
                                            </div>
                                        </div>

                                        <div className="small text-muted mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span><i className="bi bi-app me-1"></i>App:</span>
                                                <strong className="text-black">{emp.activeWindow?.owner?.name || 'Unknown'}</strong>
                                            </div>
                                            <div className="mt-1" style={{ lineHeight: '1.2' }}>
                                                <i className="bi bi-window me-1"></i>
                                                <span className="text-dark" title={emp.activeWindow?.title}>
                                                    {emp.activeWindow?.title ? (emp.activeWindow.title.length > 50 ? emp.activeWindow.title.substring(0, 50) + '...' : emp.activeWindow.title) : 'No Window Title'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="small text-muted">
                                            <i className="bi bi-clock-history me-2"></i>
                                            Idle: {emp.idleTime}s
                                        </div>
                                    </div>
                                    <div className="card-footer bg-transparent border-0 text-end">
                                        <small className="text-muted" style={{ fontSize: '0.7em' }}>
                                            Last update: {new Date(emp.timestamp).toLocaleTimeString()}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LiveTracking;
