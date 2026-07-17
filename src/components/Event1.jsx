import React, { useState } from 'react';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import './Events.css';
import profile1 from "../assets/client.jpg";
import profile2 from "../assets/EventO.png";
import { FaClock, FaCalendarAlt, FaVideo, FaGlobe } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

import { useAuth } from "../context/AuthContext";

export default function Event1() {
  const navigate = useNavigate();
  const { events } = useAuth(); // Fetch events from context

  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState("");

  const times = [
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  ];

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4" style={{ color: 'var(--text-main)' }}>📅 Event List</h2>
      <div className="row g-4">
        {/* LEFT SIDE - EVENT LIST */}
        <div className="col-lg-6">
          {events && events.length > 0 ? (
            events.map((event) => (
              <div className="card glass-card mb-4" key={event.id} style={{ overflow: 'hidden' }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center mb-4">
                    <div className="position-relative">
                      <div className="position-absolute w-100 h-100 rounded-circle bg-primary opacity-25" style={{ filter: 'blur(10px)' }}></div>
                      <img
                        src={event.image || profile2}
                        alt={event.hostName || "Host"}
                        className="rounded-circle border border-2 border-light position-relative"
                        style={{ width: 60, height: 60, objectFit: "cover" }}
                      />
                    </div>
                    <div className="ms-3">
                      <h5 className="mb-1 fw-bold" style={{ color: 'var(--text-main)' }}>{event.title}</h5>
                      <span className="badge bg-light text-primary border rounded-pill">
                        {event.visibility || 'Public'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                      <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white me-3" style={{ width: 32, height: 32 }}>
                          <FaClock size={14} />
                        </div>
                        <span>{event.duration || "N/A"}</span>
                      </li>
                      <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-info text-white me-3" style={{ width: 32, height: 32 }}>
                          <FaCalendarAlt size={14} />
                        </div>
                        <span>{event.time} - {event.date}</span>
                      </li>
                      <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white me-3" style={{ width: 32, height: 32 }}>
                          <FaVideo size={14} />
                        </div>
                        <span>{event.conferenceDetails ? "Online Meeting" : "No details provided"}</span>
                      </li>
                      <li className="d-flex align-items-center" style={{ color: 'var(--text-main)' }}>
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-warning text-white me-3" style={{ width: 32, height: 32 }}>
                          <FaGlobe size={14} />
                        </div>
                        <span>{event.timezone || "Asia/Kolkata"}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="d-grid">
                    <a
                      href={event.conferenceDetails && event.conferenceDetails.startsWith('http') ? event.conferenceDetails : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn btn-glossy w-100 ${!event.conferenceDetails ? 'disabled' : ''}`}
                    >
                      Join {event.conferenceDetails ? "Now" : "Event"}
                    </a>
                  </div>
                </div>
              </div>
            ))
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

              {/* Calendar Wrapper */}
              <div className="mb-4 d-flex justify-content-center">
                <Calendar onChange={setSelectedDate} value={selectedDate} className="shadow-sm border-0" />
              </div>

              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-uppercase opacity-75" style={{ color: 'var(--text-main)' }}>Time Zone</label>
                  <select
                    className="form-select bg-transparent text-primary fw-bold border-primary"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={{ color: 'var(--text-main)' }}
                  >
                    <option value="Asia/Kolkata">🇮🇳 Asia/Kolkata</option>
                    <option value="Asia/Yerevan">🇦🇲 Asia/Yerevan</option>
                    <option value="America/New_York">🇺🇸 New York</option>
                    <option value="Europe/London">🇬🇧 London</option>
                    <option value="Asia/Dubai">🇦🇪 Dubai</option>
                    <option value="Asia/Tokyo">🇯🇵 Tokyo</option>
                  </select>
                </div>
                <div className="col-md-6 text-end">
                  <p className="small fw-bold text-uppercase opacity-75 mb-2" style={{ color: 'var(--text-main)' }}>Selected Date</p>
                  <h5 className="fw-bold text-primary mb-0">{selectedDate.toDateString()}</h5>
                </div>
              </div>

              <hr className="my-4 opacity-25" style={{ borderColor: 'var(--text-main)' }} />

              <label className="form-label small fw-bold text-uppercase opacity-75 mb-3" style={{ color: 'var(--text-main)' }}>Available Slots</label>
              <div className="d-flex flex-wrap gap-2 justify-content-center">
                {times.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`btn btn-sm px-3 py-2 fw-semibold transition-all ${selectedTime === time ? "btn-primary shadow" : "btn-outline-primary"}`}
                    style={{ borderRadius: "8px", width: '80px' }}
                  >
                    {time}
                  </button>
                ))}
              </div>

              <div className="mt-5 d-grid">
                <button
                  className="btn btn-glossy py-3"
                  onClick={() =>
                    navigate("/event/schedule", {
                      state: {
                        date: selectedDate.toDateString(),
                        time: selectedTime,
                        timezone: timezone,
                      },
                    })
                  }
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
