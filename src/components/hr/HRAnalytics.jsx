import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

// Render each non-empty pie/doughnut slice with its share of the total.
const percentageLabelsPlugin = {
    id: 'percentageLabels',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const dataset = chart.data.datasets[0];
        const values = dataset?.data?.map(Number) || [];
        const total = values.reduce((sum, value) => sum + (value > 0 ? value : 0), 0);

        if (!total) return;

        chart.getDatasetMeta(0).data.forEach((arc, index) => {
            const value = values[index];
            if (!value || arc.circumference < 0.15) return;

            const percentage = Math.round((value / total) * 100);
            const { x, y } = arc.getCenterPoint();
            const backgroundColor = dataset.backgroundColor?.[index];

            ctx.save();
            ctx.fillStyle = backgroundColor === '#f6c23e' ? '#343a40' : '#ffffff';
            ctx.font = '600 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${percentage}%`, x, y);
            ctx.restore();
        });
    }
};

const HRAnalytics = () => {
    const { user, companies, activityLog, leaveRequests, refreshDashboardData } = useAuth();
    const { theme } = useTheme();
    const chartTextColor = theme === 'dark' ? '#f1f5f9' : '#1f2937';
    const chartGridColor = theme === 'dark' ? 'rgba(226, 232, 240, 0.1)' : 'rgba(15, 23, 42, 0.08)';
    const [selectedCompanyId, setSelectedCompanyId] = React.useState(user?.companyId);

    // Auto-refresh for "Live" experience
    React.useEffect(() => {
        const interval = setInterval(() => {
            if (refreshDashboardData) refreshDashboardData();
        }, 8000); // 8s poll for analytics
        return () => clearInterval(interval);
    }, [refreshDashboardData]);

    // Update selected company if user changes (or on initial load)
    React.useEffect(() => {
        if (user?.companyId) {
            setSelectedCompanyId(user.companyId);
        }
    }, [user]);

    // 1. Get Selected Company Data
    const myCompany = useMemo(() => {
        // If "company" admin, use selectedCompanyId. Else (HR/Employee) use user.companyId
        const targetId = (user?.type === 'company') ? parseInt(selectedCompanyId) : user?.companyId;
        return companies.find(c => c.id === targetId);
    }, [companies, selectedCompanyId, user]);

    const employees = useMemo(() => {
        if (!myCompany) return [];
        const hr = myCompany.hrAccounts || [];
        const staff = myCompany.employeeAccounts || [];
        // Determine department for HR if missing
        const hrWithDept = hr.map(h => ({ ...h, department: h.department || 'HR' }));
        return [...hrWithDept, ...staff];
    }, [myCompany]);

    // 2. Prepare Data for Charts

    // --- A. Department Distribution (Pie Chart) ---
    // --- A. Department Distribution (Pie Chart) -> Mapped to Work Mode as requested ---
    const departmentData = useMemo(() => {
        const counts = { 'WFH': 0, 'Office Employee': 0, 'Sales': 0 };

        employees.forEach(emp => {
            const type = (emp.employeeType || '').toLowerCase().trim();
            const isHR = emp.empId && emp.empId.startsWith('HR');

            if (type === 'wfh') {
                counts['WFH']++;
            } else if (type === 'sales') {
                counts['Sales']++;
            } else if (type === 'office' || type === 'office employee' || isHR) {
                // Default HR and regular office staff to "Office Employee"
                counts['Office Employee']++;
            } else {
                // Check if we need an 'Other' category or just dump into Office?
                // For now, if it's completely unknown activity, maybe 'Office Employee' is safest default
                counts['Office Employee']++;
            }
        });

        // Remove categories with 0 count to clean up chart? 
        // Or keep them to show they are tracked. User asked for specific 3.
        // Let's keep them if they exist.

        return {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: [
                    '#36b9cc', // WFH (Cyan/Blue)
                    '#1cc88a', // Office Employee (Green)
                    '#f6c23e', // Sales (Yellow/Orange)
                ],
                hoverOffset: 4
            }]
        };
    }, [employees]);

    // --- B. Leave Request Status (Doughnut Chart) ---
    const leaveData = useMemo(() => {
        const counts = { Pending: 0, Approved: 0, Rejected: 0 };
        const targetId = (user?.type === 'company') ? parseInt(selectedCompanyId) : user?.companyId;

        // Filter leaves for target company
        const companyLeaves = leaveRequests.filter(l => l.companyId === targetId || l.companyId === String(targetId));

        companyLeaves.forEach(l => {
            if (counts[l.status] !== undefined) counts[l.status]++;
        });

        return {
            labels: ['Pending', 'Approved', 'Rejected'],
            datasets: [{
                data: [counts.Pending, counts.Approved, counts.Rejected],
                backgroundColor: ['#f6c23e', '#1cc88a', '#e74a3b'],
                hoverOffset: 4
            }]
        };
    }, [leaveRequests, selectedCompanyId, user]);

    // --- C. Activity/Attendance Trends (Bar Chart - Last 7 Days) ---
    const activityTrendData = useMemo(() => {
        const targetId = (user?.type === 'company') ? parseInt(selectedCompanyId) : user?.companyId;

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const activityCounts = last7Days.map(date => {
            return activityLog.filter(log =>
                (log.companyId === targetId || log.companyId === String(targetId)) &&
                log.timestamp &&
                log.timestamp.startsWith(date)
            ).length;
        });

        return {
            labels: last7Days.map(d => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Activity Volume',
                data: activityCounts,
                backgroundColor: 'rgba(78, 115, 223, 0.7)',
                borderColor: 'rgba(78, 115, 223, 1)',
                borderWidth: 1
            }]
        };
    }, [activityLog, selectedCompanyId, user]);

    if (!myCompany && user?.type !== 'company') {
        return <div className="p-5 text-center">Loading Company Data...</div>;
    }

    return (
        <div className="container-fluid pb-3" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '60px' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-shrink-0">
                <div className="d-flex align-items-center gap-3">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <h2 className="mb-0 fw-bold text-gray-800">Analytics Dashboard</h2>
                            <span className="badge bg-danger d-flex align-items-center gap-1 pulse-slow" style={{ fontSize: '0.7rem' }}>
                                <span className="rounded-circle bg-white" style={{ width: '6px', height: '6px' }}></span>
                                LIVE
                            </span>
                        </div>
                        <p className="text-muted mb-0">
                            Overview for {myCompany ? myCompany.name : 'All Companies'}
                        </p>
                    </div>
                </div>

                {/* Company Selector for Admin */}
                {user?.type === 'company' && (
                    <div className="d-flex align-items-center">
                        <label className="me-2 fw-bold text-muted small">View Company:</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '200px' }}
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                        >
                            {companies.map(c => (
                                <option key={c.id} value={c.id}>{c.name} (IDs: {c.employeeAccounts?.length || 0})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-grow-1" style={{ overflowY: 'auto', paddingRight: '5px' }}>
                {/* Summary Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card border-left-primary shadow h-100 py-2 border-0 border-start border-4 border-primary bg-white">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Employees</div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{employees.length}</div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="bi bi-people fa-2x text-gray-300 display-6 text-muted"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card border-left-success shadow h-100 py-2 border-0 border-start border-4 border-success bg-white">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-success text-uppercase mb-1">Active Leaves</div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                            {leaveRequests.filter(l => (l.companyId === (user?.type === 'company' ? parseInt(selectedCompanyId) : user?.companyId)) && l.status === 'Approved').length}
                                        </div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="bi bi-calendar-check fa-2x text-gray-300 display-6 text-muted"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card border-left-info shadow h-100 py-2 border-0 border-start border-4 border-info bg-white">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-info text-uppercase mb-1">Recent Activities (Today)</div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                            {activityLog.filter(l => {
                                                const targetId = (user?.type === 'company' ? parseInt(selectedCompanyId) : user?.companyId);
                                                const isToday = l.timestamp && l.timestamp.split('T')[0] === new Date().toISOString().split('T')[0];
                                                const isMyCompany = (String(l.companyId) === String(targetId));
                                                return isToday && isMyCompany;
                                            }).length}
                                        </div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="bi bi-activity fa-2x text-gray-300 display-6 text-muted"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card border-left-warning shadow h-100 py-2 border-0 border-start border-4 border-warning bg-white">
                            <div className="card-body">
                                <div className="row no-gutters align-items-center">
                                    <div className="col mr-2">
                                        <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">Pending Requests</div>
                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                            {leaveRequests.filter(l => (l.companyId === (user?.type === 'company' ? parseInt(selectedCompanyId) : user?.companyId)) && l.status === 'Pending').length}
                                        </div>
                                    </div>
                                    <div className="col-auto">
                                        <i className="bi bi-hourglass-split fa-2x text-gray-300 display-6 text-muted"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row 1 */}
                <div className="row mb-4">
                    {/* Employee Distribution */}
                    <div className="col-lg-6 mb-4">
                        <div className="card shadow mb-4 h-100">
                            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
                                <h6 className="m-0 font-weight-bold text-primary">Department Distribution</h6>
                            </div>
                            <div className="card-body">
                                <div className="chart-pie pt-4 pb-2" style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                                    <Pie
                                        data={departmentData}
                                        options={{
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    labels: {
                                                        color: chartTextColor,
                                                        font: { size: 12, weight: '600' }
                                                    }
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: (context) => {
                                                            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                                                            const percentage = total ? Math.round((context.raw / total) * 100) : 0;
                                                            return `${context.label}: ${context.raw} (${percentage}%)`;
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                        plugins={[percentageLabelsPlugin]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Leave Stats */}
                    <div className="col-lg-6 mb-4">
                        <div className="card shadow mb-4 h-100">
                            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
                                <h6 className="m-0 font-weight-bold text-primary">Leave Request Status</h6>
                            </div>
                            <div className="card-body">
                                <div className="chart-pie pt-4 pb-2" style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                                    <Doughnut
                                        data={leaveData}
                                        options={{
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    labels: {
                                                        color: chartTextColor,
                                                        font: { size: 12, weight: '600' }
                                                    }
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: (context) => {
                                                            const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                                                            const percentage = total ? Math.round((context.raw / total) * 100) : 0;
                                                            return `${context.label}: ${context.raw} (${percentage}%)`;
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                        plugins={[percentageLabelsPlugin]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="row">
                    {/* Activity Trend */}
                    <div className="col-12 mb-4">
                        <div className="card shadow mb-4">
                            <div className="card-header py-3 bg-white">
                                <h6 className="m-0 font-weight-bold text-primary">Activity Overview (Last 7 Days)</h6>
                            </div>
                            <div className="card-body">
                                <div className="chart-bar" style={{ height: '320px' }}>
                                    <Bar
                                        data={activityTrendData}
                                        options={{
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    labels: {
                                                        color: chartTextColor,
                                                        font: { size: 12, weight: '600' }
                                                    }
                                                }
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: { color: chartTextColor },
                                                    grid: { color: chartGridColor }
                                                },
                                                x: {
                                                    ticks: { color: chartTextColor },
                                                    grid: { color: chartGridColor }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HRAnalytics;