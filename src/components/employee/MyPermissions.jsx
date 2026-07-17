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
        { id: 'short', label: 'Short Leave', category: 'Permission', desc: '1-3 hours for urgent work', icon: 'bi-clock', color: 'primary' },
        { id: 'late', label: 'Late Arrival', category: 'Permission', desc: 'Coming late to office', icon: 'bi-alarm', color: 'warning' },
        { id: 'early', label: 'Early Departure', category: 'Permission', desc: 'Leaving early from office', icon: 'bi-box-arrow-right', color: 'info' },
        { id: 'sick', label: 'Sick Leave', category: 'Leave', desc: 'Medical reason (Full Day)', icon: 'bi-bandaid', color: 'danger' },
        { id: 'casual', label: 'Casual Leave', category: 'Leave', desc: 'Personal matters (Full Day)', icon: 'bi-person-badge', color: 'success' },
        { id: 'privileged', label: 'Privilege Leave', category: 'Leave', desc: 'Earned leave / Vacation', icon: 'bi-sun', color: 'purple' }, // custom/primary
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

    return (
        <div className={`container-fluid ${!isEmbedded ? 'py-4' : 'p-0'}`} style={!isEmbedded ? { backgroundColor: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-main)' } : { color: 'var(--text-main)' }}>
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
                        style={{ backgroundColor: '#3b82f6', border: 'none' }}
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
                            <button className="btn btn-primary mt-2" onClick={() => setShowModal(true)}>
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

            {/* Modal */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '16px' }}>
                            <div className="modal-header border-secondary border-opacity-25">
                                <h5 className="modal-title fw-bold">New Request</h5>
                                <button type="button" className="btn-close"
                                    style={{ filter: 'var(--btn-close-filter, none)' }} // Use custom variable or just rely on Bootstrap handling if dark mode is set via data-bs-theme, but manually:
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body p-4">
                                <form onSubmit={async (e) => {
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
                                        const diff = (end - start) / (1000 * 60 * 60); // hours
                                        duration = diff.toFixed(1) + ' hours';
                                    }

                                    const newRequest = {
                                        ...formData,
                                        date: formData.startDate, // Backwards compatibility
                                        duration: duration,
                                    };

                                    const result = await submitLeaveRequest(newRequest);
                                    if (result) {
                                        setShowModal(false);
                                        alert("Request Submitted Successfully!");
                                    } else {
                                        alert("Failed to submit request.");
                                    }
                                }}>
                                    <label className="form-label small fw-bold" style={{ color: 'var(--text-muted)' }}>Request Type *</label>
                                    <div className="row g-2 mb-4">
                                        {requestTypes.map(pt => (
                                            <div className="col-md-6" key={pt.id}>
                                                <div
                                                    className={`p-3 border rounded cursor-pointer d-flex align-items-center gap-3 ${formData.type === pt.label ? `border-${pt.color} bg-${pt.color} bg-opacity-10` : 'border-secondary border-opacity-25'}`}
                                                    onClick={() => setFormData({ ...formData, type: pt.label })}
                                                    style={{ cursor: 'pointer', transition: 'all 0.2s', backgroundColor: formData.type === pt.label ? `var(--bs-${pt.color}-bg-subtle, rgba(13, 110, 253, 0.1))` : 'transparent' }}
                                                >
                                                    <div className={`p-2 rounded text-white shadow-sm`} style={{ backgroundColor: pt.color === 'purple' ? '#a855f7' : `var(--bs-${pt.color})` }}>
                                                        <i className={`bi ${pt.icon} fs-5`}></i>
                                                    </div>
                                                    <div>
                                                        <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>{pt.label}</h6>
                                                        <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pt.desc}</small>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {isLeaveType(formData.type) ? (
                                        <div className="row mb-3">
                                            <div className="col-md-6">
                                                <label className="form-label small" style={{ color: 'var(--text-muted)' }}>From Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control border-secondary border-opacity-25"
                                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', colorScheme: 'light' }}
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                    required
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small" style={{ color: 'var(--text-muted)' }}>To Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control border-secondary border-opacity-25"
                                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', colorScheme: 'light' }}
                                                    value={formData.endDate}
                                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="row mb-3">
                                                <div className="col-md-12">
                                                    <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Date *</label>
                                                    <input
                                                        type="date"
                                                        className="form-control border-secondary border-opacity-25"
                                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', colorScheme: 'light' }}
                                                        value={formData.startDate}
                                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="row mb-3">
                                                <div className="col-md-6">
                                                    <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Start Time *</label>
                                                    <input
                                                        type="time"
                                                        className="form-control border-secondary border-opacity-25"
                                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', colorScheme: 'light' }}
                                                        value={formData.startTime}
                                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                        required
                                                    />
                                                </div>
                                                <div className="col-md-6">
                                                    <label className="form-label small" style={{ color: 'var(--text-muted)' }}>End Time *</label>
                                                    <input
                                                        type="time"
                                                        className="form-control border-secondary border-opacity-25"
                                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', colorScheme: 'light' }}
                                                        value={formData.endTime}
                                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="mb-4">
                                        <label className="form-label small" style={{ color: 'var(--text-muted)' }}>Reason *</label>
                                        <textarea
                                            className="form-control border-secondary border-opacity-25"
                                            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                            rows="3"
                                            placeholder="Please provide a detailed reason..."
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="d-grid">
                                        <button type="submit" className="btn btn-primary btn-lg py-3 fw-bold">Submit Request</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPermissions;
