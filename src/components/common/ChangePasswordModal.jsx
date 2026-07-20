import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
            setError("All fields are required");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (formData.oldPassword === formData.newPassword) {
            setError("New password cannot be the same as old password");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id || user.empId,
                    type: user.type,
                    companyId: user.companyId,
                    oldPassword: formData.oldPassword,
                    newPassword: formData.newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Password changed successfully!");
                setTimeout(() => {
                    onClose();
                    setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    setSuccess('');
                }, 2000);
            } else {
                setError(data.error || "Failed to change password");
            }
        } catch (err) {
            setError("Server error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-warning">
                        <h5 className="modal-title text-dark"><i className="bi bi-shield-lock-fill me-2"></i>Change Password</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        {success && <div className="alert alert-success">{success}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">Old Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="oldPassword"
                                    value={formData.oldPassword}
                                    onChange={handleChange}
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm new password"
                                />
                            </div>
                            <div className="d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
