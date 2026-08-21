import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaClock, FaCalendarAlt, FaVideo, FaGlobe, FaUserCircle, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import "../App.css";

const toMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const parseDurationMinutes = (durationStr) => {
  if (!durationStr) return 30;
  const match = String(durationStr).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 30;
};

// NOTE: adjust this to match your actual event-dashboard route
const DASHBOARD_ROUTE = "/events";

const Events2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { submitEvent, user, events } = useAuth();

  // Received from Event1 via navigate state
  const { date, startTime, endTime, duration, timezone } = location.state || {};

  // States for form inputs - Prefill from User
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [eventTitle, setEventTitle] = useState("");
  const [conferenceDetails, setConferenceDetails] = useState("");
  const [visibility, setVisibility] = useState("company");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Guard: block submission if this exact date/time range overlaps an existing event
  const isSlotTaken = useMemo(() => {
    if (!events || !date || !startTime || !endTime) return false;
    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);
    return events
      .filter((e) => e.date === date)
      .some((e) => {
        const s = toMinutes(e.time || e.startTime);
        const d = parseDurationMinutes(e.duration);
        const eEnd = s + d;
        return newStart < eEnd && s < newEnd;
      });
  }, [events, date, startTime, endTime]);

  const validate = () => {
    if (!eventTitle.trim()) return "Event title is required.";
    if (!name.trim()) return "Your name is required.";
    if (!email.trim()) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";
    if (!conferenceDetails.trim()) return "Meeting link is required.";
    if (!/^https?:\/\/\S+/.test(conferenceDetails.trim())) return "Meeting link must be a valid URL starting with http(s)://";
    if (!date || !startTime || !endTime) return "Please go back and select a date, start time, and end time.";
    if (isSlotTaken) return "This time range has already been booked. Please choose another time.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    setIsSubmitting(true);

    const eventData = {
      name,
      email,
      title: eventTitle,
      conferenceDetails, // Link
      duration,
      date: date || new Date().toDateString(),
      time: startTime || "10:00", // kept as "time" for backward compatibility
      startTime: startTime || "10:00",
      endTime: endTime || "",
      timezone: timezone || "Asia/Kolkata",
      visibility, // 'company', 'hr', 'office', 'sales'
      organizerId: user?.empId,
      organizerName: user?.name
    };

    // Save to Backend
    const result = await submitEvent(eventData);

    setIsSubmitting(false);

    if (result) {
      navigate("/event/confirmation", {
        state: {
          ...eventData,
          eventTitle
        },
      });
    } else {
      setFormError("Failed to schedule event. Please try again.");
    }
  };

  const handleCancel = () => {
    navigate(DASHBOARD_ROUTE);
  };

  return (
    <div className="container my-4">
      {/* Back to dashboard */}
      <button
        type="button"
        className="btn btn-link p-0 mb-3 d-inline-flex align-items-center gap-2 text-decoration-none"
        onClick={() => navigate(DASHBOARD_ROUTE)}
      >
        <FaArrowLeft /> Back to Event Dashboard
      </button>

      <div className="row g-4">
        {/* Event Details Preview */}
        <div className="col-md-6">
          <div className="card shadow-sm p-4">
            <div className="d-flex align-items-center gap-3 mb-4">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Organizer"
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #6A7ADA",
                  }}
                />
              ) : (
                <FaUserCircle size={60} className="text-primary" />
              )}
              <div>
                <div className="fw-medium text-dark">{name || "Organizer"}</div>
                <h2 className="fw-bold fs-5 mb-0 text-primary">
                  {eventTitle || "Event Title"}
                </h2>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2">
              <FaClock />
              <span className="text-muted fst-italic small">
                {startTime && endTime ? `${startTime} - ${endTime}, ${date}` : "Date & Time will be set"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2">
              <FaCalendarAlt />
              <span className="text-muted fst-italic small">
                {duration || "Duration not set"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2">
              <FaVideo />
              <span className="text-muted fst-italic small">
                {conferenceDetails ||
                  "Web conferencing details provided upon confirmation."}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <FaGlobe />
              <span className="text-muted fst-italic small">
                {timezone || "Asia/Kolkata"}
              </span>
            </div>

            {isSlotTaken && (
              <div className="validation-error mt-3">
                <FaExclamationTriangle className="me-2" />
                <span>This time range has already been booked. Go back and pick a different time.</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className="col-md-6">
          <div className="card shadow-sm p-4">
            <h2 className="fw-bold fs-5 text-primary mb-3">
              Schedule Event
            </h2>
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label">Event Title <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter event title"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Email <span className="text-danger">*</span></label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Target Module / Team <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  required
                >
                  <option value="company">Entire Company (General Events)</option>
                  <option value="hr">HR Department (HR Dashboard)</option>
                  <option value="office">Office Employees (Dashboard)</option>
                  <option value="sales">Sales Team (Sales Dashboard)</option>
                </select>
                <div className="form-text">Event will appear in the selected module.</div>
              </div>

              <div className="mb-3">
                <label className="form-label">Duration</label>
                <input
                  type="text"
                  className="form-control"
                  value={duration || ""}
                  disabled
                  readOnly
                />
                <div className="form-text">Calculated automatically from the start/end time you picked.</div>
              </div>

              <div className="mb-3">
                <label className="form-label">Meeting Link <span className="text-danger">*</span></label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={conferenceDetails}
                  onChange={(e) => setConferenceDetails(e.target.value)}
                  required
                />
                <div className="form-text">Paste your Google Meet, Teams, or Zoom link here.</div>
              </div>

              {formError && (
                <div className="validation-error mb-3">
                  <FaExclamationTriangle className="me-2" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="d-flex gap-2">
              <button
  type="button"
  className="btn btn-danger flex-fill"
  onClick={handleCancel}
  disabled={isSubmitting}
>
  Cancel
</button>
                <button
                  type="submit"
                  className="btn btn-primary flex-fill"
                  disabled={isSubmitting || isSlotTaken}
                >
                  {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>

              <p className="mt-3 small text-muted text-center">
                By clicking Confirm, you agree to the company event policies.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events2;