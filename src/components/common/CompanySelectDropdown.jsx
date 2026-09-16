import React, { useState, useRef, useEffect } from 'react';

/**
 * CompanySelectDropdown.jsx
 * ------------------------------------------------------------------------
 * A fully custom (non-native <select>) dropdown used to pick which
 * company an admin is configuring (Settings -> "Configuring:" picker).
 *
 * Why custom instead of a plain <select>/<option> list:
 *  - Native <select>/<option> elements cannot be styled beyond very basic
 *    color/border rules (browsers render <option> using OS-native popups),
 *    so it can't match the app's rounded, theme-aware, icon-based design.
 *  - Only the company NAME is shown to the admin - no internal numeric
 *    ID clutter like "Acme Corp (ID: 4)".
 *
 * Usage:
 *   <CompanySelectDropdown
 *     companies={companies}           // [{ id, name }, ...]
 *     value={selectedCompanyId}
 *     onChange={(id) => setSelectedCompanyId(id)}
 *   />
 */
const CompanySelectDropdown = ({ companies = [], value, onChange, width = 260 }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedCompany = companies.find((c) => String(c.id) === String(value));

  // Close the dropdown when clicking anywhere outside of it.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (companyId) => {
    onChange(companyId);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width }}>
      {/* Trigger button - shows only the selected company's NAME */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="d-flex align-items-center justify-content-between w-100"
        style={{
          background: 'var(--bg-main)',
          color: 'var(--text-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '8px 14px',
          cursor: 'pointer',
          fontWeight: 500,
          minHeight: '42px'
        }}
      >
        <span className="d-flex align-items-center gap-2 text-truncate">
          <i className="bi bi-building"></i>
          <span className="text-truncate">{selectedCompany ? selectedCompany.name : 'Select company'}</span>
        </span>
        <i className={`bi bi-chevron-down ms-2`} style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}></i>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="shadow"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--surface, var(--bg-main))',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {companies.length === 0 && (
            <div className="text-muted small px-2 py-2">No companies found</div>
          )}

          {companies.map((c) => {
            const isSelected = String(c.id) === String(value);
            return (
              <div
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="d-flex align-items-center justify-content-between px-2 py-2"
                style={{
                  cursor: 'pointer',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'transparent',
                  fontWeight: isSelected ? 600 : 400
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Company NAME only - no ID shown */}
                <span className="text-truncate">{c.name}</span>
                {isSelected && <i className="bi bi-check-lg" style={{ color: '#4f46e5' }}></i>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompanySelectDropdown;