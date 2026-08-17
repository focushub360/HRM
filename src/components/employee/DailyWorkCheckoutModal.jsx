import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const DailyWorkCheckoutModal = ({ isOpen, onClose, onConfirmCheckout, sessionDuration, checkInTime, locationAddress }) => {
  const { user, submitDailyWorkReport } = useAuth();

  const getTodayFormatted = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const todayIsoDate = new Date().toISOString().split('T')[0];

  const initialRows = [
    {
      id: 1,
      title: 'Key Updates',
      update: '',
      status: 'In Progress'
    },
    {
      id: 2,
      title: 'Completed Deliverables',
      update: '',
      status: 'Completed'
    }
  ];

  const [rows, setRows] = useState(() => {
    const savedDraft = localStorage.getItem(`daily_work_draft_${user?.empId || user?.id}`);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.date === todayIsoDate && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          return parsed.rows;
        }
      } catch (e) {
        console.error("Failed to parse saved daily draft", e);
      }
    }
    return initialRows;
  });

  const [generalNotes, setGeneralNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddRow = () => {
    if (rows.length >= 10) {
      alert("You can add a maximum of 10 rows.");
      return;
    }
    const newId = Date.now();
    setRows(prev => [
      ...prev,
      {
        id: newId,
        title: '',
        update: '',
        status: 'In Progress'
      }
    ]);
  };

  const handleRemoveRow = (id) => {
    if (rows.length === 1) {
      alert("At least one work update row is required.");
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSaveDraft = () => {
    localStorage.setItem(
      `daily_work_draft_${user?.empId || user?.id}`,
      JSON.stringify({ date: todayIsoDate, rows, generalNotes })
    );
    alert("Draft saved successfully! You can resume and submit anytime today.");
  };

  const handleSubmitAndCheckout = async (e) => {
    e.preventDefault();

    // Validate that at least one row has updates
    const hasValidUpdate = rows.some(r => r.title.trim() && r.update.trim());
    if (!hasValidUpdate) {
      alert("Please fill in at least one work task update before checking out.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: todayIsoDate,
        formattedDate: getTodayFormatted(),
        tasks: rows.filter(r => r.title.trim() && r.update.trim()).map(r => ({
          title: r.title,
          update: r.update,
          status: r.status
        })),
        generalNotes: generalNotes.trim(),
        checkInTime: checkInTime ? new Date(checkInTime).toLocaleTimeString() : '',
        checkOutTime: new Date().toLocaleTimeString(),
        totalSessionDuration: sessionDuration || '',
        locationAddress: locationAddress || ''
      };

      const result = await submitDailyWorkReport(payload);
      
      if (!result) {
        throw new Error("Backend failed to process the report.");
      }

      // Clear draft on successful submit
      localStorage.removeItem(`daily_work_draft_${user?.empId || user?.id}`);

      // Trigger checkout process
      onConfirmCheckout();
    } catch (err) {
      console.error("Error submitting work report during checkout:", err);
      alert("Failed to submit work report, but proceeding with checkout.");
      onConfirmCheckout();
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1060,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)', 
          color: 'var(--text-main, #111827)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--glass-border, rgba(0,0,0,0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-bg, #ffffff)'
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-journal-text text-primary fs-5"></i>
            <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main, #111827)' }}>Daily Updates</h5>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#9ca3af',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', padding: '24px', flexGrow: 1 }}>
          {/* Warning Banner */}
          <div
            style={{
              backgroundColor: 'rgba(234, 88, 12, 0.12)',
              border: '1px solid rgba(234, 88, 12, 0.4)',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#fdba74',
              fontSize: '0.86rem',
              marginBottom: '20px'
            }}
          >
            <i className="bi bi-exclamation-triangle-fill text-warning fs-5"></i>
            <div>
              Please log a summary of today's work before checking out. Once submitted, your day's work report will be saved for HR.
            </div>
          </div>

          {/* Date & Shift Info */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="small fw-bold" style={{ letterSpacing: '0.05em', color: 'var(--text-muted, #6b7280)' }}>
              Date
            </span>
            <span
              style={{
                backgroundColor: 'var(--bg-sidebar-hover, rgba(0, 0, 0, 0.04))',
                border: '1px solid var(--glass-border, rgba(0, 0, 0, 0.08))',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-main, #111827)',
                fontWeight: 600
              }}
            >
              {getTodayFormatted()}
            </span>
          </div>

          {/* Work Items Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr 140px 36px',
              gap: '12px',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-sidebar-hover, rgba(0, 0, 0, 0.03))',
              borderRadius: '8px 8px 0 0',
              border: '1px solid var(--glass-border, rgba(0, 0, 0, 0.08))',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-muted, #6b7280)',
              textTransform: 'uppercase'
            }}
          >
            <div>TITLE *</div>
            <div>WORK SUMMARY / UPDATE *</div>
            <div>STATUS *</div>
            <div></div>
          </div>

          {/* Work Items Rows */}
          <div
            style={{
              border: '1px solid var(--glass-border, rgba(0, 0, 0, 0.08))',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              padding: '12px',
              backgroundColor: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {rows.map((row) => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '170px 1fr 140px 36px',
                  gap: '12px',
                  alignItems: 'start'
                }}
              >
                {/* Title Input */}
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Task title..."
                  value={row.title}
                  onChange={(e) => handleRowChange(row.id, 'title', e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-main, #ffffff)',
                    borderColor: 'var(--glass-border, #d1d5db)',
                    color: 'var(--text-main, #111827)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.85rem'
                  }}
                  required
                />

                {/* Update Textarea */}
                <textarea
                  rows="2"
                  className="form-control form-control-sm"
                  placeholder="Summarize your main tasks and achievements for today..."
                  value={row.update}
                  onChange={(e) => handleRowChange(row.id, 'update', e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-main, #ffffff)',
                    borderColor: 'var(--glass-border, #d1d5db)',
                    color: 'var(--text-main, #111827)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                  required
                />

                {/* Status Dropdown */}
                <select
                  className="form-select form-select-sm"
                  value={row.status}
                  onChange={(e) => handleRowChange(row.id, 'status', e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-main, #ffffff)',
                    borderColor: 'var(--glass-border, #d1d5db)',
                    color: row.status === 'Completed' ? '#10b981' : row.status === 'In Progress' ? '#3b82f6' : row.status === 'Blocked' ? '#ef4444' : '#8b5cf6',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="Completed" style={{ color: '#10b981' }}>Completed</option>
                  <option value="In Progress" style={{ color: '#3b82f6' }}>In Progress</option>
                  <option value="Blocked" style={{ color: '#ef4444' }}>Blocked</option>
                  <option value="Review" style={{ color: '#8b5cf6' }}>Review</option>
                </select>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveRow(row.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#ef4444',
                    padding: '6px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove row"
                >
                  <i className="bi bi-trash fs-6"></i>
                </button>
              </div>
            ))}

            {/* Add Row Button */}
            <div className="pt-1">
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleAddRow}
                style={{
                  background: 'transparent',
                  color: '#60a5fa',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 0'
                }}
              >
                <i className="bi bi-plus-lg"></i> Add row
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--glass-border, rgba(0, 0, 0, 0.08))',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--card-bg, #ffffff)'
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              color: '#9ca3af',
              border: 'none',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleSaveDraft}
            disabled={submitting}
            style={{
              backgroundColor: 'var(--bg-sidebar-hover, rgba(0, 0, 0, 0.05))',
              color: 'var(--text-main, #111827)',
              border: '1px solid var(--glass-border, rgba(0, 0, 0, 0.1))',
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleSubmitAndCheckout}
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Submitting...
              </>
            ) : (
              'Submit & Allow Checkout'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyWorkCheckoutModal;
