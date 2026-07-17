import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaClock, FaCalendarAlt, FaVideo, FaGlobe, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import eventImg from "../assets/EventO.png";
import "../App.css";

const Events2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { submitEvent, user } = useAuth(); // Get user

  // Received from Event1 via navigate state
  const { date, time, timezone } = location.state || {};

  // States for form inputs - Prefill from User
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [eventTitle, setEventTitle] = useState("");
  const [conferenceDetails, setConferenceDetails] = useState("");
  const [duration, setDuration] = useState("30 min");
  const [visibility, setVisibility] = useState("company");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const eventData = {
      name,
      email,
      title: eventTitle,
      conferenceDetails, // Link
      duration,
      date: date || new Date().toDateString(),
      time: time || "10:00 AM", // Fallback if direct access
      timezone: timezone || "Asia/Kolkata",
      visibility, // 'company', 'hr', 'office', 'sales'
      organizerId: user?.empId,
      organizerName: user?.name
    };

    // Save to Backend
    const result = await submitEvent(eventData);

    setIsSubmitting(false);

    if (result) {
      if (visibility === 'sales') {
        // If targeted at Sales, maybe navigate or alert?
        // Standard flow is confirmation page.
      }

      navigate("/event/confirmation", {
        state: {
          ...eventData,
          eventTitle
        },
      });
    } else {
      alert("Failed to schedule event. Please try again.");
    }
  };

  return (
    <div className="container my-4">
      <div className="row g-4">
        {/* Event Details */}
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
                {time ? `${time} - ${date}` : "Date & Time will be set"}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2 mb-2">
              <FaCalendarAlt />
              <span className="text-muted fst-italic small">
                {duration}
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
          </div>
        </div>

        {/* Form Section */}
        <div className="col-md-6">
          <div className="card shadow-sm p-4">
            <h2 className="fw-bold fs-5 text-primary mb-3">
              Schedule Event
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Event Title</label>
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
                <label className="form-label">Name</label>
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
                <label className="form-label">Email</label>
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
                <label className="form-label">Target Module / Team</label>
                <select
                  className="form-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
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
                  placeholder="e.g. 30 min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label mb-0">Meeting Link</label>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.open('https://meet.google.com/new', '_blank');
                        setConferenceDetails('https://meet.google.com/');
                      }}
                      className="btn btn-sm d-flex align-items-center gap-1 border-0 p-0 px-2"
                      style={{ background: 'rgba(52, 168, 83, 0.1)', color: '#34A853', fontSize: '0.75rem', fontWeight: 'bold' }}
                      title="Create Google Meet"
                    >
                      <i className="bi bi-google"></i> Meet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open('https://teams.microsoft.com/l/meeting/new', '_blank');
                        setConferenceDetails('https://teams.microsoft.com/');
                      }}
                      className="btn btn-sm d-flex align-items-center gap-1 border-0 p-0 px-2"
                      style={{ background: 'rgba(70, 78, 184, 0.1)', color: '#464EB8', fontSize: '0.75rem', fontWeight: 'bold' }}
                      title="Create MS Teams"
                    >
                      <i className="bi bi-microsoft"></i> Teams
                    </button>
                  </div>
                </div>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://meet.google.com/..."
                  value={conferenceDetails}
                  onChange={(e) => setConferenceDetails(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
              </button>

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
