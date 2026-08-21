import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import ChangePasswordModal from './common/ChangePasswordModal';

const Settings = () => {
    const { user, updateCompany, companies } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetched Credentials State
    const [credentials, setCredentials] = useState({ admin: null, hrAccounts: [], employeeAccounts: [] });
    const [showPasswords, setShowPasswords] = useState({}); // Map of id -> boolean
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Selected Company State (for Multi-Company Config)
    const [selectedCompanyId, setSelectedCompanyId] = useState(user?.companyId || '');

    // Local State for Form Fields
    const [companySettings, setCompanySettings] = useState({
        name: '',
        location: '',
        contactEmail: '',
        website: '', // New Field
        profit: '', // New Field
        workStartTime: '09:00',
        workEndTime: '18:00',
        lateMarkTime: '09:15',
    });

    const [policies, setPolicies] = useState({
        sickLeaveQuota: 12,
        casualLeaveQuota: 12,
        privilegeLeaveQuota: 15,
        probationPeriodMonths: 3
    });

    // Load initial data based on SELECTED company
    useEffect(() => {
        if (selectedCompanyId && companies.length > 0) {
            const currentCompany = companies.find(c => String(c.id) === String(selectedCompanyId)) || {};

            setCompanySettings({
                name: currentCompany.name || '',
                location: currentCompany.location || '',
                contactEmail: currentCompany.admin?.email || '',
                website: currentCompany.website || '',
                profit: currentCompany.profit || '',
                workStartTime: currentCompany.workStartTime || '09:00',
                workEndTime: currentCompany.workEndTime || '18:00',
                lateMarkTime: currentCompany.lateMarkTime || '09:15',
                // Load policies if they exist or default
                ...policies, // Keep defaults if missing
                ...(currentCompany.leavePolicy || {})
            });

            // Sync policies state if present
            if (currentCompany.leavePolicy) {
                setPolicies(prev => ({ ...prev, ...currentCompany.leavePolicy }));
            }
        }
    }, [selectedCompanyId, companies]);

    // Fetch Credentials when Security Tab is active
    useEffect(() => {
        if (activeTab === 'security' && selectedCompanyId) {
            fetchCredentials();
        }
    }, [activeTab, selectedCompanyId]);

    const fetchCredentials = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/companies/${selectedCompanyId}/credentials`);
            if (res.ok) {
                const data = await res.json();
                setCredentials(data);
            }
        } catch (err) {
            console.error("Failed to fetch credentials", err);
        }
    };

    const handleSaveCompany = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (user.type === 'company' || user.type === 'company_admin') {
                // Update Selected Company Data via server endpoint
                const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api')}/companies/${selectedCompanyId}/settings`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: companySettings.name,
                        location: companySettings.location,
                        profit: companySettings.profit,
                        leavePolicy: policies,
                        workStartTime: companySettings.workStartTime,
                        workEndTime: companySettings.workEndTime,
                        lateMarkTime: companySettings.lateMarkTime
                    })
                });

                if (response.ok) {
                    setMessage({ type: 'success', text: 'Company settings updated successfully!' });
                    // Update context
                    updateCompany(selectedCompanyId, {
                        ...companySettings,
                        leavePolicy: policies
                    });
                } else {
                    setMessage({ type: 'error', text: 'Failed to update settings.' });
                }
            } else {
                setMessage({ type: 'error', text: 'Permission Denied.' });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    const togglePassword = (id) => {
        setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const isAdmin = user?.type === 'company' || user?.type === 'company_admin';

    // UI Components for Tabs
    const renderTabNav = (id, label, icon) => (
        <button
            className={`btn d-flex align-items-center gap-2 text-start w-100 border-0 ${activeTab === id ? 'btn-primary text-white' : 'btn-light'}`}
            onClick={() => setActiveTab(id)}
            style={activeTab !== id ? { backgroundColor: 'transparent', color: 'var(--text-main)', boxShadow: 'none' } : {}}
        >
            <i className={`bi ${icon}`}></i> {label}
        </button>
    );

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-main)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-0">System Settings</h2>
                    <p className="text-muted">Manage your application preferences and company configurations</p>
                </div>
                {/* Multi-Company Selector */}
                {isAdmin && (
                    <div className="d-flex align-items-center gap-3">
                        <span className="text-muted fw-bold">Configuring:</span>
                        <select
                            className="form-select border-secondary"
                            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', width: '250px', cursor: 'pointer' }}
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} (ID: {c.id})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                </div>
            )}

            <div className="row g-4">
                {/* Sidebar Navigation for Settings */}
                <div className="col-md-3">
                    <div className="card border-0" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
                        <div className="card-body p-2 d-flex flex-column gap-1">
                            {renderTabNav('general', 'General', 'bi-sliders')}
                            {isAdmin && renderTabNav('company', 'Company Profile', 'bi-building')}
                            {isAdmin && renderTabNav('attendance', 'Attendance & Shifts', 'bi-clock-history')}
                            {isAdmin && renderTabNav('leaves', 'Leave Policies', 'bi-calendar-check')}
                            {isAdmin && renderTabNav('security', 'Security & Credentials', 'bi-shield-lock')}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="col-md-9">
                    <div className="card border-0" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', minHeight: '500px', boxShadow: 'var(--shadow)' }}>
                        <div className="card-body p-4">

                            {/* GENERAL TAB */}
                            {activeTab === 'general' && (
                                <div className="animate-fade-in">
                                    <h4 className="border-bottom border-secondary pb-3 mb-4">General Preferences</h4>

                                    <div className="mb-4">
                                        <label className="form-label d-block text-muted mb-3">Theme Preference</label>
                                        <div className="d-flex gap-3">
                                            <div
                                                style={{
                                                    width: '150px',
                                                    cursor: 'pointer',
                                                    color: theme === 'light' ? '#4f46e5' : 'var(--text-main)',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    textAlign: 'center',
                                                    border: theme === 'light' ? '2px solid #4f46e5' : '1px solid var(--border-color)',
                                                    background: theme === 'light' ? 'rgba(79, 70, 229, 0.1)' : 'transparent'
                                                }}
                                                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                                            >
                                                <i className="bi bi-brightness-high fs-2 mb-2 d-block"></i>
                                                Light Mode
                                            </div>
                                            <div
                                                style={{
                                                    width: '150px',
                                                    cursor: 'pointer',
                                                    color: theme === 'dark' ? '#818cf8' : 'var(--text-main)',
                                                    padding: '1rem',
                                                    borderRadius: '8px',
                                                    textAlign: 'center',
                                                    border: theme === 'dark' ? '2px solid #818cf8' : '1px solid var(--border-color)',
                                                    background: theme === 'dark' ? 'rgba(129, 140, 248, 0.15)' : 'transparent'
                                                }}
                                                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                                            >
                                                <i className="bi bi-moon-stars fs-2 mb-2 d-block"></i>
                                                Dark Mode
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label text-muted">Language</label>
                                        <select className="form-select border-secondary" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} disabled>
                                            <option>English (US)</option>
                                            <option>Spanish</option>
                                            <option>French</option>
                                        </select>
                                        <div className="form-text text-muted">Multi-language support coming soon.</div>
                                    </div>
                                </div>
                            )}

                            {/* COMPANY TAB */}
                            {activeTab === 'company' && (
                                <form onSubmit={handleSaveCompany} className="animate-fade-in">
                                    <h4 className="border-bottom border-secondary pb-3 mb-4">Company Profile</h4>

                                    <div className="row g-3 mb-4">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted">Company Name</label>
                                            <input
                                                type="text"
                                                className="form-control border-secondary"
                                                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                value={companySettings.name}
                                                onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted">Admin Contact Email</label>
                                            <input
                                                type="email"
                                                className="form-control border-secondary"
                                                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                value={companySettings.contactEmail} // Read-only mostly for reference
                                                disabled
                                            />
                                        </div>
                                        {/* New PROFIT Field */}
                                        <div className="col-md-6">
                                            <label className="form-label text-muted">Company Profit (Approx)</label>
                                            <input
                                                type="text"
                                                className="form-control border-secondary"
                                                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                placeholder="e.g. $1,000,000"
                                                value={companySettings.profit}
                                                onChange={(e) => setCompanySettings({ ...companySettings, profit: e.target.value })}
                                            />
                                            <div className="form-text text-muted">Visible in Admin Dashboard only.</div>
                                        </div>

                                        <div className="col-12">
                                            <label className="form-label text-muted">Office Location / Address</label>
                                            <textarea
                                                className="form-control border-secondary"
                                                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                rows="3"
                                                value={companySettings.location}
                                                onChange={(e) => setCompanySettings({ ...companySettings, location: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end">
                                        <button type="submit" className="btn btn-success px-4" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* ATTENDANCE TAB */}
                            {activeTab === 'attendance' && (
                                <div className="animate-fade-in">
                                    <h4 className="border-bottom border-secondary pb-3 mb-4">Attendance Configuration</h4>
                                    <div className="alert border-0" style={{ background: theme === 'dark' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(6, 182, 212, 0.12)', color: theme === 'dark' ? '#22d3ee' : '#0e7490' }}>
                                        <i className="bi bi-info-circle me-2"></i>
                                        These settings define how employee attendance is tracked and flagged.
                                    </div>

                                    <div className="row g-3 mb-4">
                                        <div className="col-md-4">
                                            <label className="form-label text-muted">Standard Start Time</label>
                                            <input type="time" className="form-control border-secondary" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} value={companySettings.workStartTime} onChange={(e) => setCompanySettings({ ...companySettings, workStartTime: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label text-muted">Standard End Time</label>
                                            <input type="time" className="form-control border-secondary" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} value={companySettings.workEndTime} onChange={(e) => setCompanySettings({ ...companySettings, workEndTime: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label text-muted">Late Mark Threshold</label>
                                            <input type="time" className="form-control border-secondary" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} value={companySettings.lateMarkTime} onChange={(e) => setCompanySettings({ ...companySettings, lateMarkTime: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="form-check form-switch mb-3">
                                        <input className="form-check-input" type="checkbox" id="geoFence" checked readOnly />
                                        <label className="form-check-label" style={{ color: 'var(--text-main)' }} htmlFor="geoFence">Enable Geofencing (Requires Enterprise Plan)</label>
                                    </div>

                                    <div className="d-flex justify-content-end mt-4">
                                        <button className="btn btn-primary" onClick={handleSaveCompany}>Save Configuration</button>
                                    </div>
                                </div>
                            )}

                            {/* LEAVES TAB */}
                            {activeTab === 'leaves' && (
                                <div className="animate-fade-in">
                                    <h4 className="border-bottom border-secondary pb-3 mb-4">Leave Policies</h4>

                                    <div className="table-responsive">
                                        <table className="table table-hover border-secondary" style={{ color: 'var(--text-main)' }}>
                                            <thead>
                                                <tr>
                                                    <th>Leave Type</th>
                                                    <th>Annual Quota</th>
                                                    <th>Carry Forward?</th>
                                                    <th>Paid?</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>Sick Leave (SL)</td>
                                                    <td>
                                                        <input type="number" className="form-control form-control-sm border-secondary" style={{ width: '80px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} value={policies.sickLeaveQuota} onChange={(e) => setPolicies({ ...policies, sickLeaveQuota: e.target.value })} />
                                                    </td>
                                                    <td><span className="badge bg-secondary">No</span></td>
                                                    <td><span className="badge bg-success">Yes</span></td>
                                                </tr>
                                                <tr>
                                                    <td>Casual Leave (CL)</td>
                                                    <td>
                                                        <input type="number" className="form-control form-control-sm border-secondary" style={{ width: '80px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} value={policies.casualLeaveQuota} onChange={(e) => setPolicies({ ...policies, casualLeaveQuota: e.target.value })} />
                                                    </td>
                                                    <td><span className="badge bg-secondary">No</span></td>
                                                    <td><span className="badge bg-success">Yes</span></td>
                                                </tr>
                                                <tr>
                                                    <td>Privilege Leave (PL)</td>
                                                    <td>
                                                        <input type="number" className="form-control form-control-sm border-secondary" style={{ width: '80px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} value={policies.privilegeLeaveQuota} onChange={(e) => setPolicies({ ...policies, privilegeLeaveQuota: e.target.value })} />
                                                    </td>
                                                    <td><span className="badge bg-primary">Yes (Max 45)</span></td>
                                                    <td><span className="badge bg-success">Yes</span></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="d-flex justify-content-end mt-4">
                                        <button className="btn btn-primary" onClick={handleSaveCompany}>Update Policies</button>
                                    </div>
                                </div>
                            )}

                            {/* SECURITY TAB (UPDATED) */}
                            {activeTab === 'security' && (
                                <div className="animate-fade-in">
                                    <h4 className="border-bottom border-secondary pb-3 mb-4">Security & Credentials</h4>

                                    <div className="alert border-0 mb-4" style={{ background: theme === 'dark' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.15)', color: theme === 'dark' ? '#fbbf24' : '#92400e' }}>
                                        <i className="bi bi-exclamation-triangle me-2"></i>
                                        <b>Admin Only:</b> View and manage user credentials. Ensure you are in a secure environment.
                                    </div>

                                    <h5 className="mt-4 mb-3" style={{ color: 'var(--text-main)' }}>Company Admin</h5>
                                    {credentials.admin && (
                                        <div className="card border-secondary mb-3" style={{ backgroundColor: 'var(--bg-main)' }}>
                                            <div className="card-body d-flex justify-content-between align-items-center">
                                                <div>
                                                    <h6 className="mb-0" style={{ color: 'var(--text-main)' }}>{credentials.admin.name}</h6>
                                                    <small className="text-muted">{credentials.admin.email}</small>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <input
                                                        type={showPasswords['admin'] ? "text" : "password"}
                                                        className="form-control form-control-sm border-secondary"
                                                        value={credentials.admin.password}
                                                        readOnly
                                                        style={{ width: '150px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                    />
                                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => togglePassword('admin')}>
                                                        <i className={`bi ${showPasswords['admin'] ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                                    </button>
                                                    {/* Only show Change Password if viewing own company settings or logic aligns */}
                                                    {(String(selectedCompanyId) === String(user.companyId)) && (
                                                        <button
                                                            className="btn btn-sm btn-warning ms-2"
                                                            onClick={() => setIsPasswordModalOpen(true)}
                                                            title="Change Your Password"
                                                        >
                                                            <i className="bi bi-key-fill me-1"></i> Change
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <h5 className="mt-4 mb-3" style={{ color: 'var(--text-main)' }}>HR Managers</h5>
                                    <div className="table-responsive mb-4">
                                        <table className="table table-hover border-secondary" style={{ color: 'var(--text-main)' }}>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Employee ID</th>
                                                    <th>Password</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {credentials.hrAccounts.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No HR accounts found.</td></tr>}
                                                {credentials.hrAccounts.map(hr => (
                                                    <tr key={hr.id}>
                                                        <td>{hr.name}</td>
                                                        <td>{hr.email}</td>
                                                        <td>{hr.empId}</td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <input
                                                                    type={showPasswords[hr.id] ? "text" : "password"}
                                                                    className="form-control form-control-sm border-secondary"
                                                                    value={hr.password}
                                                                    readOnly
                                                                    style={{ width: '120px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                                />
                                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => togglePassword(hr.id)}>
                                                                    <i className={`bi ${showPasswords[hr.id] ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <h5 className="mt-4 mb-3" style={{ color: 'var(--text-main)' }}>Employees</h5>
                                    <div className="table-responsive">
                                        <table className="table table-hover border-secondary" style={{ color: 'var(--text-main)' }}>
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Employee ID</th>
                                                    <th>Password</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {credentials.employeeAccounts.length === 0 && <tr><td colSpan="4" className="text-center text-muted">No Employee accounts found.</td></tr>}
                                                {credentials.employeeAccounts.map(emp => (
                                                    <tr key={emp.id}>
                                                        <td>{emp.name}</td>
                                                        <td>{emp.email}</td>
                                                        <td>{emp.empId}</td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <input
                                                                    type={showPasswords[emp.id] ? "text" : "password"}
                                                                    className="form-control form-control-sm border-secondary"
                                                                    value={emp.password}
                                                                    readOnly
                                                                    style={{ width: '120px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                                />
                                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => togglePassword(emp.id)}>
                                                                    <i className={`bi ${showPasswords[emp.id] ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div >
    );
};

export default Settings;