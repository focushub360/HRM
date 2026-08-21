/* Event 3rd page */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { FaClock, FaCalendarAlt, FaVideo, FaGlobe, FaUserCircle } from "react-icons/fa";
import '../App.css';

function Event3() {
  const location = useLocation();
  const {
    name,
    eventTitle,
    startTime,
    endTime,
    date,
    timezone,
    conferenceDetails,
  } = location.state || {};

  return (
    <div className="main-content">
      <div className="event-wrapper">
        <div className="event-header">
          <FaUserCircle size={64} className="event-profile-icon" />
          <h2 className="event-heading">You are scheduled</h2>
          <p className="event-subtext">A calendar invitation has been sent to your email address.</p>
        </div>

        <div className="event-card-box">
          <h4 className="event-title">{eventTitle || "Event Title"}</h4>
          <p><i className="bi bi-person-fill me-2"></i>{name || "Participant Name"}</p>
          <p><FaClock className="me-2" />{startTime}{endTime ? ` - ${endTime}` : ''}, {date}</p>
          <p><FaGlobe className="me-2" /> {timezone}</p>
          <p><FaVideo className="me-2" />{conferenceDetails}</p>

          {conferenceDetails && (
            <div className="mt-4 text-center">
              <a
                href={conferenceDetails.startsWith('http') ? conferenceDetails : `https://${conferenceDetails}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary px-4 py-2"
              >
                Join Meeting Now
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Event3;