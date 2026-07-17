import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FaSync, FaTrophy, FaPaperPlane } from 'react-icons/fa';

const Recognition = () => {
  const { user, companies, recognitions, submitRecognition, fetchRecognitions } = useAuth();

  // Form State
  const [recipient, setRecipient] = useState(""); // json string of {id, name}
  const [badge, setBadge] = useState("🏆 Outstanding Performance");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecognitions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchRecognitions]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecognitions();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Get Employees for this HR's company
  const companyEmployees = useMemo(() => {
    if (!user?.companyId) return [];

    // Find company
    const myCompany = companies.find(c => c.id === user.companyId);
    return myCompany?.employeeAccounts || [];
  }, [companies, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient) {
      alert("Please select an employee.");
      return;
    }

    setIsSubmitting(true);
    const recipientObj = JSON.parse(recipient); // {id, name}

    const badgeParts = badge.split(" ");
    const badgeIcon = badgeParts[0];
    const badgeTitle = badgeParts.slice(1).join(" ");

    const success = await submitRecognition({
      recipientId: recipientObj.id,
      recipientName: recipientObj.name,
      badge: badgeIcon,
      title: badgeTitle,
      description: message
    });

    setIsSubmitting(false);
    if (success) {
      setMessage("");
      setRecipient("");
      alert("Recognition Sent!");
    } else {
      alert("Failed to send.");
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Employee Recognition</h1>
            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-4 rounded-pill shadow-sm border-0"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh Feed"
            >
              <FaSync className={isRefreshing ? 'spin-animation' : ''} /> Refresh
            </button>
          </div>

          {/* Recognition Form (Only for HR/Admin) */}
          {(user?.role === 'hr' || user?.role === 'admin' || user?.role === 'company_admin') && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Recognize an Employee</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Employee Name</label>
                      <select
                        className="form-select"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        required
                      >
                        <option value="">Select an employee...</option>
                        {companyEmployees.map(emp => (
                          <option key={emp.id} value={JSON.stringify({ id: emp.id, name: emp.name })}>
                            {emp.name} ({emp.position || "Employee"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Badge</label>
                      <select
                        className="form-select"
                        value={badge}
                        onChange={(e) => setBadge(e.target.value)}
                      >
                        <option>🏆 Outstanding Performance</option>
                        <option>⭐ Team Player</option>
                        <option>🚀 Innovation Leader</option>
                        <option>💡 Problem Solver</option>
                        <option>👍 Great Attitude</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Recognition Message</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Write your recognition message here..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="submit" className="btn btn-primary px-4 rounded-pill shadow-sm d-flex align-items-center gap-2" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : <><FaPaperPlane /> Send Recognition</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Recognition Feed */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">Recent Recognitions</h4>
            {isRefreshing && <small className="text-muted">Updating...</small>}
          </div>

          {recognitions && recognitions.length > 0 ? (
            recognitions.map((rec) => (
              <div className="card shadow-sm mb-3" key={rec.id}>
                <div className="card-body">
                  <div className="d-flex align-items-start gap-3">
                    <div style={{ fontSize: "2rem" }}>{rec.badge}</div>
                    <div className="flex-grow-1">
                      <h5 className="mb-2">{rec.title}</h5>
                      <p className="mb-2">
                        <strong>{rec.recipientName}</strong> recognized by <strong>{rec.recognizerName}</strong>
                      </p>
                      <p className="mb-2 text-muted">{rec.description}</p>
                      <small className="text-muted">{new Date(rec.date).toLocaleDateString()}</small>
                    </div>
                  </div>
                </div>
              </div>
            ))) : (
            <div className="text-center p-5 text-muted bg-light rounded">
              <h5>No recognitions yet.</h5>
              <p>Be the first to recognize a colleague!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recognition;
