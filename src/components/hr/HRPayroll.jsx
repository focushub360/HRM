import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    FaMoneyCheckAlt,
    FaHistory,
    FaFileDownload,
    FaPencilAlt,
    FaCheck,
    FaTimes,
    FaCheckCircle,
    FaClock
} from "react-icons/fa";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const HRPayroll = () => {
    const { user, companies, updateEmployeeInCompany, refreshDashboardData } = useAuth();
    const [selectedCompany, setSelectedCompany] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Auto-refresh for "Live" experience
    useEffect(() => {
        const interval = setInterval(() => {
            if (refreshDashboardData) refreshDashboardData();
        }, 8000);
        return () => clearInterval(interval);
    }, [refreshDashboardData]);

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const isSuperAdmin = !user?.companyId;

    // Derived Payroll Data from Real Employees
    const payrollData = useMemo(() => {
        let employees = [];

        companies.forEach(company => {
            if (user?.companyId && String(company.id) !== String(user.companyId)) return;
            if (selectedCompany && String(company.id) !== String(selectedCompany)) return;

            if (company.employeeAccounts) {
                company.employeeAccounts.forEach(emp => {
                    // Extract monthly data if exists
                    const monthly = emp.monthlyPayroll?.[selectedMonth] || {};

                    employees.push({
                        id: emp.id,
                        realId: emp.id,
                        name: emp.name,
                        companyId: company.id,
                        companyName: company.name,
                        role: emp.position || "Employee",
                        // Prioritize monthly data, fallback to employee's base salary or 0
                        salary: monthly.salary !== undefined ? monthly.salary : (emp.salary ? parseInt(emp.salary) : 0),
                        bonus: monthly.bonus !== undefined ? monthly.bonus : (emp.bonus ? parseInt(emp.bonus) : 0),
                        deductions: monthly.deductions !== undefined ? monthly.deductions : (emp.deductions ? parseInt(emp.deductions) : 0),
                        leavesTaken: emp.leavesTaken || 0,
                        status: monthly.status || "Pending",
                        assignedTask: monthly.assignedTask || emp.assignedTask || "Unassigned",
                        currentTask: monthly.currentTask || emp.currentTask || "Routine Work",
                        taskProgress: monthly.taskProgress !== undefined ? monthly.taskProgress : (emp.taskProgress || 0),
                        monthlyPayroll: emp.monthlyPayroll || {} // Store for persistence during save
                    });
                });
            }
        });
        return employees;
    }, [companies, selectedCompany, user, selectedMonth]);

    // Analytics Data
    const totalFund = payrollData.reduce((acc, curr) => acc + curr.salary + curr.bonus, 0);

    const companyFunds = useMemo(() => {
        const funds = {};
        companies.forEach(c => funds[c.name] = 0);

        payrollData.forEach(item => {
            const cName = companies.find(c => c.id === item.companyId)?.name || "Unknown";
            funds[cName] = (funds[cName] || 0) + item.salary + item.bonus;
        });
        return funds;
    }, [payrollData, companies]);

    const chartData = {
        labels: Object.keys(companyFunds),
        datasets: [
            {
                label: 'Total Fund Allocation (₹)',
                data: Object.values(companyFunds),
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const handleProcessParams = async (empId) => {
        const emp = payrollData.find(e => e.id === empId);
        if (!emp) return;

        const payload = {
            monthlyPayroll: {
                ...emp.monthlyPayroll,
                [selectedMonth]: {
                    salary: emp.salary,
                    bonus: emp.bonus,
                    deductions: emp.deductions,
                    assignedTask: emp.assignedTask,
                    currentTask: emp.currentTask,
                    taskProgress: emp.taskProgress,
                    status: "Paid"
                }
            }
        };

        const result = await updateEmployeeInCompany(emp.companyId, emp.id, payload);
        if (result) {
            alert(`Payroll for ${emp.name} in ${selectedMonth} marked as Paid!`);
        } else {
            alert("Failed to process payment.");
        }
    };

    // Edit Handlers
    const handleEditClick = (item) => {
        setEditingId(item.id);
        setEditFormData({
            salary: item.salary,
            bonus: item.bonus,
            deductions: item.deductions,
            assignedTask: item.assignedTask,
            currentTask: item.currentTask,
            taskProgress: item.taskProgress
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async (empId, companyId) => {
        const emp = payrollData.find(e => e.id === empId);
        if (!emp) return;

        // Prepare monthly record with edited data
        const payload = {
            monthlyPayroll: {
                ...emp.monthlyPayroll,
                [selectedMonth]: {
                    salary: parseInt(editFormData.salary || 0),
                    bonus: parseInt(editFormData.bonus || 0),
                    deductions: parseInt(editFormData.deductions || 0),
                    assignedTask: editFormData.assignedTask,
                    currentTask: editFormData.currentTask,
                    taskProgress: parseInt(editFormData.taskProgress || 0),
                    status: emp.status // Preserve current paid status
                }
            }
        };

        const result = await updateEmployeeInCompany(companyId, empId, payload);
        if (result) {
            setEditingId(null);
        } else {
            alert("Failed to update monthly payroll details.");
        }
    };

    return (
        <div className="container-fluid pt-5 pb-4" style={{ overflowX: "hidden" }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-0">
                            <h4 className="fw-bold mb-0">Payroll Management <span className="text-primary"><FaMoneyCheckAlt /></span></h4>
                            <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem' }}>
                                <span className="rounded-circle bg-white" style={{ width: '6px', height: '6px' }}></span>
                                LIVE
                            </span>
                        </div>
                        <p className="text-muted mb-0 small">Live monitoring of salaries, bonuses, and analytics</p>
                    </div>
                </div>

                <div className="d-flex gap-2">
                    {/* Company Filter */}
                    {isSuperAdmin && (
                        <select className="form-select" style={{ width: '200px' }} value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                            <option value="">-- All Companies --</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}

                    {/* Month Filter */}
                    <input type="month" className="form-control" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: '180px' }} />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row mb-3 g-2">
                <div className="col-md-2">
                    <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="card-body p-3">
                            <h6 className="text-muted small text-uppercase fw-bold mb-1">Total Fund</h6>
                            <h4 className="text-primary fw-bold mb-0">₹{totalFund.toLocaleString()}</h4>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>{selectedMonth}</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-2">
                    <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="card-body p-3">
                            <h6 className="text-muted small text-uppercase fw-bold mb-1">Pending</h6>
                            <h4 className="text-warning fw-bold mb-0">{payrollData.filter(p => p.status === 'Pending').length}</h4>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>Payouts</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-8">
                    <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="card-body d-flex justify-content-center align-items-center p-1">
                            <div style={{ width: '100%', height: '100px' }}>
                                <Bar
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        layout: { padding: 5 },
                                        plugins: {
                                            legend: { display: false },
                                            title: {
                                                display: true,
                                                text: 'Fund Allocation by Company',
                                                font: { size: 10 },
                                                padding: { bottom: 5 }
                                            }
                                        },
                                        scales: {
                                            x: { ticks: { font: { size: 9 } } },
                                            y: { ticks: { font: { size: 9 } } }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center border-bottom" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <h6 className="mb-0 text-primary fw-bold">Employee Payrolls</h6>
                    <button className="btn btn-sm btn-outline-primary px-3 rounded-pill" style={{ fontSize: '0.75rem' }}>
                        <FaFileDownload className="me-1" /> Export Report
                    </button>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle" style={{ fontSize: '0.85rem' }}>
                            <thead className="table-light">
                                <tr>
                                    <th className="py-2 ps-3">Employee</th>
                                    <th className="py-2">Company</th>
                                    <th className="py-2">Task / Project</th>
                                    <th className="py-2 text-center">Salary</th>
                                    <th className="py-2 text-center">Bonus</th>
                                    <th className="py-2 text-center">Deduct.</th>
                                    <th className="py-2 text-center">Leaves</th>
                                    <th className="py-2 text-center">Net Pay</th>
                                    <th className="py-2 text-center">Status</th>
                                    <th className="py-2 text-end pe-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrollData.map((item) => {
                                    const isEditing = editingId === item.id;
                                    const netPay = isEditing
                                        ? (parseInt(editFormData.salary || 0) + parseInt(editFormData.bonus || 0) - parseInt(editFormData.deductions || 0))
                                        : (item.salary + item.bonus - item.deductions);
                                    const companyName = companies.find(c => c.id === item.companyId)?.name || "Unknown";

                                    return (
                                        <tr key={item.id}>
                                            <td className="ps-3 py-2">
                                                <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{item.name}</div>
                                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>{item.role}</small>
                                            </td>
                                            <td className="py-2">
                                                <span className="badge rounded-pill fw-normal" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                                    {companyName}
                                                </span>
                                            </td>
                                            <td className="py-2" style={{ minWidth: '180px' }}>
                                                {isEditing ? (
                                                    <div className="d-flex flex-column gap-1">
                                                        <input type="text" name="assignedTask" className="form-control form-control-sm py-0 px-2" value={editFormData.assignedTask} onChange={handleInputChange} placeholder="Task" style={{ fontSize: '0.75rem' }} />
                                                        <input type="text" name="currentTask" className="form-control form-control-sm py-0 px-2" value={editFormData.currentTask} onChange={handleInputChange} placeholder="Current" style={{ fontSize: '0.75rem' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.75rem' }}>
                                                        <div className="text-dark"><span className="text-muted">Assigned:</span> {item.assignedTask}</div>
                                                        <div className="text-primary"><span className="text-muted">Current:</span> {item.currentTask}</div>
                                                        <div className="progress mt-1" style={{ height: '3px' }}>
                                                            <div className="progress-bar bg-success" role="progressbar" style={{ width: `${item.taskProgress}%` }}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2 text-center text-dark">₹{item.salary.toLocaleString()}</td>
                                            <td className="py-2 text-center text-success">
                                                {isEditing ? (
                                                    <input type="number" name="bonus" className="form-control form-control-sm py-0 text-center" value={editFormData.bonus} onChange={handleInputChange} style={{ width: '60px', fontSize: '0.8rem', margin: '0 auto' }} />
                                                ) : (
                                                    `+₹${item.bonus.toLocaleString()}`
                                                )}
                                            </td>
                                            <td className="py-2 text-center text-danger">
                                                {isEditing ? (
                                                    <input type="number" name="deductions" className="form-control form-control-sm py-0 text-center" value={editFormData.deductions} onChange={handleInputChange} style={{ width: '60px', fontSize: '0.8rem', margin: '0 auto' }} />
                                                ) : (
                                                    `-₹${item.deductions.toLocaleString()}`
                                                )}
                                            </td>
                                            <td className="py-2 text-center">
                                                <span className="badge rounded-pill fw-normal" style={{ backgroundColor: item.leavesTaken > 2 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(54, 162, 235, 0.1)', color: item.leavesTaken > 2 ? 'var(--warning)' : 'var(--primary)', border: 'none' }}>
                                                    {item.leavesTaken}d
                                                </span>
                                            </td>
                                            <td className="py-2 text-center fw-bold text-dark">₹{netPay.toLocaleString()}</td>
                                            <td className="py-2 text-center">
                                                <span className={`badge rounded-pill px-2 py-1 fw-normal`} style={{
                                                    backgroundColor: item.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: item.status === 'Paid' ? '#10b981' : '#f59e0b',
                                                    fontSize: '0.7rem'
                                                }}>
                                                    {item.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-2 text-end pe-3">
                                                {isEditing ? (
                                                    <div className="d-flex gap-1 justify-content-end">
                                                        <button
                                                            className="btn btn-sm btn-success p-1 d-flex align-items-center justify-content-center shadow-sm"
                                                            onClick={() => handleSave(item.id, item.companyId)}
                                                            style={{ width: '28px', height: '28px', backgroundColor: '#10b981', color: 'white', border: 'none' }}
                                                        >
                                                            <FaCheck size={12} />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary p-1 d-flex align-items-center justify-content-center shadow-sm"
                                                            onClick={handleCancelEdit}
                                                            style={{ width: '28px', height: '28px', backgroundColor: '#6b7280', color: 'white', border: 'none' }}
                                                        >
                                                            <FaTimes size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex gap-1 justify-content-end align-items-center">
                                                        {item.status === 'Pending' && (
                                                            <button className="btn btn-sm btn-primary py-0 px-2 rounded-pill shadow-sm" onClick={() => handleProcessParams(item.id)} style={{ fontSize: '0.7rem', height: '24px' }}>Process</button>
                                                        )}
                                                        <button
                                                            className="btn btn-sm d-flex align-items-center justify-content-center shadow-sm"
                                                            onClick={() => handleEditClick(item)}
                                                            style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                background: 'rgba(59, 130, 246, 0.15)',
                                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                                borderRadius: '6px',
                                                                color: '#3b82f6'
                                                            }}
                                                        >
                                                            <FaPencilAlt size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {payrollData.length === 0 && (
                                    <tr>
                                        <td colSpan="10" className="text-center py-4 text-muted">No payroll records found for this selection.</td>
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

export default HRPayroll;
