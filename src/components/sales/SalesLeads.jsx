import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { io } from 'socket.io-client';

const SalesLeads = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeQuery, setActiveQuery] = useState({ id: null, text: '' });

    useEffect(() => {
        fetchLeads(true);

        const socket = io('http://localhost:5000');
        socket.emit('join-company-room', user.companyId);

        socket.on('lead-added', (newLead) => {
            setLeads(prev => [newLead, ...prev]);
        });

        socket.on('lead-updated', (updatedLead) => {
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
        });

        // Polling as a fallback
        const interval = setInterval(() => fetchLeads(false), 10000);

        return () => {
            socket.disconnect();
            clearInterval(interval);
        };
    }, [user]);

    const fetchLeads = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/leads/${user.companyId}`);
            if (response.ok) {
                const data = await response.json();
                setLeads(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            }
        } catch (error) {
            console.error("Failed to fetch leads", error);
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const updateLeadData = async (id, data) => {
        try {
            const response = await fetch(`http://localhost:5000/api/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                const result = await response.json();
                // Update local state immediately
                setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
                setActiveQuery({ id: null, text: '' });
            }
        } catch (error) {
            alert("Failed to update lead");
        }
    };

    return (
        <div className={`container-fluid py-4`} style={{ minHeight: '100%', backgroundColor: 'transparent' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold m-0" style={{ color: 'var(--text-main)' }}>Lead Management</h2>
                <div className="badge bg-primary px-3 py-2 rounded-pill">
                    {leads.length} Total Leads
                </div>
            </div>

            <div className="row g-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {loading ? (
                    <div className="col-12 text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Loading leads...</p>
                    </div>
                ) : leads.length === 0 ? (
                    <div className="col-12 text-center py-5">
                        <div className="card border-0 shadow-sm p-5" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '15px' }}>
                            <p className="m-0" style={{ color: 'var(--text-muted)' }}>No leads found. Sales team can add leads via mobile app.</p>
                        </div>
                    </div>
                ) : (
                    leads.map(lead => (
                        <div key={lead.id} className="col-md-6 col-lg-4 col-xl-3">
                            <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{
                                backgroundColor: 'var(--bg-card)',
                                borderRadius: '15px',
                                borderLeft: `5px solid ${lead.status === 'Converted' ? '#10b981' : lead.status === 'Lost' ? '#ef4444' : '#4f46e5'}`
                            }}>
                                <div className="card-body p-4">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h5 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{lead.name}</h5>
                                            <small style={{ color: 'var(--text-muted)' }}>ID: {lead.id?.slice(-6).toUpperCase()}</small>
                                        </div>
                                        <span className={`badge rounded-pill px-3 py-2 ${lead.status === 'New' ? 'bg-primary' :
                                            lead.status === 'Converted' ? 'bg-success' :
                                                lead.status === 'Lost' ? 'bg-danger' : 'bg-warning text-dark'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </div>

                                    <div className="mb-3 p-3 rounded-3" style={{ backgroundColor: 'var(--bg-main)' }}>
                                        <p className="mb-1 small fw-bold text-uppercase" style={{ color: 'var(--text-muted)' }}>Contact Details</p>
                                        <div className="d-flex align-items-center mb-1">
                                            <small className="fw-medium" style={{ color: 'var(--text-main)' }}>{lead.contactPerson}</small>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <small style={{ color: 'var(--text-muted)' }}>{lead.email || 'No email'}</small>
                                        </div>
                                    </div>

                                    {/* Lead Query Section */}
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold text-uppercase" style={{ color: 'var(--text-muted)' }}>HR Query</label>
                                        {lead.query ? (
                                            <div className="p-2 rounded border border-warning border-opacity-25 mb-2" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                                                <p className="small m-0 fst-italic" style={{ color: 'var(--text-main)' }}>"{lead.query}"</p>
                                            </div>
                                        ) : null}

                                        {activeQuery.id === lead.id ? (
                                            <div className="input-group input-group-sm mt-2">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Ask sales agent..."
                                                    value={activeQuery.text}
                                                    onChange={(e) => setActiveQuery({ ...activeQuery, text: e.target.value })}
                                                    autoFocus
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    type="button"
                                                    onClick={() => updateLeadData(lead.id, { query: activeQuery.text, companyId: user.companyId })}
                                                >Send</button>
                                            </div>
                                        ) : (
                                            <button
                                                className="btn btn-link btn-sm p-0 text-decoration-none"
                                                onClick={() => setActiveQuery({ id: lead.id, text: lead.query || '' })}
                                            >
                                                {lead.query ? 'Edit Query' : '+ Add Query'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Sales Response */}
                                    {lead.response ? (
                                        <div className="mb-3">
                                            <label className="form-label small fw-bold text-uppercase" style={{ color: 'var(--text-muted)' }}>Sales Response</label>
                                            <div className="p-2 rounded bg-success bg-opacity-10 border border-success border-opacity-25">
                                                <p className="small m-0" style={{ color: 'var(--text-main)' }}>{lead.response}</p>
                                            </div>
                                        </div>
                                    ) : lead.query ? (
                                        <div className="mb-3">
                                            <span className="badge bg-light text-muted fw-normal">Waiting for response...</span>
                                        </div>
                                    ) : null}

                                    <div className="mt-auto pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
                                        <select
                                            className="form-select form-select-sm"
                                            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                                            value={lead.status}
                                            onChange={(e) => updateLeadData(lead.id, { status: e.target.value, companyId: user.companyId })}
                                        >
                                            <option value="New">New</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Converted">Converted</option>
                                            <option value="Lost">Lost</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SalesLeads;
