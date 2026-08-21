import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const MyPermissions = ({ isEmbedded = false }) => {
    const { user, leaveRequests, submitLeaveRequest } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, Pending, Approved, Rejected
    const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, Permission, Leave
    const [searchQuery, setSearchQuery] = useState('');

    // ---- Helpers for "future only" date/time validation ----
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const nowTimeStr = useMemo(() => {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }, []);

    // ---- Latest request first: sort by true submission time ----
    // Priority: requestDate (stamped by backend on create) > createdAt (if present)
    // > timestamp embedded in the Mongo ObjectId > leave date (last-resort fallback).
    const permissions = useMemo(() => {
        const getSortKey = (r) => {
            const ts = r.requestDate || r.createdAt || r.submittedAt || r.createdOn;
            if (ts) return new Date(ts).getTime();
            if (typeof r.id === 'string' && /^[0-9a-fA-F]{24}$/.test(r.id)) {
                // First 8 hex chars of a Mongo ObjectId are a 4-byte creation timestamp (seconds)
                return parseInt(r.id.substring(0, 8), 16) * 1000;
            }
            return new Date(r.date || r.startDate).getTime();
        };
        return [...(leaveRequests || [])].sort((a, b) => getSortKey(b) - getSortKey(a));
    }, [leaveRequests]);

    // Form State
    const [formData, setFormData] = useState({
        type: 'Short Leave',
        startDate: todayStr,
        endDate: todayStr,
        startTime: '09:00',
        endTime: '10:00',
        reason: ''
    });

    const requestTypes = [
        { id: 'short', label: 'Short Leave', category: 'Permission', desc: '1-3 hours for urgent work', icon: 'bi-clock-history', color: '#4f46e5', lightBg: 'rgba(79, 70, 229, 0.08)' },
        { id: 'late', label: 'Late Arrival', category: 'Permission', desc: 'Coming late to office', icon: 'bi-alarm', color: '#f59e0b', lightBg: 'rgba(245, 158, 11, 0.08)' },
        { id: 'early', label: 'Early Departure', category: 'Permission', desc: 'Leaving early from office', icon: 'bi-box-arrow-right', color: '#06b6d4', lightBg: 'rgba(6, 182, 212, 0.08)' },
        { id: 'sick', label: 'Sick Leave', category: 'Leave', desc: 'Medical reason (Full Day)', icon: 'bi-heart-pulse', color: '#ef4444', lightBg: 'rgba(239, 68, 68, 0.08)' },
        { id: 'casual', label: 'Casual Leave', category: 'Leave', desc: 'Personal matters (Full Day)', icon: 'bi-person-badge', color: '#10b981', lightBg: 'rgba(16, 185, 129, 0.08)' },
        { id: 'privileged', label: 'Privilege Leave', category: 'Leave', desc: 'Earned leave / Vacation', icon: 'bi-stars', color: '#8b5cf6', lightBg: 'rgba(139, 92, 246, 0.08)' },
    ];

    const isLeaveType = (typeLabel) => {
        const type = requestTypes.find(t => t.label === typeLabel);
        return type?.category === 'Leave';
    };

    const getTypeMeta = (typeLabel) => {
        return requestTypes.find(t => t.label === typeLabel) || {
            icon: 'bi-file-earmark-text',
            color: '#6366f1',
            category: isLeaveType(typeLabel) ? 'Leave' : 'Permission'
        };
    };

    // Stats
    const stats = {
        total: permissions.length,
        pending: permissions.filter(p => p.status === 'Pending').length,
        approved: permissions.filter(p => p.status === 'Approved').length,
        rejected: permissions.filter(p => p.status === 'Rejected').length,
    };

    // Filtered permissions list
    const filteredPermissions = useMemo(() => {
        return permissions.filter(p => {
            const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
            const itemCategory = isLeaveType(p.type) ? 'Leave' : 'Permission';
            const matchesCategory = categoryFilter === 'ALL' || itemCategory === categoryFilter;
            const matchesSearch = !searchQuery ||
                (p.type && p.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (p.reason && p.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (p.date && p.date.includes(searchQuery));

            return matchesStatus && matchesCategory && matchesSearch;
        });
    }, [permissions, statusFilter, categoryFilter, searchQuery]);

    // ---- Future-only validation before submit ----
    const validateFutureDateTime = () => {
        if (isLeaveType(formData.type)) {
            if (formData.startDate < todayStr) {
                alert("Start date cannot be in the past. Please choose today or a future date.");
                return false;
            }
            if (formData.endDate < formData.startDate) {
                alert("End date cannot be before the start date.");
                return false;
            }
        } else {
            if (formData.startDate < todayStr) {
                alert("Date cannot be in the past. Please choose today or a future date.");
                return false;
            }
            // If the permission is for today, the start time must not already have passed
            if (formData.startDate === todayStr && formData.startTime < nowTimeStr) {
                alert("Start time cannot be in the past. Please choose a future time.");
                return false;
            }
            if (formData.endTime <= formData.startTime) {
                alert("End time must be after the start time.");
                return false;
            }
        }
        return true;
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!validateFutureDateTime()) {
            return;
        }

        let duration = '';
        if (isLeaveType(formData.type)) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            duration = `${diffDays} Day(s)`;
        } else {
            const start = new Date(`2000-01-01T${formData.startTime}`);
            const end = new Date(`2000-01-01T${formData.endTime}`);
            const diff = (end - start) / (1000 * 60 * 60);
            duration = (isNaN(diff) || diff <= 0 ? 1 : diff).toFixed(1) + ' hours';
        }

        const newRequest = {
            ...formData,
            date: formData.startDate,
            duration: duration,
            createdAt: new Date().toISOString(),
        };

        const result = await submitLeaveRequest(newRequest);
        if (result) {
            setShowModal(false);
            alert("Request Submitted Successfully!");
        } else {
            alert("Failed to submit request.");
        }
    };

    return (
        <div className={`container-fluid ${!isEmbedded ? 'py-4' : 'p-0'}`} style={!isEmbedded ? { backgroundColor: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-main)' } : { color: 'var(--text-main)' }}>
            {/* Custom animations & polish */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.12) !important; }
            `}</style>

            {/* Header */}
            {!isEmbedded && (
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <div className="p-2 rounded-3" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}>
                                <i className="bi bi-calendar2-check-fill fs-5"></i>
                            </div>
                            <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>My Leaves & Permissions</h3>
                        </div>
                        <p className="text-muted mb-0 small">Submit time-off requests, short permissions, and track real-time HR approval statuses.</p>
                    </div>
                    <button
                        className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm"
                        onClick={() => setShowModal(true)}
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
                        }}
                    >
                        <i className="bi bi-plus-circle-fill"></i>
                        <span>New Request</span>
                    </button>
                </div>
            )}

            {isEmbedded && (
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="fw-bold text-muted small text-uppercase">Time-Off Records</span>
                    <button
                        className="btn btn-primary btn-sm px-3 fw-bold d-inline-flex align-items-center gap-1"
                        onClick={() => setShowModal(true)}
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '10px' }}
                    >
                        <i className="bi bi-plus-lg"></i>
                        <span>New Request</span>
                    </button>
                </div>
            )}

            {/* 4 Modern Gradient Stats Cards */}
            <div className="row g-3 mb-4">
                {/* Total Requests */}
                <div className="col-lg-3 col-md-6">
                    <div
                        className="card border-0 h-100 shadow-sm hover-lift cursor-pointer"
                        onClick={() => setStatusFilter('ALL')}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: statusFilter === 'ALL' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                            background: 'linear-gradient(135deg, var(--bg-card) 60%, rgba(99, 102, 241, 0.08) 100%)'
                        }}
                    >
                        <div className="card-body p-3 d-flex align-items-center gap-3">
                            <div
                                className="rounded-4 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                                style={{ width: '52px', height: '52px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}
                            >
                                <i className="bi bi-calendar3 fs-4"></i>
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Total Requests</span>
                                <h3 className="fw-bold mb-0 text-primary">{stats.total}</h3>
                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>All submitted forms</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending */}
                <div className="col-lg-3 col-md-6">
                    <div
                        className="card border-0 h-100 shadow-sm hover-lift cursor-pointer"
                        onClick={() => setStatusFilter('Pending')}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: statusFilter === 'Pending' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                            background: 'linear-gradient(135deg, var(--bg-card) 60%, rgba(245, 158, 11, 0.08) 100%)'
                        }}
                    >
                        <div className="card-body p-3 d-flex align-items-center gap-3">
                            <div
                                className="rounded-4 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                                style={{ width: '52px', height: '52px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                            >
                                <i className="bi bi-hourglass-split fs-4"></i>
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Pending Review</span>
                                <h3 className="fw-bold mb-0 text-warning">{stats.pending}</h3>
                                <small className="text-warning fw-semibold" style={{ fontSize: '0.75rem' }}>Awaiting HR action</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Approved */}
                <div className="col-lg-3 col-md-6">
                    <div
                        className="card border-0 h-100 shadow-sm hover-lift cursor-pointer"
                        onClick={() => setStatusFilter('Approved')}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: statusFilter === 'Approved' ? '2px solid #10b981' : '1px solid var(--border-color)',
                            background: 'linear-gradient(135deg, var(--bg-card) 60%, rgba(16, 185, 129, 0.08) 100%)'
                        }}
                    >
                        <div className="card-body p-3 d-flex align-items-center gap-3">
                            <div
                                className="rounded-4 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                                style={{ width: '52px', height: '52px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
                            >
                                <i className="bi bi-check2-circle fs-4"></i>
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Approved</span>
                                <h3 className="fw-bold mb-0 text-success">{stats.approved}</h3>
                                <small className="text-success fw-semibold" style={{ fontSize: '0.75rem' }}>Active & cleared</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rejected */}
                <div className="col-lg-3 col-md-6">
                    <div
                        className="card border-0 h-100 shadow-sm hover-lift cursor-pointer"
                        onClick={() => setStatusFilter('Rejected')}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: statusFilter === 'Rejected' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                            background: 'linear-gradient(135deg, var(--bg-card) 60%, rgba(239, 68, 68, 0.08) 100%)'
                        }}
                    >
                        <div className="card-body p-3 d-flex align-items-center gap-3">
                            <div
                                className="rounded-4 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
                                style={{ width: '52px', height: '52px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                            >
                                <i className="bi bi-x-circle fs-4"></i>
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>Rejected</span>
                                <h3 className="fw-bold mb-0 text-danger">{stats.rejected}</h3>
                                <small className="text-danger fw-semibold" style={{ fontSize: '0.75rem' }}>Declined by HR</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar & Search */}
            <div className="card border-0 shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
                <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    {/* Filter Pills */}
                    <div className="d-flex flex-wrap gap-2">
                        {['ALL', 'Pending', 'Approved', 'Rejected'].map(status => (
                            <button
                                key={status}
                                type="button"
                                className={`btn btn-sm px-3 rounded-pill fw-semibold ${statusFilter === status ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setStatusFilter(status)}
                                style={{ fontSize: '0.82rem' }}
                            >
                                {status === 'ALL' && `All (${stats.total})`}
                                {status === 'Pending' && `⏳ Pending (${stats.pending})`}
                                {status === 'Approved' && `✅ Approved (${stats.approved})`}
                                {status === 'Rejected' && `❌ Rejected (${stats.rejected})`}
                            </button>
                        ))}
                    </div>

                    {/* Category & Search */}
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <div className="btn-group btn-group-sm">
                            <button
                                type="button"
                                className={`btn ${categoryFilter === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'}`}
                                onClick={() => setCategoryFilter('ALL')}
                            >
                                All Types
                            </button>
                            <button
                                type="button"
                                className={`btn ${categoryFilter === 'Permission' ? 'btn-info text-white' : 'btn-outline-secondary'}`}
                                onClick={() => setCategoryFilter('Permission')}
                            >
                                Permissions
                            </button>
                            <button
                                type="button"
                                className={`btn ${categoryFilter === 'Leave' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                                onClick={() => setCategoryFilter('Leave')}
                            >
                                Leaves
                            </button>
                        </div>

                        <div className="input-group input-group-sm" style={{ width: '220px' }}>
                            <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                                <i className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0"
                                placeholder="Search reasons..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="card border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
                <div className="card-header border-bottom py-3 px-4 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)' }}>
                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>
                        <i className="bi bi-clock-history text-primary me-2"></i>
                        Request History ({filteredPermissions.length} records)
                    </h5>
                    {filteredPermissions.length > 0 && (
                        <span className="badge bg-primary bg-opacity-10 text-primary">
                            Showing {filteredPermissions.length} of {permissions.length}
                        </span>
                    )}
                </div>
                <div className="card-body p-0">
                    {filteredPermissions.length === 0 ? (
                        <div className="text-center py-5">
                            <div
                                className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: '72px', height: '72px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}
                            >
                                <i className="bi bi-calendar2-x fs-2"></i>
                            </div>
                            <h6 className="fw-bold" style={{ color: 'var(--text-main)' }}>No requests found</h6>
                            <p className="small mb-3 text-muted">No leave or permission requests match your current filters.</p>
                            <button
                                className="btn btn-primary btn-sm px-4 py-2 fw-semibold"
                                onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); setSearchQuery(''); setShowModal(true); }}
                                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', borderRadius: '10px' }}
                            >
                                <i className="bi bi-plus-lg me-1"></i> Make a New Request
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle" style={{ color: 'var(--text-main)' }}>
                                <thead style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th className="ps-4 py-3" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Type & Category</th>
                                        <th style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Date(s)</th>
                                        <th style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Duration / Shift</th>
                                        <th style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Reason</th>
                                        <th className="pe-4 text-end" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPermissions.map(p => {
                                        const meta = getTypeMeta(p.type);
                                        const isLeave = isLeaveType(p.type);
                                        return (
                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td className="ps-4 py-3">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div
                                                            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                                            style={{
                                                                width: '38px',
                                                                height: '38px',
                                                                backgroundColor: meta.lightBg || 'rgba(99, 102, 241, 0.1)',
                                                                color: meta.color || '#4f46e5'
                                                            }}
                                                        >
                                                            <i className={`bi ${meta.icon || 'bi-file-earmark-text'} fs-5`}></i>
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold" style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>
                                                                {p.type}
                                                            </div>
                                                            <span
                                                                className="badge"
                                                                style={{
                                                                    backgroundColor: isLeave ? 'rgba(16, 185, 129, 0.12)' : 'rgba(79, 70, 229, 0.12)',
                                                                    color: isLeave ? '#10b981' : '#4f46e5',
                                                                    fontSize: '0.7rem'
                                                                }}
                                                            >
                                                                {isLeave ? '🌴 Leave' : '⏱️ Permission'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold" style={{ color: 'var(--text-main)' }}>
                                                        {new Date(p.date || p.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    {p.endDate && p.endDate !== p.startDate && (
                                                        <small className="text-muted">
                                                            to {new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </small>
                                                    )}
                                                </td>
                                                <td>
                                                    {isLeave ? (
                                                        <span className="badge bg-secondary bg-opacity-75 px-2 py-1">
                                                            📅 {p.duration || '1 Day'}
                                                        </span>
                                                    ) : (
                                                        <div className="d-inline-flex align-items-center gap-1">
                                                            <span className="small text-muted">{p.startTime} - {p.endTime}</span>
                                                            <span className="badge bg-info bg-opacity-20 text-info border border-info border-opacity-25 ms-1">
                                                                ⏱️ {p.duration}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div
                                                        className="text-truncate"
                                                        style={{ maxWidth: '240px', color: 'var(--text-main)', fontSize: '0.88rem' }}
                                                        title={p.reason}
                                                    >
                                                        {p.reason || <span className="text-muted fst-italic">No reason provided</span>}
                                                    </div>
                                                </td>
                                                <td className="pe-4 text-end">
                                                    <div className="d-flex flex-column align-items-end">
                                                        <span
                                                            className="badge px-3 py-2 fw-semibold mb-1"
                                                            style={{
                                                                backgroundColor: p.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : p.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                                color: p.status === 'Approved' ? '#10b981' : p.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                                                                border: `1px solid ${p.status === 'Approved' ? '#10b981' : p.status === 'Rejected' ? '#ef4444' : '#f59e0b'}`,
                                                                borderRadius: '8px',
                                                                fontSize: '0.8rem'
                                                            }}
                                                        >
                                                            {p.status === 'Approved' && '✅ Approved'}
                                                            {p.status === 'Rejected' && '❌ Rejected'}
                                                            {p.status === 'Pending' && '⏳ In Review'}
                                                        </span>
                                                        {p.approverName && p.status !== 'Pending' && (
                                                            <small className="text-muted" style={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                                by {p.approverName}
                                                            </small>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* New Request Modal - Modern Elevated Card */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1060,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        animation: 'fadeIn 0.2s ease',
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'var(--bg-card, #ffffff)',
                            color: 'var(--text-main, #1e293b)',
                            borderRadius: '24px',
                            width: '100%',
                            maxWidth: '700px',
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                            border: '1px solid var(--glass-border, #e2e8f0)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '24px 28px 20px',
                                borderBottom: '1px solid var(--glass-border, #f1f5f9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                                        color: '#4f46e5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                    }}
                                >
                                    <i className="bi bi-file-earmark-plus-fill"></i>
                                </div>
                                <div>
                                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main, #0f172a)' }}>Request Leave or Permission</h5>
                                    <small className="text-muted">Fill out the details below for HR approval</small>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{
                                    border: 'none',
                                    background: 'rgba(0, 0, 0, 0.04)',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted, #64748b)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ overflowY: 'auto', padding: '24px 28px', flexGrow: 1 }}>
                            <form id="leaveRequestForm" onSubmit={handleFormSubmit}>
                                {/* Category Selection Cards */}
                                <label className="form-label fw-bold small text-uppercase" style={{ letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                    Select Request Type *
                                </label>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                        gap: '12px',
                                        marginBottom: '24px',
                                    }}
                                >
                                    {requestTypes.map((t) => {
                                        const isSelected = formData.type === t.label;
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setFormData({ ...formData, type: t.label })}
                                                style={{
                                                    padding: '14px',
                                                    borderRadius: '14px',
                                                    cursor: 'pointer',
                                                    border: isSelected ? `2px solid ${t.color}` : '1px solid var(--glass-border, #e2e8f0)',
                                                    backgroundColor: isSelected ? t.lightBg : 'var(--bg-main, #f8fafc)',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px',
                                                    position: 'relative',
                                                }}
                                            >
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <i className={`bi ${t.icon}`} style={{ fontSize: '1.2rem', color: t.color }}></i>
                                                    <span
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.04em',
                                                            padding: '2px 8px',
                                                            borderRadius: '20px',
                                                            backgroundColor: t.category === 'Leave' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(79, 70, 229, 0.15)',
                                                            color: t.category === 'Leave' ? '#059669' : '#4f46e5',
                                                        }}
                                                    >
                                                        {t.category}
                                                    </span>
                                                </div>
                                                <div className="fw-bold small" style={{ color: 'var(--text-main)' }}>{t.label}</div>
                                                <div className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.2' }}>{t.desc}</div>
                                                {isSelected && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-6px',
                                                            right: '-6px',
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            backgroundColor: t.color,
                                                            color: '#fff',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '0.7rem',
                                                        }}
                                                    >
                                                        <i className="bi bi-check"></i>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Dynamic Date/Time Fields - future dates/times only */}
                                {isLeaveType(formData.type) ? (
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-muted">Start Date *</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                min={todayStr}
                                                value={formData.startDate}
                                                onChange={(e) => {
                                                    const newStart = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        startDate: newStart,
                                                        // Keep end date valid if it was before the new start date
                                                        endDate: formData.endDate < newStart ? newStart : formData.endDate,
                                                    });
                                                }}
                                                style={{ borderRadius: '10px', padding: '10px 12px' }}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold small text-muted">End Date *</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                min={formData.startDate < todayStr ? todayStr : formData.startDate}
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                style={{ borderRadius: '10px', padding: '10px 12px' }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label fw-bold small text-muted">Date *</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                required
                                                min={todayStr}
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                                                style={{ borderRadius: '10px', padding: '10px 12px' }}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-bold small text-muted">Start Time *</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                required
                                                min={formData.startDate === todayStr ? nowTimeStr : undefined}
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                style={{ borderRadius: '10px', padding: '10px 12px' }}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label fw-bold small text-muted">End Time *</label>
                                            <input
                                                type="time"
                                                className="form-control"
                                                required
                                                min={formData.startTime}
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                style={{ borderRadius: '10px', padding: '10px 12px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {formData.startDate === todayStr && (
                                    <p className="small text-muted mt-n2 mb-3">
                                        <i className="bi bi-info-circle me-1"></i>
                                        Since you picked today, times must be later than the current time ({nowTimeStr}).
                                    </p>
                                )}

                                {/* Reason Textarea */}
                                <div className="mb-2">
                                    <label className="form-label fw-bold small text-muted">Reason / Justification *</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        required
                                        placeholder="Please provide a clear and detailed explanation for this request..."
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        style={{ borderRadius: '10px', padding: '10px 12px', resize: 'none' }}
                                    ></textarea>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                padding: '16px 28px',
                                borderTop: '1px solid var(--glass-border, #f1f5f9)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-main, #f8fafc)',
                            }}
                        >
                            <div className="text-muted small">
                                <i className="bi bi-shield-check text-success me-1"></i>
                                Submitted to HR Management
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary px-4 fw-semibold"
                                    onClick={() => setShowModal(false)}
                                    style={{ borderRadius: '10px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="leaveRequestForm"
                                    className="btn btn-primary px-4 fw-bold shadow-sm"
                                    style={{
                                        background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                                    }}
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPermissions;