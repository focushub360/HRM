import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/SideBar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import { useAuth } from "./context/AuthContext.jsx";
import "/src/App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import loginLogo from "./assets/Logo.png";

import CompanySpecificDashboard from "./components/hr/CompanySpecificDashboard.jsx";
import Event2 from "./components/Events2";
import Event1 from "./components/Event1";
import Event3 from "./components/Event3";
import Dashboard from "./components/Dashboard"; // Wrapper remains in components/
import Chat from "./components/Chat";
import Profile from "./components/Profile";
import Feed from "./components/Feed";
import Recognition from "./components/Recognition";
import ActivityTracker from "./components/ActivityTracker";
import FaceProctoring from "./components/employee/FaceProctoring";
import LiveGPSTracker from "./components/employee/LiveGPSTracker";
import Settings from "./components/Settings";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

// Lazy Load HR Components
const Employees = React.lazy(() => import("./components/hr/Employees"));
const CompanyManagement = React.lazy(() => import("./components/hr/CompanyManagement"));
const ActivityReports = React.lazy(() => import("./components/hr/ActivityReports"));
const AddEmployee = React.lazy(() => import("./components/hr/AddEmployee"));
const HRLeaveManagement = React.lazy(() => import("./components/hr/HRLeaveManagement"));
const HRPayroll = React.lazy(() => import("./components/hr/HRPayroll"));
const HRAnalytics = React.lazy(() => import("./components/hr/HRAnalytics"));
const AttendanceRegister = React.lazy(() => import("./components/hr/AttendanceRegister"));

// Lazy Load Employee Components
const MyPermissions = React.lazy(() => import("./components/employee/MyPermissions"));
const MyAttendance = React.lazy(() => import("./components/employee/MyAttendance"));

// Lazy Load Sales Components
const SalesVisits = React.lazy(() => import("./components/sales/SalesVisits"));
const SalesLeads = React.lazy(() => import("./components/sales/SalesLeads"));
const SalesTasks = React.lazy(() => import("./components/sales/SalesTasks.jsx"));
const SalesManagement = React.lazy(() => import("./components/sales/SalesManagement"));
const DesktopTracker = React.lazy(() => import("./components/DesktopTracker"));
const LiveTracking = React.lazy(() => import("./components/hr/LiveTracking"));
const ProjectManagement = React.lazy(() => import("./components/hr/ProjectManagement.jsx"));

function App() {
  try {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
      return (
        <ThemeProvider>
          <Login />
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider>
        <div className="d-flex w-100 h-100" style={{ flex: 1, overflow: "hidden" }}>
          <ActivityTracker />
          <FaceProctoring />
          <LiveGPSTracker />
          <Sidebar />
          <MainContentWrapper />
        </div>
      </ThemeProvider>
    );
  } catch (error) {
    console.error('App error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error Loading Application</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }
}

// Separate component to use useLocation hook
function MainContentWrapper() {
  const location = useLocation(); // Now safe to use as App is wrapped in BrowserRouter
  const { theme, toggleTheme } = useTheme();

  // Define routes that should be full-screen (no outer padding, no outer scroll)
  const isFullScreenPage =
    location.pathname === '/' ||
    location.pathname === '/employees' ||
    location.pathname.startsWith('/hr/analytics') ||
    location.pathname.startsWith('/hr/projects') ||
    location.pathname.startsWith('/tracker') ||
    location.pathname.startsWith('/sales') ||
    location.pathname.startsWith('/admin/company');

  return (
    <div className={`flex-grow-1 ${isFullScreenPage ? 'p-0' : 'px-4 pb-4'}`} style={{
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Global Header */}
      {!isFullScreenPage && (
        <div className="global-header shadow-sm">
          <div className="header-left">
            <img src={loginLogo} alt="Focus Engineering" className="header-brand-logo" />
          </div>
        </div>
      )}

      <Suspense fallback={<div className="text-center p-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
          <Route path="/company" element={<ProtectedRoute><CompanyManagement /></ProtectedRoute>} />
          <Route 
            path="/admin/company/:companyId" 
            element={
              <ProtectedRoute>
                <CompanySpecificDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/activity-reports" element={<ProtectedRoute><ActivityReports /></ProtectedRoute>} />
          <Route path="/hr/leave" element={<ProtectedRoute><HRLeaveManagement /></ProtectedRoute>} />
          <Route path="/hr/payroll" element={<ProtectedRoute><HRPayroll /></ProtectedRoute>} />
          <Route path="/hr/analytics" element={<ProtectedRoute><HRAnalytics /></ProtectedRoute>} />
          <Route path="/hr/attendance-register" element={<ProtectedRoute><AttendanceRegister /></ProtectedRoute>} />
          <Route path="/my-permissions" element={<ProtectedRoute><MyPermissions /></ProtectedRoute>} />
          <Route path="/my-attendance" element={<ProtectedRoute><MyAttendance /></ProtectedRoute>} />
          <Route path="/employees/add" element={<ProtectedRoute><AddEmployee /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/recognition" element={<ProtectedRoute><Recognition /></ProtectedRoute>} />
          <Route path="/event" element={<ProtectedRoute><Event1 /></ProtectedRoute>} />
          <Route path="/hr/projects" element={<ProtectedRoute><ProjectManagement /></ProtectedRoute>} />
          <Route path="/event/schedule" element={<ProtectedRoute><Event2 /></ProtectedRoute>} />
          <Route path="/event/confirmation" element={<ProtectedRoute><Event3 /></ProtectedRoute>} />

          <Route path="/tracker" element={<ProtectedRoute><DesktopTracker /></ProtectedRoute>} />
          <Route path="/hr/live-tracking" element={<ProtectedRoute><LiveTracking /></ProtectedRoute>} />

          {/* Sales Module Routes */}
          <Route path="/sales/dashboard" element={<ProtectedRoute><SalesManagement /></ProtectedRoute>} />
          <Route path="/sales/visits" element={<ProtectedRoute><SalesVisits /></ProtectedRoute>} />
          <Route path="/sales/leads" element={<ProtectedRoute><SalesLeads /></ProtectedRoute>} />
          <Route path="/sales/tasks" element={<ProtectedRoute><SalesTasks /></ProtectedRoute>} />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
