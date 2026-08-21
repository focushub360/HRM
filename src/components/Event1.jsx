import React, { useMemo, useState } from 'react';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import './Events.css';
import { FaClock, FaCalendarAlt, FaVideo, FaGlobe, FaExclamationTriangle, FaUserCircle } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const parseDurationMinutes = (durationStr) => {
  if (!durationStr) return 30;
  const match = String(durationStr).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 30;
};

const formatDuration = (mins) => {
  if (mins <= 0) return "";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export default function Event1() {
  const navigate = useNavigate();
  const { events } = useAuth();

  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [validationError, setValidationError] = useState("");

  // Existing bookings for the selected date, converted to minute ranges [start, end)
  const bookedRanges = useMemo(() => {
    if (!events) return [];
    const dateStr = selectedDate.toDateString();
    return events
      .filter((e) => e.date === dateStr)
      .map((e) => {
        const start = toMinutes(e.time || e.startTime) ?? 0;
        const dur = parseDurationMinutes(e.duration);
        return { start, end: start + dur };
      });
  }, [events, selectedDate]);

  const rangesOverlap = (s, e) => bookedRanges.some((r) => s < r.end && r.start < e);

  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);

  const isRangeInvalid = startTime && endTime && endMin <= startMin;
  const hasConflict =
    !isRangeInvalid && startTime && endTime && rangesOverlap(startMin, endMin);

  const durationMinutes = startTime && endTime && !isRangeInvalid ? endMin - startMin : 0;

  const handleStartTimeChange = (t) => {
    setStartTime(t);
    setValidationError("");
  };

  const handleEndTimeChange = (t) => {
    setEndTime(t);
    setValidationError("");
  };

  const handleScheduleEvent = () => {
    if (!startTime || !endTime) {
      setValidationError("Please select a start time and an end time before scheduling.");
      return;
    }
    if (endMin <= startMin) {
      setValidationError("End time must be after the start time.");
      return;
    }
    // Re-check right before navigating away, in case something else got booked meanwhile
    if (rangesOverlap(startMin, endMin)) {
      setValidationError("This time range overlaps with an existing meeting. Please choose a different range.");
      return;
    }
    setValidationError("");
    navigate("/event/schedule", {
      state: {
        date: selectedDate.toDateString(),
        startTime,
        endTime,
        duration: formatDuration(durationMinutes),
        timezone,
      },
    });
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4" style={{ color: 'var(--text-main)' }}>Event List</h2>
      <div className="row g-4">

        {/* LEFT SIDE - EVENT LIST */}
        <div className="col-lg-6">
          {events && events.length > 0 ? (
            events.map((event) => {
              const hasLink = event.conferenceDetails && event.conferenceDetails.startsWith('http');
              return (
                <div className="card glass-card mb-4" key={event.id} style={{ overflow: 'hidden' }}>
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="avatar-circle">
                        <FaUserCircle size={36} color="#fff" />
                      </div>
                      <div className="ms-3">
                        <h5 className="mb-1 fw-bold" style={{ color: 'var(--text-main)' }}>{event.title}</h5>
                        <span className="badge bg-light text-primary border rounded-pill">
                          {event.visibility || 'Public'}
                        </span>
                      </div>
                    </div>

                    <div className="event-details-box">
                      <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                        <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                          <div className="icon-circle icon-clock">
                            <FaClock size={14} color="#fff" />
                          </div>
                          <span>{event.duration || "N/A"}</span>
                        </li>
                        <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                          <div className="icon-circle icon-calendar">
                            <FaCalendarAlt size={14} color="#fff" />
                          </div>
                          <span>{event.time || event.startTime}{event.endTime ? ` - ${event.endTime}` : ''} - {event.date}</span>
                        </li>
                        <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                          <div className="icon-circle icon-video">
                            <FaVideo size={14} color="#fff" />
                          </div>
                          <span>{event.conferenceDetails ? "Online Meeting" : "No details provided"}</span>
                        </li>
                        <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                          <div className="icon-circle icon-globe">
                            <FaGlobe size={14} color="#fff" />
                          </div>
                          <span>{event.timezone || "Asia/Kolkata"}</span>
                        </li>
                      </ul>
                    </div>

                    <div className="d-grid">
                      <a
                        href={hasLink ? event.conferenceDetails : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn-glossy w-100 py-3 ${!hasLink ? 'disabled' : ''}`}
                      >
                        Join {hasLink ? "Now" : "Event"}
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-5 card glass-card">
              <div className="mb-3 text-muted opacity-50">
                <FaCalendarAlt size={48} />
              </div>
              <h5 style={{ color: 'var(--text-main)' }}>No Upcoming Events</h5>
              <p className="text-muted">Select a date to schedule one!</p>
            </div>
          )}
        </div>

        {/* RIGHT SIDE - CALENDAR & SCHEDULE */}
        <div className="col-lg-6">
          <div className="card glass-card h-100">
            <div className="card-body p-4">
              <h5 className="mb-4 fw-bold" style={{ color: 'var(--text-main)' }}>Select a Date & Time</h5>

              <div className="mb-4 d-flex justify-content-center">
                <Calendar
                  onChange={(date) => {
                    setSelectedDate(date);
                    setStartTime("");
                    setEndTime("");
                    setValidationError("");
                  }}
                  value={selectedDate}
                  minDate={new Date()}
                  className="shadow-sm border-0"
                />
              </div>

              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase opacity-75" style={{ color: 'var(--text-main)' }}>Time Zone</label>
                  <select
                    className="form-select bg-transparent fw-bold timezone-select"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="Asia/Yerevan">Asia/Yerevan</option>
                    <option value="America/New_York">America/New York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </select>
                </div>
                <div className="col-md-6 text-end">
                  <p className="small fw-bold text-uppercase opacity-75 mb-2" style={{ color: 'var(--text-main)' }}>Selected Date</p>
                  <h5 className="fw-bold mb-0 selected-date-text">{selectedDate.toDateString()}</h5>
                </div>
              </div>

              <hr className="my-4 opacity-25" style={{ borderColor: 'var(--text-main)' }} />

              <label className="form-label small fw-bold text-uppercase opacity-75 mb-3" style={{ color: 'var(--text-main)' }}>Meeting Time</label>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label small" style={{ color: 'var(--text-main)' }}>Start Time</label>
                  <input
                    type="time"
                    className="form-control fw-bold timezone-select"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    step="60"
                  />
                  <div className="form-text">e.g. 13:30</div>
                </div>
                <div className="col-6">
                  <label className="form-label small" style={{ color: 'var(--text-main)' }}>End Time</label>
                  <input
                    type="time"
                    className="form-control fw-bold timezone-select"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    step="60"
                  />
                  <div className="form-text">e.g. 14:15</div>
                </div>
              </div>

              {startTime && endTime && !isRangeInvalid && !hasConflict && (
                <p className="small mt-2 mb-0" style={{ color: 'var(--text-main)' }}>
                  Duration: <strong>{formatDuration(durationMinutes)}</strong>
                </p>
              )}

              {(hasConflict || isRangeInvalid || validationError) && (
                <div className="validation-error" style={{ marginTop: '1rem' }}>
                  <FaExclamationTriangle className="me-2" />
                  <span>
                    {isRangeInvalid
                      ? "End time must be after the start time."
                      : hasConflict
                      ? "This time range overlaps with an existing meeting. Please pick a different range."
                      : validationError}
                  </span>
                </div>
              )}

              <div className="d-grid" style={{ marginTop: '2rem' }}>
                <button
                  className="btn-glossy py-3 w-100"
                  onClick={handleScheduleEvent}
                  disabled={!startTime || !endTime || isRangeInvalid || hasConflict}
                >
                  Schedule New Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}