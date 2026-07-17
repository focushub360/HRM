import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import AddEmployee from "./AddEmployee";

const Employees = () => {
  const { user, companies, updateEmployeeInCompany, refreshDashboardData } = useAuth();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Auto-refresh for "Live" experience
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (refreshDashboardData) refreshDashboardData();
    }, 8000);
    return () => clearInterval(interval);
  }, [refreshDashboardData]);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const isHR = user?.type === "hr" || user?.type === "company";
  const isAdmin = user?.role === 'admin' && !user?.companyId; // Super Admin check

  // Flatten all employees from all companies into one list but filter based on permissions
  const allEmployees = React.useMemo(() => {
    let emps = [];
    companies.forEach(comp => {
      // HR: Only show own company
      if (user?.type === 'hr' && String(comp.id) !== String(user.companyId)) {
        return;
      }

      // Employee: Only show own company (and later filter by dept)
      if (user?.type === 'employee' && String(comp.id) !== String(user.companyId)) {
        return;
      }

      if (comp.employeeAccounts) {
        comp.employeeAccounts.forEach(emp => {
          emps.push({
            ...emp,
            companyName: comp.name,
            companyId: comp.id,
            designation: emp.designation || "Employee",
            department: emp.department || "General",
            joinDate: emp.createdDate || "N/A",
            salary: emp.salary || "N/A",
            certificates: emp.certificates || 0,
            status: emp.status || "Active"
          });
        });
      }
    });
    return emps;
  }, [companies, user]);

  const filteredEmployees = allEmployees.filter((emp) => {
    // Employee View Restriction: Only see same department
    if (user?.type === 'employee' && emp.department !== user.department) {
      return false;
    }

    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCompany = selectedCompany ? emp.companyId === parseInt(selectedCompany) : true;

    return matchesSearch && matchesCompany;
  });

  const handleDeleteEmployee = (id) => {
    if (window.confirm("Are you sure you want to remove this employee?")) {
      // In real app, call delete API here (useAuth().removeEmployeeFromCompany)
      alert("Please implement delete API connection in Employees.jsx");
    }
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setEditForm(employee); // Reset edit form
    setIsEditing(false);   // Reset edit mode
  };

  const handleEditClick = () => {
    setEditForm(selectedEmployee);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(selectedEmployee);
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.email) {
      alert("Name and Email are required");
      return;
    }

    console.log("Saving employee:", editForm);
    const result = await updateEmployeeInCompany(editForm.companyId, editForm.id, editForm);

    if (result) {
      alert("Employee updated successfully!");
      setSelectedEmployee({ ...editForm, ...result }); // Update view
      setIsEditing(false);
    } else {
      alert("Failed to update employee");
    }
  };

  if (showAddForm && isHR) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', background: '#fff', flexShrink: 0 }}>
          <button
            onClick={() => setShowAddForm(false)}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center me-3"
            style={{ fontWeight: 600 }}
          >
            <i className="bi bi-arrow-left me-2"></i> Back to Employee List
          </button>
          <h4 className="mb-0 fw-bold" style={{ color: '#2d3748' }}>Add New Employee</h4>
        </div>
        <div style={{ flex: 1, padding: '20px', overflow: 'hidden', display: 'flex' }}>
          <AddEmployee />
        </div>
      </div>
    );
  }

  if (selectedEmployee) {
    return (
      <div>
        <button
          onClick={() => setSelectedEmployee(null)}
          className="btn btn-secondary mb-3"
        >
          <i className="bi bi-arrow-left"></i> Back to Employee List
        </button>
        <div className="row">
          <div className="col-md-8">
            <div className="card shadow-sm mb-4 border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
              <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h5 className="mb-0 fw-bold text-primary"><i className="bi bi-person-lines-fill me-2"></i>Employee Details</h5>
                {isHR && !isEditing && (
                  <button className="btn btn-sm btn-outline-primary fw-bold" onClick={handleEditClick}>
                    <i className="bi bi-pencil me-1"></i> Edit
                  </button>
                )}
                {isEditing && (
                  <div>
                    <button className="btn btn-sm btn-outline-danger me-2" onClick={handleCancelEdit}>Cancel</button>
                    <button className="btn btn-sm btn-success fw-bold" onClick={handleSaveEdit}>Save</button>
                  </div>
                )}
              </div>
              <div className="card-body p-4">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: 'var(--text-muted)' }}>Full Name</h6>
                    {isEditing ? (
                      <input type="text" className="form-control" name="name" value={editForm.name} onChange={handleEditChange} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} />
                    ) : (
                      <p className="lead fw-bold mb-0" style={{ color: 'var(--text-main)' }}>{selectedEmployee.name}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: 'var(--text-muted)' }}>Email</h6>
                    {isEditing ? (
                      <input type="email" className="form-control" name="email" value={editForm.email} onChange={handleEditChange} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} />
                    ) : (
                      <p className="mb-0" style={{ color: 'var(--text-main)' }}>{selectedEmployee.email}</p>
                    )}
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: 'var(--text-muted)' }}>Designation</h6>
                    {isEditing ? (
                      <input type="text" className="form-control" name="designation" value={editForm.designation} onChange={handleEditChange} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} />
                    ) : (
                      <p className="mb-0" style={{ color: 'var(--text-main)' }}>{selectedEmployee.designation}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: 'var(--text-muted)' }}>Department</h6>
                    {isEditing ? (
                      <input type="text" className="form-control" name="department" value={editForm.department} onChange={handleEditChange} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} />
                    ) : (
                      <p className="mb-0" style={{ color: 'var(--text-main)' }}>{selectedEmployee.department}</p>
                    )}
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: 'var(--text-muted)' }}>Join Date</h6>
                    {isEditing ? (
                      <input type="date" className="form-control" name="joinDate" value={editForm.joinDate} onChange={handleEditChange} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} />
                    ) : (
                      <p className="mb-0" style={{ color: 'var(--text-main)' }}>{selectedEmployee.joinDate}</p>
                    )}
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-uppercase small fw-bold" style={{ color: 'var(--text-muted)' }}>Salary</h6>
                    {isEditing ? (
                      <input type="number" className="form-control" name="salary" value={editForm.salary} onChange={handleEditChange} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} />
                    ) : (
                      <p className="fw-bold text-success mb-0" style={{ fontSize: '1.1rem' }}>{selectedEmployee.salary}</p>
                    )}
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-12">
                    <h6 className="text-uppercase small fw-bold" style={{ color: 'var(--text-muted)' }}>Status</h6>
                    {isEditing ? (
                      <select className="form-select" name="status" value={editForm.status} onChange={handleEditChange} style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Probation">Probation</option>
                      </select>
                    ) : (
                      <span
                        className={`badge px-3 py-2 ${selectedEmployee.status === "Active"
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
            <div className="card shadow-sm mb-4 border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
              <div className="card-header border-bottom py-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <h5 className="mb-0 fw-bold text-info"><i className="bi bi-award me-2"></i>Certificates</h5>
              </div>
              <div className="card-body p-4 text-center">
                <div className="mb-3">
                  <i className="bi bi-patch-check-fill text-info display-4 opacity-50"></i>
                </div>
                <p className="text-muted mb-3">
                  Total Certificates:{" "}
                  <strong className="text-info fs-4 ms-2">
                    {selectedEmployee.certificates}
                  </strong>
                </p>
                <button className="btn btn-outline-info w-100">
                  <i className="bi bi-file-earmark-pdf me-2"></i> View Certificates
                </button>
              </div>
            </div>

            {/* Password Management Update */}
            {isHR && (
              <div className="card shadow-sm border-start border-warning border-5" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                <div className="card-header py-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <h5 className="mb-0 fw-bold text-warning"><i className="bi bi-shield-lock me-2"></i>Security Settings</h5>
                </div>
                <div className="card-body p-4">
                  <div className="mb-0">
                    <label className="form-label small fw-bold" style={{ color: 'var(--text-muted)' }}>Update Password</label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="New Password"
                        id="newPasswordInput"
                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                      />
                      <button
                        className="btn btn-outline-warning"
                        type="button"
                        onClick={async () => {
                          const newPass = document.getElementById('newPasswordInput').value;
                          if (newPass) {
                            // Update password via updateEmployeeInCompany
                            const res = await updateEmployeeInCompany(selectedEmployee.companyId, selectedEmployee.id, { password: newPass });
                            if (res) alert(`Password updated successfully.`);
                            else alert("Failed to update password");
                          } else {
                            alert("Please enter a password");
                          }
                        }}
                      >
                        Update
                      </button>
                    </div>
                    <small className="d-block mt-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>*Changes reflect immediately for the employee.</small>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const cellStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.85rem', padding: '10px 8px' };
  const thStyle = { ...cellStyle, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fff' };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 20px 0', boxSizing: 'border-box' }}>

      {/* ── Header Row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Employees</h1>
          <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
            <span className="rounded-circle bg-white" style={{ width: 5, height: 5 }}></span>
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="form-select form-select-sm"
            style={{ width: 170, fontSize: '0.82rem' }}
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
          >
            <option value="">-- All Companies --</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {isHR && (
            <>
              <button onClick={() => navigate('/hr/leave')} className="btn btn-outline-primary btn-sm">
                <i className="bi bi-calendar-check-fill me-1"></i>Manage Leaves
              </button>
              <button onClick={() => setShowAddForm(true)} className="btn btn-primary btn-sm">
                <i className="bi bi-plus-circle me-1"></i>Add New Employee
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search by name, email, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ borderRadius: 8, fontSize: '0.85rem' }}
        />
      </div>

      {/* ── Table Card ── */}
      <div className="card shadow-sm" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 10 }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '10px 16px', flexShrink: 0 }}>
          <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Employee Directory ({filteredEmployees.length})</h5>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '13%' }} />  {/* Name */}
              <col style={{ width: '12%' }} />  {/* Company */}
              <col style={{ width: '10%' }} />  {/* Designation */}
              <col style={{ width: '11%' }} />  {/* Department */}
              <col style={{ width: '20%' }} />  {/* Email */}
              <col style={{ width: '8%' }} />   {/* Status */}
              <col style={{ width: '8%' }} />   {/* Salary */}
              <col style={{ width: '7%' }} />   {/* Certs */}
              <col style={{ width: '11%' }} />  {/* Action */}
            </colgroup>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Designation</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Salary</th>
                <th style={thStyle}>Certs</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', transition: 'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--text-main)' }} title={emp.name}>{emp.name}</td>
                  <td style={{ ...cellStyle, color: 'var(--text-muted, #6b7280)' }} title={emp.companyName}>{emp.companyName}</td>
                  <td style={cellStyle} title={emp.designation}>{emp.designation}</td>
                  <td style={cellStyle} title={emp.department}>{emp.department}</td>
                  <td style={{ ...cellStyle, fontSize: '0.8rem' }} title={emp.email}>{emp.email}</td>
                  <td style={cellStyle}>
                    <span className={`badge ${emp.status === "Active" ? "bg-success" : "bg-warning"}`} style={{ fontSize: '0.7rem' }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={cellStyle}>{emp.salary}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <span className="badge bg-info" style={{ fontSize: '0.7rem' }}>{emp.certificates}</span>
                  </td>
                  <td style={{ ...cellStyle, overflow: 'visible' }}>
                    <button onClick={() => handleViewDetails(emp)} className="btn btn-sm btn-info" title="View Details" style={{ padding: '2px 6px', fontSize: '0.75rem', marginRight: 4 }}>
                      <i className="bi bi-eye"></i>
                    </button>
                    {isHR && (
                      <button onClick={() => handleDeleteEmployee(emp.id)} className="btn btn-sm btn-danger" title="Delete" style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;
