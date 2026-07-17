import React, { useState } from "react";
import "./CompanyManagement.css";
import { useAuth } from "../../context/AuthContext";

const CompanyManagement = () => {
  const { companies, addCompany, updateCompany, addHRToCompany, removeCompany, removeHRFromCompany, updateHRStatus } = useAuth();
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showAddHR, setShowAddHR] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [newCompany, setNewCompany] = useState({
    name: "",
    code: "",
    location: "",
    subdomain: "",
    portalUrl: "",
    contactEmail: ""
  });
  const [editCompanyData, setEditCompanyData] = useState({ id: "", name: "", code: "", location: "" });
  const [newHR, setNewHR] = useState({ name: "", email: "", companyId: "" });

  // Auto-generate company code
  React.useEffect(() => {
    if (showAddCompany && !newCompany.code) {
      const nextCode = `FT${String(companies.length + 1).padStart(3, '0')}`;
      setNewCompany(prev => ({ ...prev, code: nextCode }));
    }
  }, [showAddCompany, companies.length, newCompany.code]);

  // Filtering State
  const [filterType, setFilterType] = useState('ALL');

  // Aggregated Data
  const allEmployees = React.useMemo(() => {
    // Strictly Employees ONLY (No HRs) - Enforce EMP prefix to avoid mixed data
    return companies.flatMap(c =>
      (c.employeeAccounts || [])
        .filter(e => e.empId && e.empId.startsWith('EMP'))
        .map(e => ({ ...e, companyName: c.name, companyCode: c.code, role: e.employeeType || 'Employee' }))
    );
  }, [companies]);

  const allHRs = React.useMemo(() => {
    // Strictly HRs (Must start with 'HR-')
    return companies.flatMap(c =>
      (c.hrAccounts || [])
        .filter(h => h.empId && String(h.empId).trim().toUpperCase().startsWith('HR-'))
        .map(h => ({ ...h, companyName: c.name, companyCode: c.code, role: 'HR Admin' }))
    );
  }, [companies]);

  const handleCompanyStatusChange = async (companyId, newStatus) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    // Use updateCompany from context
    // We send specific fields to avoid overwriting arrays with empty/partial data if backend is strict
    // But assuming strict PUT, we should send main fields.
    const hasUpdated = await updateCompany(companyId, {
      name: company.name,
      code: company.code,
      location: company.location,
      subdomain: company.subdomain,
      portalUrl: company.portalUrl,
      contactEmail: company.contactEmail,
      status: newStatus
    });

    if (hasUpdated) {
      // success toast or nothing (state updates automatically via context)
    } else {
      alert("Failed to update status");
    }
  };

  // Compute filtered companies list (only for Company Views)
  const filteredCompanies = companies.filter(c => {
    if (filterType === 'ACTIVE') return c.status === 'Active';
    return true;
  });

  const getCardClass = (type) => {
    return `card shadow-sm text-center cursor-pointer ${filterType === type ? 'border-primary border-2' : ''}`;
  };

  const handleAddCompany = (e) => {
    e.preventDefault();
    if (!newCompany.name || !newCompany.code || !newCompany.location || !newCompany.contactEmail) {
      alert("Please fill all required fields");
      return;
    }

    (async () => {
      // Ensure code is set before submitting just in case
      const codeToSubmit = newCompany.code || `FT${String(companies.length + 1).padStart(3, '0')}`;
      const payload = { ...newCompany, code: codeToSubmit };
      
      const created = await addCompany(payload);
      if (created) {
        setNewCompany({
          name: "",
          code: "",
          location: "",
          subdomain: "",
          portalUrl: "",
          contactEmail: ""
        });
        setShowAddCompany(false);
        alert("Company created successfully!");
      } else {
        alert("Failed to create company.");
      }
    })();
  };

  // ... (keeping other handlers same until render)

  const renderTableContent = () => {
    // CASE 1: ALL EMPLOYEES
    if (filterType === 'WITH_EMPLOYEES') {
      return (
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th>Company</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allEmployees.length > 0 ? (
                allEmployees.map((emp, idx) => (
                  <tr key={emp.id || idx}>
                    <td className="fw-bold">{emp.name}</td>
                    <td>{emp.empId}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{emp.companyName}</span>
                    </td>
                    <td>{emp.email}</td>
                    <td><span className="badge bg-secondary">{emp.role}</span></td>
                    <td>
                      <span className={`badge ${emp.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                        {emp.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-4">No employees found across companies.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    // CASE 2: ALL HR ACCOUNTS
    if (filterType === 'WITH_HRS') {
      const strictHRs = allHRs.filter(h => h.empId && String(h.empId).startsWith('HR-'));
      return (
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>HR Name</th>
                <th>Employee ID</th>
                <th>Company</th>
                <th>Email</th>
                <th>Password</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {strictHRs.length > 0 ? (
                strictHRs.map((hr, idx) => (
                  <tr key={hr.id || idx}>
                    <td className="fw-bold">{hr.name}</td>
                    <td>{hr.empId}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{hr.companyName}</span>
                    </td>
                    <td>{hr.email}</td>
                    <td><code className="bg-light p-1">{hr.password}</code></td>
                    <td>
                      <span className={`badge ${hr.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
                        {hr.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-4">No HR accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    // CASE 3: COMPANIES (Default & Active)
    return (
      <div className="table-responsive">
        <table className="table table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>Company Name</th>
              <th>Code</th>
              <th>Location</th>
              <th>Employees</th>
              <th>HR Accounts</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <tr key={company.id}>
                  <td className="fw-bold">{company.name}</td>
                  <td>{company.code}</td>
                  <td>{company.location}</td>
                  <td>{company.employees}</td>
                  <td>
                    <span className="badge bg-info">{company.hrCount}</span>
                  </td>
                  <td>
                    <select
                      className={`form-select form-select-sm ${company.status === 'Active' ? 'text-success' : 'text-danger'}`}
                      value={company.status || 'Active'}
                      onChange={(e) => handleCompanyStatusChange(company.id, e.target.value)}
                      style={{ width: '110px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <option value="Active" className="text-success">Active</option>
                      <option value="Inactive" className="text-danger">Inactive</option>
                    </select>
                  </td>
                  <td>{company.createdDate}</td>
                  <td>
                    <button
                      onClick={() => setSelectedCompany(company.id)}
                      className="btn btn-sm btn-info me-2"
                    >
                      <i className="bi bi-eye"></i> View
                    </button>
                    <button
                      onClick={() => handleDeleteCompany(company.id)}
                      className="btn btn-sm btn-danger"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-4 text-muted">
                  No companies match filter settings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };


  const handleAddHR = async (e) => {
    e.preventDefault();
    if (!newHR.name || !newHR.email || !newHR.companyId) {
      alert("Please fill all required fields");
      return;
    }

    const result = await addHRToCompany(newHR.companyId, { name: newHR.name, email: newHR.email });
    if (result && result.hrAccount) {
      setNewHR({ name: "", email: "", companyId: "" });
      setShowAddHR(false);
      alert(`HR account created. Employee ID: ${result.hrAccount.empId} \nPassword: ${result.hrAccount.password}`);
    } else {
      alert("Failed to create HR account.");
    }
  };

  const handleEditClick = (company) => {
    setEditCompanyData({ id: company.id, name: company.name, code: company.code, location: company.location });
    setShowEditCompany(true);
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!editCompanyData.name || !editCompanyData.code || !editCompanyData.location) {
      alert("Please fill all required fields");
      return;
    }

    const updated = await updateCompany(editCompanyData.id, {
      name: editCompanyData.name,
      code: editCompanyData.code,
      location: editCompanyData.location
    });

    if (updated) {
      setShowEditCompany(false);
      alert("Company updated successfully!");
    } else {
      alert("Failed to update company.");
    }
  };

  const handleDeleteCompany = async (id) => {
    if (window.confirm("Are you sure you want to delete this company?")) {
      await removeCompany(id);
      setSelectedCompany(null);
      alert("Company deleted successfully");
    }
  };

  const handleDeleteHR = async (companyId, hrId) => {
    if (window.confirm("Are you sure you want to delete this HR account?")) {
      await removeHRFromCompany(companyId, hrId);
      alert("HR account deleted successfully");
    }
  };

  const handleCopyPassword = (password) => {
    navigator.clipboard.writeText(password);
    alert("Password copied to clipboard!");
  };

  if (selectedCompany) {
    const company = companies.find((c) => c.id === selectedCompany);

    if (!company) {
      return (
        <div className="company-detail-view">
          <div className="alert alert-danger">Company not found.</div>
          <button onClick={() => setSelectedCompany(null)} className="btn btn-secondary">
            Back to List
          </button>
        </div>
      );
    }

    return (
      <div className="company-detail-view">
        <button
          onClick={() => setSelectedCompany(null)}
          className="btn btn-secondary mb-3"
        >
          <i className="bi bi-arrow-left"></i> Back to Companies
        </button>

        <div className="row">
          <div className="col-md-8">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">{company.name}</h4>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <h6 className="text-muted">Company Code</h6>
                    <p className="lead">{company.code}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted">Location</h6>
                    <p className="lead">{company.location}</p>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-4">
                    <h6 className="text-muted">Total Employees</h6>
                    <p className="lead">{company.employees}</p>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">HR Accounts</h6>
                    <p className="lead">{company.hrCount}</p>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">Status</h6>
                    <span className="badge bg-success">{company.status}</span>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <h6 className="text-muted">Contact Email</h6>
                    <p>{company.contactEmail || "N/A"}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted">Portal</h6>
                    <p>
                      {company.portalUrl ? <a href={company.portalUrl} target="_blank" rel="noreferrer">{company.portalUrl}</a> : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-muted">Created Date</h6>
                    <p className="lead">{company.createdDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Company Actions</h5>
              </div>
              <div className="card-body">
                <button
                  onClick={() => { setNewHR((prev) => ({ ...prev, companyId: company.id })); setShowAddHR(true); }}
                  className="btn btn-success w-100 mb-2"
                >
                  <i className="bi bi-person-plus"></i> Add HR Account
                </button>
                <button
                  className="btn btn-info w-100 mb-2"
                  onClick={() => handleEditClick(company)}
                >
                  <i className="bi bi-pencil"></i> Edit Company
                </button>
                <button
                  onClick={() => handleDeleteCompany(company.id)}
                  className="btn btn-danger w-100"
                >
                  <i className="bi bi-trash"></i> Delete Company
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* HR Accounts Table */}
        <div className="card shadow-sm mt-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">HR Accounts in {company.name}</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Employee ID</th>
                    <th>Password</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(company.hrAccounts || []).filter(h => h.empId && String(h.empId).startsWith('HR-')).map((hr) => (
                    <tr key={hr.id}>
                      <td className="fw-bold">{hr.name}</td>
                      <td>{hr.email}</td>
                      <td>{hr.empId}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <code className="bg-light p-2 rounded">
                            {hr.password}
                          </code>
                          <button
                            onClick={() => handleCopyPassword(hr.password)}
                            className="btn btn-sm btn-primary"
                            title="Copy password"
                          >
                            <i className="bi bi-files"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        <select
                          className={`form-select form-select-sm ${hr.status === 'Active' ? 'text-success' : 'text-danger'}`}
                          value={hr.status}
                          onChange={(e) => updateHRStatus(company.id, hr.id, e.target.value)}
                          style={{ width: '110px', fontWeight: 'bold' }}
                        >
                          <option value="Active" className="text-success">Active</option>
                          <option value="Inactive" className="text-danger">Inactive</option>
                        </select>
                      </td>
                      <td>{hr.createdDate}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteHR(company.id, hr.id)}
                          className="btn btn-sm btn-danger"
                        >
                          <i className="bi bi-trash"></i> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {company.hrAccounts.length === 0 && (
                <div className="p-4 text-center text-muted">
                  No HR accounts created yet. Click "Add HR Account" to create one.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="card shadow-sm mt-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">Employees in {company.name}</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Employee ID</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joining Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(company.employeeAccounts || []).length > 0 ? (
                    (company.employeeAccounts || []).map((emp) => (
                      <tr key={emp.id}>
                        <td className="fw-bold">{emp.name}</td>
                        <td>{emp.email}</td>
                        <td>{emp.empId}</td>
                        <td><span className="badge bg-secondary">{emp.employeeType || emp.role || 'Employee'}</span></td>
                        <td>
                          <span className={`badge ${emp.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                            {emp.status || 'Active'}
                          </span>
                        </td>
                        <td>{emp.joiningDate || "N/A"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="text-center py-4 text-muted">No employees found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add HR Modal */}
        {showAddHR && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Add HR Account to {company.name}</h5>
                <button
                  onClick={() => setShowAddHR(false)}
                  className="btn-close"
                ></button>
              </div>
              <form onSubmit={handleAddHR}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">HR Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newHR.name}
                      onChange={(e) =>
                        setNewHR({ ...newHR, name: e.target.value })
                      }
                      placeholder="Enter HR name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={newHR.email}
                      onChange={(e) =>
                        setNewHR({ ...newHR, email: e.target.value })
                      }
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="alert alert-info">
                    <strong>Auto-Generated Credentials:</strong>
                    <ul className="mb-0 mt-2">
                      <li>Employee ID will be generated automatically</li>
                      <li>Secure password will be generated automatically</li>
                    </ul>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowAddHR(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create HR Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="company-management-container">
      <div className="management-header mb-4">
        <h1>Company Management</h1>
        <p>Create and manage companies and their HR accounts</p>
        <button
          onClick={() => {
            setShowAddCompany(true);
          }}
          className="btn btn-primary mt-2"
        >
          <i className="bi bi-building"></i> Add New Company
        </button>
      </div>

      {/* Companies Overview Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div
            className={getCardClass('ALL')}
            onClick={() => setFilterType('ALL')}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            title="Show All Companies"
          >
            <div className="card-body">
              <h6 className="text-muted">Total Companies</h6>
              <h2 className="text-primary">{companies.length}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className={getCardClass('WITH_EMPLOYEES')}
            onClick={() => setFilterType('WITH_EMPLOYEES')}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            title="Filter by Companies with Employees"
          >
            <div className="card-body">
              <h6 className="text-muted">Total Employees</h6>
              <h2 className="text-success">
                {companies.reduce((sum, c) => sum + c.employees, 0)}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className={getCardClass('WITH_HRS')}
            onClick={() => setFilterType('WITH_HRS')}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            title="Filter by Companies with HRs"
          >
            <div className="card-body">
              <h6 className="text-muted">Total HR Accounts</h6>
              <h2 className="text-warning">
                {companies.reduce((sum, c) => sum + (c.hrAccounts || []).filter(h => h.empId && String(h.empId).startsWith('HR-')).length, 0)}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className={getCardClass('ACTIVE')}
            onClick={() => setFilterType('ACTIVE')}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            title="Show Active Companies"
          >
            <div className="card-body">
              <h6 className="text-muted">Active Companies</h6>
              <h2 className="text-info">
                {companies.filter((c) => c.status === "Active").length}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic List Content */}
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {filterType === 'WITH_EMPLOYEES' && 'All Employees List'}
            {filterType === 'WITH_HRS' && 'Verified HR Accounts List'}
            {filterType === 'ACTIVE' && 'Active Companies List'}
            {filterType === 'ALL' && 'Companies List'}
          </h5>
          {filterType !== 'ALL' && (
            <button className="btn btn-sm btn-light text-primary fw-bold" onClick={() => setFilterType('ALL')}>
              Clear Filter
            </button>
          )}
        </div>
        <div className="card-body p-0">
          {renderTableContent()}
        </div>
      </div>

      {/* Add Company Modal */}
      {showAddCompany && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h5>Create New Company</h5>
              <button
                onClick={() => setShowAddCompany(false)}
                className="btn-close"
              ></button>
            </div>
            <form onSubmit={handleAddCompany}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCompany.name}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, name: e.target.value })
                    }
                    placeholder="Enter company name"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Company Code *</label>
                  <input
                    type="text"
                    className="form-control bg-light fw-bold text-primary"
                    value={newCompany.code}
                    readOnly
                    title="Company code is auto-generated and fixed"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Location *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCompany.location}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, location: e.target.value })
                    }
                    placeholder="e.g., Bangalore, India"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Subdomain (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCompany.subdomain}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, subdomain: e.target.value })
                    }
                    placeholder="e.g., hrms"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Portal URL (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newCompany.portalUrl}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, portalUrl: e.target.value })
                    }
                    placeholder="e.g., https://hrms.uptoskills.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Contact Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={newCompany.contactEmail}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, contactEmail: e.target.value })
                    }
                    placeholder="admin@focus.com"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddCompany(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditCompany && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h5>Edit Company</h5>
              <button
                onClick={() => setShowEditCompany(false)}
                className="btn-close"
              ></button>
            </div>
            <form onSubmit={handleUpdateCompany}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editCompanyData.name}
                    onChange={(e) =>
                      setEditCompanyData({ ...editCompanyData, name: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Company Code *</label>
                  <input
                    type="text"
                    className="form-control bg-light fw-bold text-primary"
                    value={editCompanyData.code}
                    readOnly
                    title="Company code is fixed"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Location *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editCompanyData.location}
                    onChange={(e) =>
                      setEditCompanyData({ ...editCompanyData, location: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowEditCompany(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManagement;
