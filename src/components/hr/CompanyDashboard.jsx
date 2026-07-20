import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const CompanyDashboard = () => {
  const { user, companies, refreshDashboardData } = useAuth();

  // Calculate analytics
  const totalCompanies = companies.length;
  const totalEmployees = companies.reduce((sum, c) => sum + (c.employees || 0), 0);
  const totalHRs = companies.reduce((sum, c) => sum + (c.hrCount || 0), 0);
  const activeCompanies = companies.filter(c => c.status === "Active").length;

  const handleRefresh = async () => {
    if (refreshDashboardData) {
      await refreshDashboardData();
    } else {
      window.location.reload();
    }
  };

  // Auto-refresh dashboard data for "Live" experience
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (refreshDashboardData) refreshDashboardData();
    }, 8000); // 8s poll for global dashboard
    return () => clearInterval(interval);
  }, [refreshDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="container-fluid" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', paddingTop: '60px', paddingBottom: '20px', color: 'var(--text-main)' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 ps-5">
        <div>
          <div className="d-flex align-items-center gap-3">
            <h1 className="mb-0">Company Admin Dashboard</h1>
            <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: '0.8rem', height: 'fit-content', padding: '0.4rem 0.6rem' }}>
              <span className="rounded-circle bg-white" style={{ width: '6px', height: '6px' }}></span>
              LIVE
            </span>
          </div>
          <p className="text-muted" style={{ color: 'var(--text-muted)' }}>Overview of all registered companies</p>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-outline-primary shadow-sm" onClick={handleRefresh}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh Data
          </button>

          <div className="vr h-50 mx-2" style={{ backgroundColor: 'var(--border-color)' }}></div>

          <div className="dropdown">
            <button
              className="btn border-0 p-0 d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center shadow-sm text-white"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'var(--primary)',
                  overflow: 'hidden',
                  fontSize: '1.2rem'
                }}
              >
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-100 h-100 object-fit-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'A'
                )}
              </div>
              <div className="d-none d-md-block text-start">
                <div className="fw-bold small lh-1" style={{ color: 'var(--text-main)' }}>{user?.name || 'Admin'}</div>
                <small className="text-muted" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Company Admin</small>
              </div>
              <i className="bi bi-chevron-down small" style={{ color: 'var(--text-muted)' }}></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <li><button className="dropdown-item" onClick={() => window.location.href = '/profile'} style={{ color: 'var(--text-main)' }}><i className="bi bi-person me-2"></i>My Profile</button></li>
              <li><button className="dropdown-item" onClick={() => window.location.href = '/settings'} style={{ color: 'var(--text-main)' }}><i className="bi bi-gear me-2"></i>Settings</button></li>
              <li><hr className="dropdown-divider" style={{ borderColor: 'var(--border-color)' }} /></li>
              <li><button className="dropdown-item text-danger" onClick={() => window.location.reload()}><i className="bi bi-box-arrow-right me-2"></i>Logout</button></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="alert alert-success d-flex justify-content-between align-items-center" role="alert" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
        <div>
          <h4 className="alert-heading mb-1">{getGreeting()}, {user?.name || "Admin"}! 👑</h4>
          <p className="mb-0">Logged in as: <strong>{user?.email}</strong></p>
        </div>
        <div className="text-end">
          <small>System Status: Online</small>
        </div>
      </div>

      <div className="row">
        <div className="col-md-3 mb-3">
          <div className="card shadow-sm border-left border-primary h-100" style={{ borderLeftWidth: '5px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="card-title text-uppercase fs-6" style={{ color: 'var(--text-muted)' }}>Total Employees</h5>
                  <h2 className="text-primary fw-bold mb-0">{totalEmployees}</h2>
                </div>
                <div className="icon-shape text-primary rounded p-3" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                  <i className="bi bi-people-fill fs-4"></i>
                </div>
              </div>
              <small className="mt-2 d-block" style={{ color: 'var(--text-muted)' }}>Across {totalCompanies} companies</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card shadow-sm border-left border-success h-100" style={{ borderLeftWidth: '5px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="card-title text-uppercase fs-6" style={{ color: 'var(--text-muted)' }}>HR Managers</h5>
                  <h2 className="text-success fw-bold mb-0">{totalHRs}</h2>
                </div>
                <div className="icon-shape text-success rounded p-3" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <i className="bi bi-person-badge-fill fs-4"></i>
                </div>
              </div>
              <small className="mt-2 d-block" style={{ color: 'var(--text-muted)' }}>Managing operations</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card shadow-sm border-left border-warning h-100" style={{ borderLeftWidth: '5px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="card-title text-uppercase fs-6" style={{ color: 'var(--text-muted)' }}>Active Companies</h5>
                  <h2 className="text-warning fw-bold mb-0">{activeCompanies}</h2>
                </div>
                <div className="icon-shape text-warning rounded p-3" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                  <i className="bi bi-building fs-4"></i>
                </div>
              </div>
              <small className="mt-2 d-block" style={{ color: 'var(--text-muted)' }}>Out of {totalCompanies} registered</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="card shadow-sm border-left border-info h-100" style={{ borderLeftWidth: '5px' }}>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="card-title text-uppercase fs-6" style={{ color: 'var(--text-muted)' }}>Avg. Emp/Company</h5>
                  <h2 className="text-info fw-bold mb-0">
                    {totalCompanies > 0 ? Math.round(totalEmployees / totalCompanies) : 0}
                  </h2>
                </div>
                <div className="icon-shape text-info rounded p-3" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                  <i className="bi bi-graph-up fs-4"></i>
                </div>
              </div>
              <small className="mt-2 d-block" style={{ color: 'var(--text-muted)' }}>Growth Metric</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-2" style={{ marginBottom: '20px' }}>
        <div className="col-12">
          <div className="card shadow-sm d-flex flex-column">
            <div className="card-header py-3" style={{ backgroundColor: 'transparent', borderBottom: '1px solid var(--border-color)' }}>
              <h5 className="mb-0 text-primary fw-bold">Company Overview</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle" style={{ color: 'var(--text-main)' }}>
                  <thead className="table-light" style={{ backgroundColor: 'var(--bg-main)' }}>
                    <tr style={{ borderBottomColor: 'var(--border-color)' }}>
                      <th style={{ color: 'var(--text-muted)' }}>Company Name</th>
                      <th style={{ color: 'var(--text-muted)' }}>Code</th>
                      <th style={{ color: 'var(--text-muted)' }}>Location</th>
                      <th style={{ color: 'var(--text-muted)' }}>Employees</th>
                      <th style={{ color: 'var(--text-muted)' }}>HR Managers</th>
                      <th style={{ color: 'var(--text-muted)' }}>Status</th>
                      <th style={{ color: 'var(--text-muted)' }}>Portal URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.length > 0 ? (
                      companies.map((company) => (
                        <tr key={company.id} style={{ borderBottomColor: 'var(--border-color)' }}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-initials text-primary rounded-circle me-3" style={{ width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.1)' }}>
                                {company.name.charAt(0)}
                              </div>
                              <strong>{company.name}</strong>
                            </div>
                          </td>
                          <td><span className="badge bg-secondary">{company.code}</span></td>
                          <td>{company.location}</td>
                          <td>{company.employees || 0}</td>
                          <td>{company.hrCount || 0}</td>
                          <td>
                            <span className={`badge ${company.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
                              {company.status}
                            </span>
                          </td>
                          <td>
                            {company.portalUrl ? (
                              <a href={company.portalUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info">
                                <i className="bi bi-link-45deg"></i> Visit
                              </a>
                            ) : <span className="text-muted" style={{ color: 'var(--text-muted)' }}>-</span>}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted" style={{ color: 'var(--text-muted)' }}>No companies registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
