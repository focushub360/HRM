import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Link, Navigate } from "react-router-dom";

const HRLeaveManagement = () => {
    const { user, companies, leaveRequests, updateLeaveStatus, hasPermission } = useAuth();
    const [selectedCompany, setSelectedCompany] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const isSuperAdmin = !user?.companyId;

    if (!user || (user.type !== 'company' && user.type !== 'hr' && !hasPermission('manage_leaves'))) {
        return <Navigate to="/" replace />;
    }

    // Latest submitted request first: sort by true submission time.
    // Priority: requestDate (stamped by backend on create) > createdAt (if present)
    // > timestamp embedded in the Mongo ObjectId > leave date (last-resort fallback).
    const getSortKey = (r) => {
        const ts = r.requestDate || r.createdAt || r.submittedAt || r.createdOn;
        if (ts) return new Date(ts).getTime();
        if (typeof r.id === 'string' && /^[0-9a-fA-F]{24}$/.test(r.id)) {
            // First 8 hex chars of a Mongo ObjectId are a 4-byte creation timestamp (seconds)
            return parseInt(r.id.substring(0, 8), 16) * 1000;
        }
        return new Date(r.date || r.startDate).getTime();
    };

    const filteredRequests = useMemo(() => {
        let reqs = leaveRequests || [];
        return reqs
            .filter(req => {
                const companyMatch = !selectedCompany || req.companyId === parseInt(selectedCompany) || req.companyId === selectedCompany;
                const statusMatch = filterStatus === 'All' || req.status === filterStatus;

                let dateMatch = true;
                if (startDate) {
                    dateMatch = dateMatch && new Date(req.date) >= new Date(startDate);
                }
                if (endDate) {
                    dateMatch = dateMatch && new Date(req.date) <= new Date(endDate);
                }

                return companyMatch && statusMatch && dateMatch;
            })
            .sort((a, b) => getSortKey(b) - getSortKey(a));
    }, [leaveRequests, selectedCompany, filterStatus, startDate, endDate]);

    const employeesOnLeaveToday = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return (leaveRequests || []).filter(req => Number(req.companyId) === Number(user.companyId || selectedCompany || req.companyId) && req.status === 'Approved' && req.date === today);
    }, [leaveRequests, user.companyId, selectedCompany]);

    const handleAction = async (id, newStatus) => {
        if (window.confirm(`Are you sure you want to ${newStatus} this request?`)) {
            await updateLeaveStatus(id, newStatus);
            // Alert handled by result or UI update
        }
    };

    return (
        <div className="container-fluid py-4" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    {/* Back button logic if needed, but usually HR is already in dashboard context */}
                    <Link to="/" className="btn btn-outline-secondary mb-3">
                        <i className="bi bi-arrow-left"></i> Back to Dashboard
                    </Link>
                    <h2 className="mb-0 fw-bold">Leave Management 🏖️</h2>
                    <p className="text-muted">Manage leave requests for Employees</p>
                </div>

                <div className="d-flex gap-2">
                    {/* Company Filter */}
                    {isSuperAdmin && (
                        <select className="form-select" style={{ width: '200px' }} value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                            <option value="">-- All Companies --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Who is on Leave Today Section */}
            {employeesOnLeaveToday.length > 0 && (
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white py-3">
                        <h5 className="mb-0 text-primary fw-bold"><i className="bi bi-calendar-event me-2"></i> Who is Absent Today?</h5>
                    </div>
                    <div className="card-body">
                        <div className="d-flex flex-wrap gap-3">
                            {employeesOnLeaveToday.map(req => (
                                <div key={req.id} className="badge bg-light text-dark border p-3 d-flex align-items-center gap-3">
                                    <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center fw-bold text-uppercase" style={{ width: 40, height: 40 }}>
                                        {req.userName?.charAt(0)}
                                    </div>
                                    <div className="text-start">
                                        <div className="fs-6">{req.userName}</div>
                                        <div className="small text-muted">{req.type} ({req.duration})</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Row */}
            <div className="row g-3 mb-4 align-items-end">
                <div className="col-md-6">
                    <label className="form-label small fw-bold text-muted">Filter by Status</label>
                    <ul className="nav nav-pills nav-fill bg-light p-1 rounded border">
                        {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
                            <li className="nav-item" key={status}>
                                <button
                                    className={`nav-link small fw-bold ${filterStatus === status ? 'active bg-white text-primary shadow-sm' : 'text-muted'}`}
                                    onClick={() => setFilterStatus(status)}
                                    style={{ borderRadius: '6px', transition: 'all 0.2s' }}
                                >
                                    {status}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="col-md-3">
                    <label className="form-label small fw-bold text-muted">From Date</label>
                    <input
                        type="date"
                        className="form-control border-secondary border-opacity-25"
                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', colorScheme: 'light' }}
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    />
                </div>
                <div className="col-md-3">
                    <label className="form-label small fw-bold text-muted">To Date</label>
                    <input
                        type="date"
                        className="form-control border-secondary border-opacity-25"
                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', colorScheme: 'light' }}
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    />
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                    <h5 className="mb-0 fw-bold text-primary">Leave Requests ({filteredRequests.length})</h5>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Employee</th>
                                    <th>Type</th>
                                    <th>Date/Time</th>
                                    <th style={{ width: '25%' }}>Reason / Note</th>
                                    <th>Status</th>
                                    <th>Approved By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((req) => {
                                    return (
                                        <tr key={req.id}>
                                            <td className="fw-bold">
                                                <div className="d-flex flex-column">
                                                    <span>{req.userName || 'Unknown'}</span>
                                                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>{req.empId}</small>
                                                </div>
                                            </td>
                                            <td><span className="badge bg-info text-dark">{req.type}</span></td>
                                            <td>
                                                <div className="small">{new Date(req.date).toLocaleDateString()}</div>
                                                <div className="small text-muted">{req.startTime} - {req.endTime} ({req.duration})</div>
                                            </td>
                                            <td>
                                                <div className="text-wrap" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                                    {req.reason}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${req.status === 'Approved' ? 'bg-success' :
                                                    req.status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td>
                                                {req.status !== 'Pending' ? (
                                                    <div className="small">
                                                        <i className="bi bi-person-check me-1"></i>
                                                        {req.approverName || req.approverId || 'HR'}
                                                    </div>
                                                ) : <span className="text-muted">-</span>}
                                            </td>
                                            <td>
                                                {req.status === 'Pending' ? (
                                                    <div className="btn-group">
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleAction(req.id, 'Approved')}
                                                            title="Approve"
                                                        >
                                                            <i className="bi bi-check-lg"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleAction(req.id, 'Rejected')}
                                                            title="Reject"
                                                        >
                                                            <i className="bi bi-x-lg"></i>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small">Done</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5 text-muted">No leave requests found for selected criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRLeaveManagement;