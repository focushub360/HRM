import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import SalesTasks from './SalesTasks';
import SalesVisits from './SalesVisits';
import SalesLeads from './SalesLeads';

const SalesManagement = () => {
    const { user, getCompanyActivities } = useAuth();
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('overview');
    const [salesTeam, setSalesTeam] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Sales Team Data (Live Status)
    useEffect(() => {
        fetchSalesTeamStatus(); // Initial fetch
        const interval = setInterval(() => {
            if (activeTab === 'overview') {
                fetchSalesTeamStatus();
            }
        }, 5000); // Poll every 5 seconds for LIVE status
        return () => clearInterval(interval);
    }, [activeTab, user]);

    const fetchSalesTeamStatus = async () => {
        if (salesTeam.length === 0) setLoading(true); // Only show loader on first load to prevent flickering
        try {
            // 1. Fetch Employees
            const empRes = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/companies/${user.companyId}/employees`);
            if (!empRes.ok) throw new Error("Failed to fetch employees");
            const allEmps = await empRes.json();

            // Filter for Sales
            const salesEmps = allEmps.filter(e => e.employeeType === 'sales');

            // 2. Fetch Today's Activity for Live Status
            const activities = await getCompanyActivities(user.companyId);
            const todayStr = new Date().toISOString().split('T')[0];
            const todayLogs = activities?.filter(log => new Date(log.timestamp).toISOString().split('T')[0] === todayStr) || [];

            // 3. Merge Data
            const teamWithStatus = salesEmps.map(emp => {
                // Find latest log
                const empLogs = todayLogs.filter(l => l.userId === emp.empId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                const lastLog = empLogs[0];
                const visitCount = empLogs.filter(l => l.action === 'CLIENT_VISIT').length;
                const leadCount = empLogs.filter(l => l.action === 'LEAD_CREATED').length;

                return {
                    ...emp,
                    status: lastLog ? (lastLog.action === 'CHECK_OUT' || lastLog.action === 'LOGOUT' ? 'Offline' : 'Active') : 'Offline',
                    lastLocation: lastLog?.address || (lastLog?.latitude ? 'GPS Logged' : 'Unknown'),
                    lastActive: lastLog?.timestamp,
                    visitsToday: visitCount,
                    leadsToday: leadCount
                };
            });

            setSalesTeam(teamWithStatus);

        } catch (error) {
            console.error("Error fetching sales status:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderOverview = () => (
        <div className="row g-4">
            {loading ? (
                <div className="col-12 text-center py-4">
                    <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
                </div>
            ) : (
                salesTeam.map(emp => (
                    <div key={emp.id} className="col-md-6 col-xl-4">
                        <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: theme === 'dark' ? '#111827' : '#fff' }}>
                            <div className="card-body" style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="bg-light rounded-circle p-3 me-3 text-primaryfw-bold h4 mb-0">
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h5 className="mb-0 fw-bold">{emp.name}</h5>
                                        <small className="text-muted">{emp.designation || 'Sales Executive'}</small>
                                    </div>
                                    <div className="ms-auto">
                                        <span className={`badge ${emp.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                                            {emp.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-between mb-2 small text-muted">
                                    <span><i className="bi bi-geo-alt me-1"></i>Last Loc:</span>
                                    <span className={`${theme === 'dark' ? 'text-light' : 'text-dark'} text-truncate`} style={{ maxWidth: '150px' }} title={emp.lastLocation}>
                                        {emp.lastLocation}
                                    </span>
                                </div>
                                <div className="d-flex justify-content-between mb-3 small text-muted">
                                    <span><i className="bi bi-clock me-1"></i>Last Sync:</span>
                                    <span className={`${theme === 'dark' ? 'text-light' : 'text-dark'}`}>
                                        {emp.lastActive ? new Date(emp.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                    </span>
                                </div>

                                <div className={`row g-2 text-center ${theme === 'dark' ? 'bg-secondary' : 'bg-light'} rounded mt-2 py-2 mx-0`}>
                                    <div className="col-6 border-end">
                                        <h5 className="mb-0 fw-bold text-primary">{emp.visitsToday}</h5>
                                        <small className="text-muted" style={{ fontSize: '0.7em' }}>VISITS TODAY</small>
                                    </div>
                                    <div className="col-6">
                                        <h5 className="mb-0 fw-bold text-info">{emp.leadsToday}</h5>
                                        <small className="text-muted" style={{ fontSize: '0.7em' }}>LEADS TODAY</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )))}
            {salesTeam.length === 0 && !loading && (
                <div className="col-12 text-center text-muted py-5">
                    No Sales Employees found.
                </div>
            )}
        </div>
    );

    return (
        <div className={`container-fluid pb-3 ${theme === 'dark' ? 'bg-dark' : 'bg-light'}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '60px', backgroundColor: theme === 'dark' ? '#1a1f37' : '#f8f9fa' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-shrink-0">
                <div className="d-flex align-items-center gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <h2 className="mb-0 fw-bold text-primary">Sales Management Dashboard</h2>
                            <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: '0.7rem' }}>
                                <span className="rounded-circle bg-white" style={{ width: '6px', height: '6px' }}></span>
                                LIVE
                            </span>
                        </div>
                        <p className="text-muted mb-0">Monitor field team, assign tasks, and track performance.</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <ul className={`nav nav-pills mb-3 ${theme === 'dark' ? 'bg-dark' : 'bg-white'} p-1 rounded shadow-sm d-inline-flex flex-shrink-0`}>
                <li className="nav-item">
                    <button
                        className={`nav-link px-4 ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <i className="bi bi-people-fill me-2"></i>Overview
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link px-4 ${activeTab === 'visits' ? 'active' : ''}`}
                        onClick={() => setActiveTab('visits')}
                    >
                        <i className="bi bi-geo-alt-fill me-2"></i>Visits
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link px-4 ${activeTab === 'leads' ? 'active' : ''}`}
                        onClick={() => setActiveTab('leads')}
                    >
                        <i className="bi bi-funnel-fill me-2"></i>Leads
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link px-4 ${activeTab === 'tasks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tasks')}
                    >
                        <i className="bi bi-list-task me-2"></i>Tasks
                    </button>
                </li>
            </ul>

            {/* Content Area */}
            <div className="flex-grow-1" style={{ overflowY: 'auto', minHeight: 0 }}>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'visits' && <SalesVisits />}
                {activeTab === 'leads' && <SalesLeads />}
                {activeTab === 'tasks' && <SalesTasks />}
            </div>
        </div >
    );
};

export default SalesManagement;
