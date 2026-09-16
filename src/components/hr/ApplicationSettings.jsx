import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

/**
 * ApplicationSettings.jsx
 * ------------------------------------------------------------------------
 * Admin Settings -> "Application Settings" tab.
 *
 * WHY THIS FILE EXISTS
 * Every organization using this HRMS has different needs for how their
 * employees check in/out and which modules they want switched on:
 *   - Some companies want BOTH GPS location AND camera/face verification
 *     for attendance.
 *   - Some only want GPS location (no camera).
 *   - Some don't want the Chat module at all.
 *   - Some don't need the Task/Project Management module.
 *   - ...and so on for every other optional/add-on module.
 *
 * Instead of hardcoding this per company in the codebase, the Company
 * Admin (super admin) flips a single ON/OFF toggle here, per company.
 * The moment it's saved, it applies everywhere for that company - HR
 * and every employee under it. This is enforced by calling
 * `isFeatureEnabled('someKey')` (from AuthContext) in every component
 * that renders/uses that feature, for example:
 *   - src/components/employee/EmployeeDashboard.jsx  -> attendance camera/location
 *   - src/App.jsx                                    -> global FaceProctoring / LiveGPSTracker
 *   - src/components/SideBar.jsx                     -> hides nav items for disabled modules
 *   - src/components/Chat.jsx                        -> blocks direct URL access
 *   - src/components/hr/ProjectManagement.jsx        -> blocks direct URL access
 *
 * ALL toggle keys live in ONE place (the `TOGGLE_GROUPS` config array
 * below) as requested - add a new toggle by adding one object to that
 * array; nothing else in this file needs to change to add a new toggle.
 *
 * Every toggle defaults to `true` (ON) on the backend (see
 * backend/src/models/Company.js -> featureSettingsSchema), so a company
 * that never touches this page keeps working exactly as it did before
 * this feature existed.
 */

// ---------------------------------------------------------------------
// TOGGLE CONFIG - the single source of truth for every feature switch.
// ---------------------------------------------------------------------
// key         : must match backend/src/models/Company.js -> featureSettingsSchema
// label       : text shown next to the switch
// description : helper text shown under the label
// icon        : bootstrap icon class
const TOGGLE_GROUPS = [
  {
    title: 'Attendance / Check-In & Check-Out',
    description: 'Controls what employees must provide to Check In or Check Out for the day.',
    toggles: [
      {
        key: 'attendanceLocationEnabled',
        label: 'Location (GPS) Tracking',
        description: 'Require employees to share their GPS location when they check in / check out. Turn this OFF for organizations that don\u2019t need location-based attendance.',
        icon: 'bi-geo-alt-fill'
      },
      {
        key: 'attendanceCameraEnabled',
        label: 'Camera / Face Verification',
        description: 'Require webcam capture and live face-proctoring during check in / check out. Turn this OFF for organizations that only want location tracking, with no camera involved.',
        icon: 'bi-camera-video-fill'
      }
    ]
  },
  {
    title: 'Collaboration & Add-on Modules',
    description: 'Turn entire modules on or off for this company. Disabled modules disappear from the sidebar for HR and employees alike.',
    toggles: [
      {
        key: 'chatEnabled',
        label: 'Chat System',
        description: 'Internal real-time messaging between HR, admins, and employees.',
        icon: 'bi-chat-dots-fill'
      },
      {
        key: 'taskManagementEnabled',
        label: 'Task / Project Management',
        description: 'Project boards, task assignment, and progress tracking.',
        icon: 'bi-kanban-fill'
      },
      {
        key: 'liveTrackingEnabled',
        label: 'Live GPS Tracking (HR view)',
        description: 'Lets HR view a live map of field employees\u2019 locations during work hours.',
        icon: 'bi-broadcast'
      },
      {
        key: 'recognitionEnabled',
        label: 'Recognition / Kudos Wall',
        description: 'Peer-to-peer recognition and shout-outs feed.',
        icon: 'bi-award-fill'
      },
      {
        key: 'feedEnabled',
        label: 'Company Feed',
        description: 'Social-style announcement and update feed for the company.',
        icon: 'bi-newspaper'
      },
      {
        key: 'eventsEnabled',
        label: 'Events Calendar',
        description: 'Company events, town-halls, and calendar invites.',
        icon: 'bi-calendar-event-fill'
      },
      {
        key: 'salesModuleEnabled',
        label: 'Sales Module',
        description: 'Sales Leads, Visits, and Sales Tasks tracking for field sales teams.',
        icon: 'bi-graph-up-arrow'
      }
    ]
  }

  // -----------------------------------------------------------------
  // NOT TOGGLED ON PURPOSE (left here as documentation, per request -
  // "if the want to work for all i comment that"):
  //
  // - Leave Management        -> statutory/HR-critical, must always be
  //                              available to every company, every employee.
  // - Payroll                 -> core HR function, always available.
  // - Activity Reports / Logs -> underlying audit trail, always recorded
  //                              regardless of which optional modules are
  //                              switched on, so HR/Admin can always see
  //                              login/logout/session history.
  // - Profile / My Attendance -> personal, always-available screens for
  //                              every logged-in user; nothing to gate.
  //
  // If any of these ever need a toggle in the future, add them to a new
  // group above using the exact same shape - no other code changes
  // needed besides also adding the matching key + default to
  // backend/src/models/Company.js.
  // -----------------------------------------------------------------
];

const ApplicationSettings = ({ companyId }) => {
  const { user, companies, updateFeatureSettings } = useAuth();
  const { theme } = useTheme();

  // Local editable copy of the toggle state (so switching feels instant,
  // then we persist to backend on "Save Changes").
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isAdmin = user?.type === 'company' || user?.type === 'company_admin';

  // Load the current company's saved feature settings whenever the
  // selected company changes (Settings.jsx passes companyId down from
  // its own multi-company selector).
  useEffect(() => {
    const company = companies.find((c) => String(c.id) === String(companyId));
    setSettings({ ...(company?.featureSettings || {}) });
    setDirty(false);
    setMessage({ type: '', text: '' });
  }, [companyId, companies]);

  // A toggle with no explicit value yet defaults to ON (true) - matches
  // the backend schema default, so a brand-new company still shows every
  // switch as enabled until an admin turns something off.
  const isOn = (key) => settings[key] !== false;

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !isOn(key) }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    const result = await updateFeatureSettings(companyId, settings);

    if (result) {
      setMessage({ type: 'success', text: 'Application settings updated successfully! Changes apply immediately for this company\u2019s HR and employees.' });
      setDirty(false);
    } else {
      setMessage({ type: 'error', text: 'Failed to update application settings. Please try again.' });
    }
    setSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="alert alert-danger">
        Only Company Admins can manage Application Settings.
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/*
        Scoped CSS for the toggle switches below.
        NOTE: the app has a global rule (src/theme.css) that forces EVERY
        <input> element to `background:#fff !important; min-height:42px;`
        for text-field styling. That rule was silently stomping Bootstrap's
        `.form-switch` knob/track styling, making every toggle render as a
        plain flat white box instead of a switch. Fix: hide the real
        checkbox (opacity: 0) and draw the pill/knob ourselves with a
        sibling <span>, the same technique this app already uses for its
        dark/light theme switch (see .theme-switch in App.css) - the
        global input reset can't visually affect an invisible checkbox.
      */}
      <style>{`
        .app-toggle { position: relative; display: inline-block; width: 46px; height: 24px; flex-shrink: 0; }
        .app-toggle input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; z-index: 2; }
        .app-toggle .app-toggle-slider {
          position: absolute; inset: 0; background-color: #cbd5e1;
          border-radius: 34px; transition: background-color 0.2s ease;
        }
        .app-toggle .app-toggle-slider::before {
          content: ""; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px;
          background-color: #ffffff; border-radius: 50%; transition: transform 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .app-toggle input:checked + .app-toggle-slider { background-color: #22c55e; }
        .app-toggle input:checked + .app-toggle-slider::before { transform: translateX(22px); }
        .app-toggle input:focus-visible + .app-toggle-slider { box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3); }
      `}</style>

      <h4 className="border-bottom border-secondary pb-3 mb-4">Application Settings</h4>

      <div
        className="alert border-0 mb-4"
        style={{
          background: theme === 'dark' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(6, 182, 212, 0.12)',
          color: theme === 'dark' ? '#22d3ee' : '#0e7490'
        }}
      >
        <i className="bi bi-info-circle me-2"></i>
        Toggle any feature ON or OFF for <b>this company only</b>. When a toggle is OFF, that
        feature is hidden and disabled for every HR user and employee under this company - no
        code changes or redeploys required.
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
        </div>
      )}

      {TOGGLE_GROUPS.map((group) => (
        <div key={group.title} className="mb-4">
          <h5 style={{ color: 'var(--text-main)' }}>{group.title}</h5>
          <p className="text-muted small mb-3">{group.description}</p>

          <div className="row g-3">
            {group.toggles.map((toggle) => (
              <div className="col-md-6" key={toggle.key}>
                <div
                  className="d-flex align-items-start justify-content-between p-3 h-100"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px'
                  }}
                >
                  <div className="d-flex gap-3">
                    <i className={`bi ${toggle.icon} fs-4`} style={{ color: isOn(toggle.key) ? '#22c55e' : '#94a3b8' }}></i>
                    <div>
                      <div className="fw-semibold" style={{ color: 'var(--text-main)' }}>{toggle.label}</div>
                      <div className="text-muted small">{toggle.description}</div>
                    </div>
                  </div>

                  {/* The actual toggle button switch - custom, see <style> above */}
                  <label className="app-toggle ms-2" htmlFor={`toggle-${toggle.key}`}>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={isOn(toggle.key)}
                      onChange={() => handleToggle(toggle.key)}
                      id={`toggle-${toggle.key}`}
                    />
                    <span className="app-toggle-slider"></span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="d-flex justify-content-end mt-4">
        <button
          className="btn btn-primary px-4"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default ApplicationSettings;