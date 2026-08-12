import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './CompanySpecificDashboard.css';

const CompanySpecificDashboard = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        
        // Fetch Company Details
        const companyRes = await fetch(`${API_URL}/companies/${companyId}`);
        if (companyRes.ok) {
          const compData = await companyRes.json();
          setCompany(compData);
        }

        // Fetch Employees
        const empRes = await fetch(`${API_URL}/companies/${companyId}/employees`);
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData);
        }

      } catch (error) {
        console.error("Error fetching company specific data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCompanyData();
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mt-5 text-center">
        <h3>Company Not Found</h3>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/company')}>Back to Dashboard</button>
      </div>
    );
  }

  // Analytics
  const activeEmployees = employees.filter(emp => emp.status === 'Active' || emp.status === 'Present').length; // Adjust based on actual status field

  return (
    <div className="container-fluid company-specific-dashboard">
      {/* Header */}
      <div className="company-dashboard-header d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <button className="btn company-back-button" onClick={() => navigate('/company')} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </button>
          <div>
            <h2 className="company-dashboard-title mb-0 fw-bold">{company.name} Dashboard</h2>
            <p className="company-dashboard-meta mb-0">
              Code: <span className="badge bg-secondary">{company.code}</span> | Location: {company.location}
            </p>
          </div>
        </div>
        <div>
          <span className={`company-status-badge badge ${company.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
            {company.status}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card company-kpi-card h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="company-kpi-label text-uppercase mb-1">Total Employees</h6>
                  <h2 className="fw-bold mb-0 text-primary">{employees.length}</h2>
                </div>
                <div className="company-kpi-icon rounded p-3 text-primary">
                  <i className="bi bi-people-fill fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card company-kpi-card h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="company-kpi-label text-uppercase mb-1">HR Managers</h6>
                  <h2 className="fw-bold mb-0 text-success">{company.hrCount || 0}</h2>
                </div>
                <div className="company-kpi-icon rounded p-3 text-primary">
                  <i className="bi bi-person-badge fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card company-kpi-card h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="company-kpi-label text-uppercase mb-1">Active Usage</h6>
                  <h2 className="fw-bold mb-0 text-warning">{activeEmployees} / {employees.length}</h2>
                </div>
                <div className="company-kpi-icon rounded p-3 text-primary">
                  <i className="bi bi-activity fs-3"></i>
                </div>
              </div>
              <small className="company-kpi-description mt-2 d-block">Employees currently active</small>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Employees Table */}
      <div className="card company-directory-card flex-grow-1">
        <div className="card-header company-directory-header border-0 py-3">
          <h5 className="mb-0 fw-bold">Employee Directory</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table company-directory-table align-middle mb-0">
              <thead className="company-directory-table-head">
                <tr>
                  <th className="ps-4">Employee Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Employee ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? (
                  employees.map(emp => (
                    <tr key={emp.id} style={{ borderBottomColor: 'var(--border-color)' }}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <div className="avatar-initials bg-primary text-white rounded-circle me-3 d-flex align-items-center justify-content-center fw-bold" style={{ width: '40px', height: '40px' }}>
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="fw-bold">{emp.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>{emp.email}</td>
                      <td>
                        <span className="company-role-badge badge">{emp.employeeType || 'Employee'}</span>
                      </td>
                      <td>
                        <span className="company-employee-id">{emp.empId || 'N/A'}</span>
                      </td>
                      <td>
                         <span className="company-active-badge badge">Active</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      No employees found for {company.name}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySpecificDashboard;
