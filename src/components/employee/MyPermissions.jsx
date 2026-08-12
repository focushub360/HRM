import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const MyPermissions = ({ isEmbedded = false }) => {
    const { user, leaveRequests, submitLeaveRequest } = useAuth(); // Use context
    const [showModal, setShowModal] = useState(false);
    // Simplified permissions list (No local filtering)
    const permissions = useMemo(() => {
        return (leaveRequests || []).sort((a, b) => new Date(b.date || b.startDate) - new Date(a.date || a.startDate));
    }, [leaveRequests]);

    // Form State
    const [formData, setFormData] = useState({
        type: 'Short Leave',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
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

    // Stats
    const stats = {
        total: permissions.length,
        pending: permissions.filter(p => p.status === 'Pending').length,
        approved: permissions.filter(p => p.status === 'Approved').length,
        rejected: permissions.filter(p => p.status === 'Rejected').length,
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

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
            {/* Keyframe styles */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            `}</style>

            {/* Header - Hide if embedded */}
            {!isEmbedded && (
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-0 fw-bold">My Leaves & Permissions</h2>
                        <p className="text-muted">Apply for leaves or permissions and track status</p>
                    </div>
                    <button
                        className="btn btn-primary px-4 py-2 fw-bold"
                        onClick={() => setShowModal(true)}
                        style={{ backgroundColor: '#4f46e5', border: 'none', borderRadius: '12px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                    >
                        <i className="bi bi-file-earmark-plus me-2"></i> New Request
                    </button>
                </div>
            )}

            {isEmbedded && (
                <div className="d-flex justify-content-end mb-3">
                    <button
                        className="btn btn-primary btn-sm px-3 fw-bold"
                        onClick={() => setShowModal(true)}
                        style={{ backgroundColor: '#4f46e5', border: 'none', borderRadius: '10px', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)' }}
                    >
                        <i className="bi bi-plus-lg me-2"></i> New Request
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card border-0 text-center py-4 h-100 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                        <div className="card-body d-flex flex-column align-items-center justify-content-center">
                            <div className="mb-3 p-3 rounded-circle bg-primary text-white shadow">
                                <i className="bi bi-clock-history fs-3"></i>
                            </div>
                            <h2 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{stats.total}</h2>
                            <p className="mb-0 fw-semibold" style={{ color: 'var(--text-muted)' }}>Total Requests</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 text-center py-4 h-100 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                        <div className="card-body d-flex flex-column align-items-center justify-content-center">
                            <div className="mb-3 p-3 rounded-circle bg-warning text-white shadow">
                                <i className="bi bi-hourglass-split fs-3"></i>
                            </div>
                            <h2 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{stats.pending}</h2>
                            <p className="mb-0 fw-semibold" style={{ color: 'var(--text-muted)' }}>Pending</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 text-center py-4 h-100 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                        <div className="card-body d-flex flex-column align-items-center justify-content-center">
                            <div className="mb-3 p-3 rounded-circle bg-success text-white shadow">
                                <i className="bi bi-check-circle-fill fs-3"></i>
                            </div>
                            <h2 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{stats.approved}</h2>
                            <p className="mb-0 fw-semibold" style={{ color: 'var(--text-muted)' }}>Approved</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 text-center py-4 h-100 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                        <div className="card-body d-flex flex-column align-items-center justify-content-center">
                            <div className="mb-3 p-3 rounded-circle bg-danger text-white shadow">
                                <i className="bi bi-x-circle-fill fs-3"></i>
                            </div>
                            <h2 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{stats.rejected}</h2>
                            <p className="mb-0 fw-semibold" style={{ color: 'var(--text-muted)' }}>Rejected</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="card border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
                <div className="card-header border-0 bg-transparent pt-4 px-4">
                    <h5 style={{ color: 'var(--text-main)' }}>Request History ({permissions.length} records)</h5>
                </div>
                <div className="card-body p-0">
                    {permissions.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="bi bi-clock-history display-4 mb-3" style={{ color: 'var(--text-muted)' }}></i>
                            <h6 style={{ color: 'var(--text-muted)' }}>No requests found</h6>
                            <p className="small mb-3" style={{ color: 'var(--text-muted)' }}>You haven't made any requests yet.</p>
                            <button className="btn btn-primary mt-2" onClick={() => setShowModal(true)} style={{ backgroundColor: '#4f46e5', border: 'none', borderRadius: '10px' }}>
                                <i className="bi bi-plus-lg me-2"></i> Make Your First Request
                            </button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle" style={{ color: 'var(--text-main)' }}>
                                <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <tr>
                                        <th className="ps-4" style={{ color: 'var(--text-muted)' }}>Type</th>
                                        <th style={{ color: 'var(--text-muted)' }}>Date(s)</th>
                                        <th style={{ color: 'var(--text-muted)' }}>Duration / Time</th>
                                        <th style={{ color: 'var(--text-muted)' }}>Reason</th>
                                        <th style={{ color: 'var(--text-muted)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {permissions.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td className="ps-4">
                                                <div className="fw-bold">{p.type}</div>
                                                <small style={{ color: 'var(--text-muted)' }}>{isLeaveType(p.type) ? 'Leave' : 'Permission'}</small>
                                            </td>
                                            <td>
                                                <div>{p.date || p.startDate}</div>
                                                {p.endDate && p.endDate !== p.startDate && <div className="small" style={{ color: 'var(--text-muted)' }}>to {p.endDate}</div>}
                                            </td>
                                            <td>
                                                {isLeaveType(p.type) ? (
                                                    <span className="badge bg-secondary bg-opacity-75">{p.duration}</span>
                                                ) : (
                                                    <>{p.startTime} - {p.endTime} <span className="badge bg-secondary bg-opacity-75 ms-2">{p.duration}</span></>
                                                )}
                                            </td>
                                            <td><small className="d-inline-block text-truncate" style={{ maxWidth: '200px', color: 'var(--text-muted)' }} title={p.reason}>{p.reason}</small></td>
                                            <td>
                                                <span className={`badge ${p.status === 'Approved' ? 'bg-success' : p.status === 'Rejected' ? 'bg-danger' : 'bg-warning'} bg-opacity-75`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* New Request Modal - Redesigned as Modern Elevated Card */}
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
                            animation: 'slideUp 0.25s cubic-bezier(.22,1,.36,1)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '24px 28px 18px',
                            borderBottom: '1px solid var(--glass-border, #e2e8f0)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--bg-card, #ffffff)',
                        }}>
                            <div className="d-flex align-items-center gap-3">
                                <div style={{
                                    width: 44, height: 44, borderRadius: 14,
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: '#ffffff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
                                }}>
                                    <i className="bi bi-send-plus fs-5"></i>
                                </div>
                                <div>
                                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>Apply for Leave / Permission</h5>
                                    <small className="text-muted">Choose your request category and fill in the schedule details</small>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{
                                    border: 'none',
                                    background: 'rgba(0, 0, 0, 0.05)',
                                    borderRadius: '50%',
                                    width: 36, height: 36,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18, color: 'var(--text-muted, #64748b)',
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
                            >
                                <i className="bi bi-x-lg" style={{ fontSize: '0.9rem' }}></i>
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ overflowY: 'auto', padding: '24px 28px', flexGrow: 1 }}>
                            <form onSubmit={handleFormSubmit}>
                                {/* Category Filter Header */}
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                        Select Request Type *
                                    </label>
                                    <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: '0.75rem' }}>
                                        {isLeaveType(formData.type) ? 'Full Day Leave' : 'Hourly Permission'}
                                    </span>
                                </div>

                                {/* 6 Request Cards in 2x3 grid */}
                                <div className="row g-2 mb-4">
                                    {requestTypes.map(pt => {
                                        const isSelected = formData.type === pt.label;
                                        return (
                                            <div className="col-md-6" key={pt.id}>
                                                <div
                                                    onClick={() => setFormData({ ...formData, type: pt.label })}
                                                    style={{
                                                        padding: '14px 16px',
                                                        borderRadius: '14px',
                                                        cursor: 'pointer',
                                                        border: isSelected ? `2px solid ${pt.color}` : '1.5px solid var(--border-color, rgba(0,0,0,0.08))',
                                                        backgroundColor: isSelected ? pt.lightBg : 'var(--bg-main, #f8fafc)',
                                                        boxShadow: isSelected ? `0 4px 14px ${pt.color}22` : 'none',
                                                        transition: 'all 0.18s ease',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if (!isSelected) e.currentTarget.style.borderColor = `${pt.color}66`;
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-color, rgba(0,0,0,0.08))';
                                                    }}
                                                >
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div style={{
                                                            width: 38, height: 38, borderRadius: 10,
                                                            backgroundColor: isSelected ? pt.color : `${pt.color}15`,
                                                            color: isSelected ? '#ffffff' : pt.color,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0,
                                                            transition: 'all 0.18s ease'
                                                        }}>
                                                            <i className={`bi ${pt.icon} fs-5`}></i>
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold" style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                                                {pt.label}
                                                            </div>
                                                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                                {pt.desc}
                                                            </small>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div style={{
                                                            width: 20, height: 20, borderRadius: '50%',
                                                            backgroundColor: pt.color, color: '#ffffff',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.7rem'
                                                        }}>
                                                            <i className="bi bi-check-lg"></i>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Schedule Details Box */}
                                <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: 'var(--bg-main, #f8fafc)', border: '1px solid var(--glass-border, #e2e8f0)' }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <span className="fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                            <i className="bi bi-calendar-event me-1"></i> Schedule Details
                                        </span>
                                        {/* Dynamic Duration Badge */}
                                        <span className="badge bg-dark bg-opacity-10 text-dark border" style={{ fontSize: '0.75rem', color: 'var(--text-main) !important' }}>
                                            {isLeaveType(formData.type) ? (
                                                <><i className="bi bi-calendar-range me-1"></i> {(() => {
                                                    const start = new Date(formData.startDate);
                                                    const end = new Date(formData.endDate);
                                                    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                                                    return isNaN(diffDays) ? '1 Day' : `${diffDays} Day(s)`;
                                                })()}</>
                                            ) : (
                                                <><i className="bi bi-hourglass me-1"></i> {(() => {
                                                    const start = new Date(`2000-01-01T${formData.startTime}`);
                                                    const end = new Date(`2000-01-01T${formData.endTime}`);
                                                    const diff = (end - start) / (1000 * 60 * 60);
                                                    return isNaN(diff) || diff <= 0 ? '1 hour' : `${diff.toFixed(1)} hours`;
                                                })()}</>
                                            )}
                                        </span>
                                    </div>

                                    {isLeaveType(formData.type) ? (
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold" style={{ color: 'var(--text-main)' }}>From Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    style={{ backgroundColor: 'var(--bg-card, #fff)', color: 'var(--text-main)', borderRadius: '10px', borderColor: 'var(--border-color, #e2e8f0)', padding: '10px 12px' }}
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold" style={{ color: 'var(--text-main)' }}>To Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    style={{ backgroundColor: 'var(--bg-card, #fff)', color: 'var(--text-main)', borderRadius: '10px', borderColor: 'var(--border-color, #e2e8f0)', padding: '10px 12px' }}
                                                    value={formData.endDate}
                                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label small fw-semibold" style={{ color: 'var(--text-main)' }}>Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    style={{ backgroundColor: 'var(--bg-card, #fff)', color: 'var(--text-main)', borderRadius: '10px', borderColor: 'var(--border-color, #e2e8f0)', padding: '10px 12px' }}
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold" style={{ color: 'var(--text-main)' }}>Start Time *</label>
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    style={{ backgroundColor: 'var(--bg-card, #fff)', color: 'var(--text-main)', borderRadius: '10px', borderColor: 'var(--border-color, #e2e8f0)', padding: '10px 12px' }}
                                                    value={formData.startTime}
                                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small fw-semibold" style={{ color: 'var(--text-main)' }}>End Time *</label>
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    style={{ backgroundColor: 'var(--bg-card, #fff)', color: 'var(--text-main)', borderRadius: '10px', borderColor: 'var(--border-color, #e2e8f0)', padding: '10px 12px' }}
                                                    value={formData.endTime}
                                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reason Box */}
                                <div className="mb-4">
                                    <label className="form-label small fw-semibold" style={{ color: 'var(--text-main)' }}>
                                        Reason for Request *
                                    </label>
                                    <textarea
                                        className="form-control"
                                        style={{ backgroundColor: 'var(--bg-main, #f8fafc)', color: 'var(--text-main)', borderRadius: '10px', borderColor: 'var(--border-color, #e2e8f0)', padding: '12px' }}
                                        rows="3"
                                        placeholder="Please provide a clear and detailed reason for this request..."
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        required
                                    ></textarea>
                                </div>

                                {/* Footer Action Buttons */}
                                <div className="d-flex gap-2 justify-content-end pt-2">
                                    <button
                                        type="button"
                                        className="btn px-4 py-2"
                                        style={{
                                            border: '1.5px solid var(--border-color, #e2e8f0)',
                                            borderRadius: '12px',
                                            color: 'var(--text-muted)',
                                            fontWeight: 600,
                                            fontSize: '0.9rem'
                                        }}
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn text-white px-4 py-2"
                                        style={{
                                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                            borderRadius: '12px',
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                                            border: 'none'
                                        }}
                                    >
                                        <i className="bi bi-send-fill me-2"></i> Submit Request
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPermissions;

