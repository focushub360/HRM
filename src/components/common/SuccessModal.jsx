import React, { useEffect } from 'react';

const SuccessModal = ({ isOpen, onClose, title = "Success!", message, subMessage }) => {
    if (!isOpen) return null;

    useEffect(() => {
        // Auto close after 3 seconds if needed, or let user click
        // But user usually wants to see the credentials for Employee.
        // So for "Company Created", auto close is fine.
        // For "Employee Created", we show credentials, so MANUAL close is needed.
    }, []);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>
                {`
                    @keyframes checkmark {
                        0% { stroke-dashoffset: 48; transform: scale(0.5); opacity: 0; }
                        50% { stroke-dashoffset: 0; transform: scale(1.2); opacity: 1; }
                        100% { stroke-dashoffset: 0; transform: scale(1); opacity: 1; }
                    }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleUp { from { transform: scale(0.8); } to { transform: scale(1); } }
                    .success-modal-card {
                        background: white; padding: 2rem; border-radius: 20px;
                        text-align: center; width: 90%; max-width: 400px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                `}
            </style>
            <div className="success-modal-card">
                <div className="mb-3 d-flex justify-content-center">
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" style={{
                                strokeDasharray: 48, strokeDashoffset: 48,
                                animation: 'checkmark 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.1s forwards'
                            }} />
                        </svg>
                    </div>
                </div>
                <h4 className="fw-bold text-dark mb-2">{title}</h4>
                <p className="text-muted mb-4">{message}</p>

                {subMessage && (
                    <div className="bg-light p-3 rounded mb-4 text-start border border-dashed border-secondary">
                        {subMessage}
                    </div>
                )}

                <button
                    className="btn btn-success w-100 py-2 fw-bold"
                    onClick={onClose}
                    style={{ borderRadius: '10px' }}
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default SuccessModal;
