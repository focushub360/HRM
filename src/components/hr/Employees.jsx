import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import AddEmployee from "./AddEmployee";

const AUTO_REFRESH_INTERVAL_MS = 8000;

const Employees = () => {
  const { user, companies, updateEmployeeInCompany, refreshDashboardData } = useAuth();
  const navigate = useNavigate();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const passwordInputRef = useRef(null);

  const isHR = user?.type === "hr" || user?.type === "company";
  const isAdmin = user?.role === "admin" && !user?.companyId; // Super Admin check

  // Auto-refresh for a "Live" experience
  useEffect(() => {
    if (!refreshDashboardData) return undefined;
    const interval = setInterval(() => {
      refreshDashboardData();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshDashboardData]);

  // Flatten all employees from all companies into one list, filtered by permissions
  const allEmployees = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    const emps = [];

    companies.forEach((comp) => {
      // HR: only their own company
      if (user?.type === "hr" && String(comp.id) !== String(user.companyId)) return;
      // Employee: only their own company
      if (user?.type === "employee" && String(comp.id) !== String(user.companyId)) return;

      (comp.employeeAccounts || []).forEach((emp) => {
        emps.push({
          ...emp,
          companyName: comp.name,
          companyId: comp.id,
          designation: emp.designation || "Employee",
          department: emp.department || "General",
          joinDate: emp.createdDate || "N/A",
          salary: emp.salary ?? "N/A",
          certificates: emp.certificates ?? 0,
          status: emp.status || "Active"
        });
      });
    });

    return emps;
  }, [companies, user]);

  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allEmployees.filter((emp) => {
      // Employee view restriction: only their own department
      if (user?.type === "employee" && emp.department !== user.department) return false;

      return (
        !term ||
        (emp.name || "").toLowerCase().includes(term) ||
        (emp.email || "").toLowerCase().includes(term) ||
        (emp.department || "").toLowerCase().includes(term)
      );
    });
  }, [allEmployees, searchTerm, user]);

  const handleDeleteEmployee = useCallback((emp) => {
    if (!window.confirm(`Are you sure you want to remove ${emp.name || "this employee"}?`)) return;

    // TODO: wire this up to a real delete endpoint, e.g.
    // useAuth().removeEmployeeFromCompany(emp.companyId, emp.id)
    setDeletingId(emp.id);
    window.alert("Delete API is not yet connected. Please implement removeEmployeeFromCompany in AuthContext.");
    setDeletingId(null);
  }, []);

  const handleViewDetails = useCallback((employee) => {
    setSelectedEmployee(employee);
    setEditForm(employee);
    setIsEditing(false);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedEmployee(null);
    setIsEditing(false);
  }, []);

  const handleMonthlyTracking = useCallback((employee) => {
    const employeeKey = employee.empId || employee.id || employee.userId || "";
    navigate(`/activity-reports?employee=${encodeURIComponent(employeeKey)}&view=logins`);
  }, [navigate]);

  const handleEditClick = useCallback(() => {
    setEditForm(selectedEmployee);
    setIsEditing(true);
  }, [selectedEmployee]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm(selectedEmployee);
  }, [selectedEmployee]);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editForm.name?.trim() || !editForm.email?.trim()) {
      window.alert("Name and Email are required");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateEmployeeInCompany(editForm.companyId, editForm.id, editForm);
      if (result) {
        window.alert("Employee updated successfully!");
        setSelectedEmployee({ ...editForm, ...result });
        setIsEditing(false);
      } else {
        window.alert("Failed to update employee");
      }
    } catch (err) {
      console.error("Failed to update employee:", err);
      window.alert("Something went wrong while updating the employee.");
    } finally {
      setIsSaving(false);
    }
  }, [editForm, updateEmployeeInCompany]);

  const handleUpdatePassword = useCallback(async () => {
    const newPass = passwordInputRef.current?.value?.trim();
    if (!newPass) {
      window.alert("Please enter a password");
      return;
    }
    if (!selectedEmployee) return;

    setIsUpdatingPassword(true);
    try {
      const res = await updateEmployeeInCompany(selectedEmployee.companyId, selectedEmployee.id, { password: newPass });
      if (res) {
        window.alert("Password updated successfully.");
        if (passwordInputRef.current) passwordInputRef.current.value = "";
      } else {
        window.alert("Failed to update password");
      }
    } catch (err) {
      console.error("Failed to update password:", err);
      window.alert("Something went wrong while updating the password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }, [selectedEmployee, updateEmployeeInCompany]);

  // ---------------------------------------------------------------------
  // Add Employee view
  // ---------------------------------------------------------------------
  if (showAddForm && isHR) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            background: "var(--bg-card, #fff)",
            flexShrink: 0
          }}
        >
          <button
            onClick={() => setShowAddForm(false)}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center me-3"
            style={{ fontWeight: 600 }}
          >
            <i className="bi bi-arrow-left me-2"></i> Back to Employee List
          </button>
          <h4 className="mb-0 fw-bold" style={{ color: "var(--text-main, #2d3748)" }}>Add New Employee</h4>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: "20px",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch"
          }}
        >
          <AddEmployee />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Employee detail / edit view
  // ---------------------------------------------------------------------
  if (selectedEmployee) {
    const inputStyle = {
      backgroundColor: "var(--bg-main)",
      color: "var(--text-main)",
      borderColor: "var(--border-color)"
    };

    return (
      <div style={{ height: "100%", overflowY: "auto", padding: "0 4px" }}>
        <button onClick={handleBackToList} className="btn btn-secondary mb-3">
          <i className="bi bi-arrow-left"></i> Back to Employee List
        </button>

        <div className="row">
          <div className="col-md-8">
            <div className="card shadow-sm mb-4 border-0" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}>
              <div
                className="card-header border-bottom py-3 d-flex justify-content-between align-items-center"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
              >
                <h5 className="mb-0 fw-bold text-primary">
                  <i className="bi bi-person-lines-fill me-2"></i>Employee Details
                </h5>
                {isHR && !isEditing && (
                  <button className="btn btn-sm btn-outline-primary fw-bold" onClick={handleEditClick}>
                    <i className="bi bi-pencil me-1"></i> Edit
                  </button>
                )}
                {isEditing && (
                  <div>
                    <button className="btn btn-sm btn-outline-danger me-2" onClick={handleCancelEdit} disabled={isSaving}>
                      Cancel
                    </button>
                    <button className="btn btn-sm btn-success fw-bold" onClick={handleSaveEdit} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="card-body p-4">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: "var(--text-muted)" }}>Full Name</h6>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={editForm.name || ""}
                        onChange={handleEditChange}
                        style={inputStyle}
                      />
                    ) : (
                      <p className="lead fw-bold mb-0" style={{ color: "var(--text-main)" }}>{selectedEmployee.name || "—"}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: "var(--text-muted)" }}>Email</h6>
                    {isEditing ? (
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={editForm.email || ""}
                        onChange={handleEditChange}
                        style={inputStyle}
                      />
                    ) : (
                      <p className="mb-0" style={{ color: "var(--text-main)" }}>{selectedEmployee.email || "—"}</p>
                    )}
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: "var(--text-muted)" }}>Designation</h6>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control"
                        name="designation"
                        value={editForm.designation || ""}
                        onChange={handleEditChange}
                        style={inputStyle}
                      />
                    ) : (
                      <p className="mb-0" style={{ color: "var(--text-main)" }}>{selectedEmployee.designation}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: "var(--text-muted)" }}>Department</h6>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-control"
                        name="department"
                        value={editForm.department || ""}
                        onChange={handleEditChange}
                        style={inputStyle}
                      />
                    ) : (
                      <p className="mb-0" style={{ color: "var(--text-main)" }}>{selectedEmployee.department}</p>
                    )}
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: "var(--text-muted)" }}>Join Date</h6>
                    {isEditing ? (
                      <input
                        type="date"
                        className="form-control"
                        name="joinDate"
                        value={editForm.joinDate || ""}
                        onChange={handleEditChange}
                        style={inputStyle}
                      />
                    ) : (
                      <p className="mb-0" style={{ color: "var(--text-main)" }}>{selectedEmployee.joinDate}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: "var(--text-muted)" }}>Salary</h6>
                    {isEditing ? (
                      <input
                        type="number"
                        className="form-control"
                        name="salary"
                        value={editForm.salary ?? ""}
                        onChange={handleEditChange}
                        style={inputStyle}
                      />
                    ) : (
                      <p className="fw-bold text-success mb-0" style={{ fontSize: "1.1rem" }}>{selectedEmployee.salary}</p>
                    )}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12">
                    <h6 className="text-uppercase small fw-bold" style={{ color: "var(--text-muted)" }}>Status</h6>
                    {isEditing ? (
                      <select
                        className="form-select"
                        name="status"
                        value={editForm.status || "Active"}
                        onChange={handleEditChange}
                        style={inputStyle}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Probation">Probation</option>
                      </select>
                    ) : (
                      <span
                        className={`badge px-3 py-2 ${
                          selectedEmployee.status === "Active"
                            ? "bg-success-subtle text-success border border-success"
                            : "bg-warning-subtle text-warning border border-warning"
                        }`}
                      >
                        {selectedEmployee.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow-sm mb-4 border-0" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}>
              <div className="card-header border-bottom py-3" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                <h5 className="mb-0 fw-bold text-info"><i className="bi bi-award me-2"></i>Certificates</h5>
              </div>
              <div className="card-body p-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-patch-check-fill text-info display-4 opacity-50"></i>
                </div>
                <p className="text-muted mb-3">
                  Total Certificates:{" "}
                  <strong className="text-info fs-4 ms-2">{selectedEmployee.certificates}</strong>
                </p>
                <button className="btn btn-outline-info w-100">
                  <i className="bi bi-file-earmark-pdf me-2"></i> View Certificates
                </button>
              </div>
            </div>

            {isHR && (
              <div className="card shadow-sm border-start border-warning border-5" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)" }}>
                <div className="card-header py-3" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                  <h5 className="mb-0 fw-bold text-warning"><i className="bi bi-shield-lock me-2"></i>Security Settings</h5>
                </div>
                <div className="card-body p-4">
                  <div className="mb-0">
                    <label className="form-label small fw-bold" style={{ color: "var(--text-muted)" }}>Update Password</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="New Password"
                        ref={passwordInputRef}
                        style={inputStyle}
                        disabled={isUpdatingPassword}
                      />
                      <button
                        className="btn btn-outline-warning"
                        type="button"
                        onClick={handleUpdatePassword}
                        disabled={isUpdatingPassword}
                      >
                        {isUpdatingPassword ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        ) : (
                          "Update"
                        )}
                      </button>
                    </div>
                    <small className="d-block mt-2" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      *Changes reflect immediately for the employee.
                    </small>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Employee list view
  // ---------------------------------------------------------------------
  const cellStyle = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", fontSize: "0.85rem", padding: "10px 8px" };
  const thStyle = { ...cellStyle, fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#fff" };

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", overflow: "hidden", padding: "16px 20px 0", boxSizing: "border-box" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-main)" }}>Employees</h1>
          <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: "0.7rem", padding: "4px 8px" }}>
            <span className="rounded-circle bg-white" style={{ width: 5, height: 5 }}></span>
            LIVE
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {isHR && (
            <>
              <button onClick={() => navigate("/hr/leave")} className="btn btn-outline-primary btn-sm">
                <i className="bi bi-calendar-check-fill me-1"></i>Manage Leaves
              </button>
              <button onClick={() => setShowAddForm(true)} className="btn btn-primary btn-sm">
                <i className="bi bi-plus-circle me-1"></i>Add New Employee
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search by name, email, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ borderRadius: 8, fontSize: "0.85rem" }}
        />
      </div>

      {/* Table card */}
      <div className="card shadow-sm" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 10 }}>
        <div className="card-header" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "10px 16px", flexShrink: 0 }}>
          <h5 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
            Employee Directory ({filteredEmployees.length})
          </h5>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "15%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Designation</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Salary</th>
                <th style={thStyle}>Certs</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px 12px", textAlign: "center", color: "var(--text-muted, #6b7280)" }}>
                    No employees match your current search/filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={`${emp.companyId}-${emp.id}`}
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", transition: "background 0.15s" }}
                    onMouseOver={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.04)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ ...cellStyle, fontWeight: 600, color: "var(--text-main)" }} title={emp.name}>{emp.name}</td>
                    <td style={{ ...cellStyle, color: "var(--text-muted, #6b7280)" }} title={emp.companyName}>{emp.companyName}</td>
                    <td style={cellStyle} title={emp.designation}>{emp.designation}</td>
                    <td style={{ ...cellStyle, fontSize: "0.8rem" }} title={emp.email}>{emp.email}</td>
                    <td style={cellStyle}>
                      <span className={`badge ${emp.status === "Active" ? "bg-success" : "bg-warning"}`} style={{ fontSize: "0.7rem" }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={cellStyle}>{emp.salary}</td>
                    <td style={{ ...cellStyle, textAlign: "center" }}>
                      <span className="badge bg-info" style={{ fontSize: "0.7rem" }}>{emp.certificates}</span>
                    </td>
                    <td style={{ ...cellStyle, overflow: "visible" }}>
                      <div className="d-flex align-items-center gap-2 justify-content-end">
                        <div className="dropdown dropup">
                          <button
                            className="btn btn-sm btn-light border d-flex align-items-center justify-content-center"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            title="More actions"
                            style={{ width: "32px", height: "32px", padding: 0 }}
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 mb-2 mt-0" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                            <li>
                              <button className="dropdown-item" onClick={() => handleViewDetails(emp)} style={{ color: "var(--text-main)" }}>
                                <i className="bi bi-eye me-2"></i> View Details
                              </button>
                            </li>
                            <li>
                              <button className="dropdown-item" onClick={() => handleMonthlyTracking(emp)} style={{ color: "var(--text-main)" }}>
                                <i className="bi bi-graph-up-arrow me-2"></i> Monthly Tracking
                              </button>
                            </li>
                          </ul>
                        </div>
                        {isHR && (
                          <button
                            onClick={() => handleDeleteEmployee(emp)}
                            className="btn btn-sm btn-danger"
                            title="Delete"
                            style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                            disabled={deletingId === emp.id}
                          >
                            {deletingId === emp.id ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            ) : (
                              <i className="bi bi-trash"></i>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;