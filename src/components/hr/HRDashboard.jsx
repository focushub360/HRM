import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import {
  FaUserPlus,
  FaSearch,
  FaTrash,
  FaCopy,
  FaInfoCircle,
  FaUsers,
  FaChevronDown,
  FaUser,
  FaCog,
  FaSignOutAlt,
  FaTimes,
  FaBuilding,
  FaLaptop,
  FaPlus
} from "react-icons/fa";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./CompanyManagement.css";
import SuccessModal from "../common/SuccessModal";
import LiveMonitoring from "./LiveMonitoring";

const HRDashboard = () => {
  const { user, companies, addEmployeeToCompany, removeEmployeeFromCompany } = useAuth();
  const { theme } = useTheme();
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    employeeType: "office",
  });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: "", message: "", subMessage: null });

  const company = companies.find((c) => c.id === user?.companyId);

  if (!company) {
    return (
      <div className="p-4">
        <div className="alert alert-warning">Company data not found.</div>
      </div>
    );
  }

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email || !newEmployee.employeeType) {
      alert("Please fill all required fields");
      return;
    }
    const result = await addEmployeeToCompany(user.companyId, {
      name: newEmployee.name,
      email: newEmployee.email,
      employeeType: newEmployee.employeeType,
    });

    if (result && result.employeeAccount) {
      setNewEmployee({ name: "", email: "", employeeType: "office" });
      setShowAddEmployee(false);
      // alert(
      //   `Employee created successfully!\n\nEmployee ID: ${result.employeeAccount.empId}\nPassword: ${result.employeeAccount.password}\nType: ${result.employeeAccount.employeeType}`
      // );
      setSuccessModal({
        isOpen: true,
        title: "Employee Created!",
        message: `Employee "${newEmployee.name}" has been successfully added.`,
        subMessage: (
          <div className="text-start">
            <p className="mb-1"><strong>Employee ID:</strong> {result.employeeAccount.empId}</p>
            <p className="mb-1"><strong>Password:</strong> {result.employeeAccount.password}</p>
            <p className="mb-0"><strong>Type:</strong> <span className="text-capitalize">{result.employeeAccount.employeeType}</span></p>
            <small className="text-muted d-block mt-2 fst-italic">Please copy credentials immediately.</small>
          </div>
        )
      });
    } else {
      alert("Failed to create employee.");
    }
  };

  const handleDeleteEmployee = (empId) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      removeEmployeeFromCompany(user.companyId, empId);
      alert("Employee deleted successfully");
    }
  };

  const handleCopyPassword = (password) => {
    navigator.clipboard.writeText(password);
    alert("Password copied to clipboard!");
  };

  const getEmployeeTypeBadge = (type) => {
    const badges = {
      office: "bg-primary",
      sales: "bg-success",
      wfh: "bg-info",
    };
    const labels = {
      office: "Office Employee",
      sales: "Sales & Marketing",
      wfh: "WFH Employee",
    };
    return (
      <span className={`badge ${badges[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="company-management-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '60px 1rem 1rem 1rem',
      overflowX: 'hidden',
      color: 'var(--text-main)'
    }}>
      {/* Top Header Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <h4 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>HR Dashboard</h4>
          <p className="text-muted mb-0" style={{ color: 'var(--text-muted)' }}>
            {getGreeting()}, <span className="fw-bold" style={{ color: 'var(--primary)' }}>{user?.name || 'HR Manager'}</span>! 👋
            <span className="mx-2" style={{ color: 'var(--border-color)' }}>|</span>
            {company.name} <small className="text-muted" style={{ color: 'var(--text-muted)' }}>({company.code})</small>
          </p>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            onClick={() => setShowAddEmployee(true)}
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
          >
            <FaUserPlus /> Add Employee
          </button>

          <div className="vr h-50 mx-2" style={{ backgroundColor: 'var(--border-color)' }}></div>

          {/* Profile Dropdown */}
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
                  user?.name?.charAt(0).toUpperCase() || 'H'
                )}
              </div>
              <div className="d-none d-md-block text-start">
                <div className="fw-bold small lh-1" style={{ color: 'var(--text-main)' }}>{user?.name || 'User'}</div>
                <small className="text-muted" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HR Manager</small>
              </div>
              <FaChevronDown className="small" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }} />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <li><button className="dropdown-item" onClick={() => window.location.href = '/profile'} style={{ color: 'var(--text-main)' }}><FaUser className="me-2" /> My Profile</button></li>
              <li><button className="dropdown-item" onClick={() => window.location.href = '/settings'} style={{ color: 'var(--text-main)' }}><FaCog className="me-2" /> Settings</button></li>
              <li><hr className="dropdown-divider" style={{ borderColor: 'var(--border-color)' }} /></li>
              <li><button className="dropdown-item text-danger" onClick={() => window.location.reload()}><FaSignOutAlt className="me-2" /> Logout</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Employee Overview Cards */}
      <div className="row mb-4 g-4">
        <div className="col-md-4">
          <div className="card border-0 text-white h-100 p-2" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-uppercase small fw-bold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Employees</h6>
                <h2 className="mb-0 fw-bold display-6">{company.employeeAccounts.length}</h2>
              </div>
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <FaUsers size={24} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 text-white h-100 p-2" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-uppercase small fw-bold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Office Employees</h6>
                <h2 className="mb-0 fw-bold display-6">{company.employeeAccounts.filter((e) => e.employeeType === "office").length}</h2>
              </div>
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <FaBuilding size={24} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 text-white h-100 p-2" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)' }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="text-uppercase small fw-bold mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Sales & WFH</h6>
                <h2 className="mb-0 fw-bold display-6">{company.employeeAccounts.filter((e) => e.employeeType !== "office").length}</h2>
              </div>
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <FaLaptop size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live AI Proctoring */}
      <div className="row mb-4">
        <div className="col-12">
          <LiveMonitoring />
        </div>
      </div>

      {/* Employees Table */}
      <div className="card border-0 shadow-sm" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)', borderRadius: '12px', marginBottom: '20px' }}>
        <div className="card-header border-0 bg-transparent py-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>Employees List</h5>
          <div className="input-group" style={{ width: '250px' }}>
            <span className="input-group-text border-0 bg-light" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}><FaSearch /></span>
            <input type="text" className="form-control border-0 bg-light" placeholder="Search employees..." style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }} />
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0" style={{ color: 'var(--text-main)' }}>
              <thead style={{ backgroundColor: 'var(--bg-main)' }}>
                <tr style={{ backgroundColor: 'var(--bg-main)' }}>
                  <th className="border-0 px-4 py-3 text-muted small text-uppercase" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Name</th>
                  <th className="border-0 px-4 py-3 text-muted small text-uppercase" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Email</th>
                  <th className="border-0 px-4 py-3 text-muted small text-uppercase" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>ID</th>
                  <th className="border-0 px-4 py-3 text-muted small text-uppercase" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Type</th>
                  <th className="border-0 px-4 py-3 text-muted small text-uppercase" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Password</th>
                  <th className="border-0 px-4 py-3 text-muted small text-uppercase" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Status</th>
                  <th className="border-0 px-4 py-3 text-muted small text-uppercase" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {company.employeeAccounts.map((employee) => (
                  <tr key={employee.id} style={{ borderBottomColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 align-middle fw-medium">{employee.name}</td>
                    <td className="px-4 py-3 align-middle">{employee.email}</td>
                    <td className="px-4 py-3 align-middle text-muted" style={{ color: 'var(--text-muted)' }}>{employee.empId}</td>
                    <td className="px-4 py-3 align-middle">{getEmployeeTypeBadge(employee.employeeType)}</td>
                    <td className="px-4 py-3 align-middle">
                      <div className="d-flex gap-2 align-items-center">
                        <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--danger)' }}>
                          {employee.password}
                        </code>
                        <button
                          onClick={() => handleCopyPassword(employee.password)}
                          className="btn btn-sm btn-link text-muted p-0"
                          title="Copy password"
                          style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                        >
                          <FaCopy />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className={`badge ${employee.status === 'Inactive' ? 'bg-danger' : 'bg-success'} text-white px-3 py-2 rounded-pill fw-normal`}>
                        {employee.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="btn btn-link d-flex align-items-center justify-content-center mx-auto"
                        title="Remove Employee"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <FaTrash size={22} style={{ color: '#ef4444' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {company.employeeAccounts.length === 0 && (
              <div className="p-5 text-center d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                  <FaUsers size={32} className="text-primary opacity-50" />
                </div>
                <h5 className="mb-2 fw-semibold" style={{ color: 'var(--text-main)' }}>No Employees Yet</h5>
                <p className="mb-4 text-muted" style={{ maxWidth: '300px' }}>Your employee list is currently empty. Get started by adding your first employee.</p>
                <button className="btn btn-primary px-4 py-2 rounded-pill shadow-sm fw-medium d-flex align-items-center" onClick={() => setShowAddEmployee(true)}>
                  <FaPlus className="me-2" /> Add New Employee
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {
        showAddEmployee && (
          <div className="modal d-block" style={{
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(5px)'
          }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg" style={{
                backgroundColor: '#ffffff',
                color: '#1e293b',
                borderRadius: '16px',
                overflow: 'hidden'
              }}>
                <div className="modal-header border-0 p-4 pb-0">
                  <h4 className="modal-title fw-bold" style={{ color: '#0f172a' }}>Add New Employee</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddEmployee(false)}
                    className="btn-close shadow-none"
                    style={{ filter: 'none' }}
                  ></button>
                </div>
                <form onSubmit={handleAddEmployee}>
                  <div className="modal-body p-4">
                    <div className="mb-4">
                      <label className="form-label mb-2 fw-bold text-dark" style={{ fontSize: '0.9rem' }}>FULL NAME</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={newEmployee.name}
                        onChange={(e) =>
                          setNewEmployee({ ...newEmployee, name: e.target.value })
                        }
                        placeholder="e.g. John Doe"
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#0f172a',
                          borderRadius: '8px',
                          border: '2px solid #e2e8f0',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="form-label mb-2 fw-bold text-dark" style={{ fontSize: '0.9rem' }}>EMAIL ADDRESS</label>
                      <input
                        type="email"
                        className="form-control form-control-lg"
                        value={newEmployee.email}
                        onChange={(e) =>
                          setNewEmployee({ ...newEmployee, email: e.target.value })
                        }
                        placeholder="name@company.com"
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#0f172a',
                          borderRadius: '8px',
                          border: '2px solid #e2e8f0',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="form-label mb-2 fw-bold text-dark" style={{ fontSize: '0.9rem' }}>ROLE / TYPE</label>
                      <select
                        className="form-select form-select-lg"
                        value={newEmployee.employeeType}
                        onChange={(e) =>
                          setNewEmployee({ ...newEmployee, employeeType: e.target.value })
                        }
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#0f172a',
                          borderRadius: '8px',
                          border: '2px solid #e2e8f0',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="office">Office Staff</option>
                        <option value="sales">Field Sales Agent</option>
                        <option value="wfh">Remote / WFH</option>
                      </select>
                    </div>
                    <div className="alert alert-primary border-0 rounded-3 p-3 d-flex align-items-center gap-3 mb-0">
                      <FaInfoCircle size={18} className="text-primary" />
                      <span className="small fw-bold text-primary">Credentials (ID & Password) will be auto-generated.</span>
                    </div>
                  </div>
                  <div className="modal-footer border-0 p-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddEmployee(false)}
                      className="btn btn-outline-secondary px-4 py-2 rounded-3 fw-bold decoration-none text-dark"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary px-5 py-2 rounded-3 shadow-sm fw-bold">
                      Create Employee
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        title={successModal.title}
        message={successModal.message}
        subMessage={successModal.subMessage}
      />
    </div >
  );
};

export default HRDashboard;
