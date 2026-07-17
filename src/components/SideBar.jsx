import React, { useState } from "react";
import {
  FaComments,
  FaUsers,
  FaNewspaper,
  FaAward,
  FaCalendarAlt,
  FaUser,
  FaBuilding,
  FaCog,
  FaSignOutAlt,
  FaChartBar,
  FaClock,
  FaClipboardList,
  FaMapMarkerAlt,
  FaTasks,
  FaWallet,
  FaBars,
  FaTimes,
  FaMoon,
  FaSun,
  FaProjectDiagram
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext.jsx";
import { MdSpaceDashboard } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "../assets/login_logo.png";
import userImg from "../assets/client.jpg";
import "/src/App.css";

const SideBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // State for sidebar visibility
  const [isOpen, setIsOpen] = useState(false);

  const allNavItems = [
    { name: "Dashboard", icon: <MdSpaceDashboard />, path: "/", permission: "view_dashboard" },
    { name: "Project Management", icon: <FaProjectDiagram />, path: "/hr/projects", permission: "events" },
    { name: "Employees", icon: <FaUsers />, path: "/employees", permission: "manage_employees" },
    { name: "Leave Management", icon: <FaClock />, path: "/hr/leave", permission: "manage_leaves" },
    { name: "Activity Reports", icon: <FaClipboardList />, path: "/activity-reports", permission: "manage_users" },
    { name: "Chat", icon: <FaComments />, path: "/chat", permission: "chat" },
    { name: "Feed", icon: <FaNewspaper />, path: "/feed", permission: "feed" },
    { name: "Recognition", icon: <FaAward />, path: "/recognition", permission: "recognition" },
    { name: "Events", icon: <FaCalendarAlt />, path: "/event", permission: "events" },
    { name: "Attendance Registration", icon: <FaClipboardList />, path: "/hr/attendance-register", permission: "manage_attendance" },
    { name: "Live Tracking", icon: <FaMapMarkerAlt />, path: "/hr/live-tracking", permission: "monitor_employees" },
    { name: "Activity Logs", icon: <FaMapMarkerAlt />, path: "/tracker", permission: "view_attendance" },
    { name: "Sales Management", icon: <FaMapMarkerAlt />, path: "/sales/dashboard", permission: "manage_employees" },
    { name: "Payroll", icon: <FaChartBar />, path: "/hr/payroll", permission: "manage_payroll" },
    { name: "Analytics", icon: <FaChartBar />, path: "/hr/analytics", permission: "view_reports" },
    { name: "Company Management", icon: <FaBuilding />, path: "/company", permission: "system_settings" },
    { name: "My Attendance", icon: <FaClock />, path: "/my-attendance", permission: "view_attendance" },
    { name: "Leaves & Permissions", icon: <FaClipboardList />, path: "/my-permissions", permission: "view_attendance" },
    { name: "Settings", icon: <FaCog />, path: "/settings", permission: "system_settings" },
    { name: "Profile", icon: <FaUser />, path: "/profile", permission: null },
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter((item) => {
    // Admin (Company) specific hides - requested by user to remove "HR managing functions"
    if (user?.type === 'company') {
      const adminHiddenPaths = [
        '/activity-reports',
        '/employees',
        '/hr/leave',
        '/hr/payroll',
        '/hr/attendance-register',
        '/sales/dashboard',
        '/hr/live-tracking',
        '/chat',
        '/feed',
        '/recognition',
        '/event',
        '/tracker',
        '/hr/projects'
      ];
      if (adminHiddenPaths.includes(item.path)) {
        return false;
      }
    }

    // HR/Company specific hides (Common logic)
    if ((user?.type === 'hr' || user?.type === 'company') && (item.path === '/my-attendance' || item.path === '/my-permissions' || item.path === '/tracker')) {
      return false;
    }
    // Employee specific hides (Attendance Register is for HR only)
    if (user?.type === 'employee' && item.path === '/hr/attendance-register') {
      return false;
    }

    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleLabel = () => {
    if (!user) return "";
    const labels = {
      hr: "HR Manager",
      employee: `${user.employeeType || "Employee"} Employee`,
      company: "Company Admin",
    };
    return labels[user.type] || "User";
  };

  return (
    <>
      {/* Dynamic Hamburger Trigger */}
      <div
        className={`sidebar-trigger-area ${isOpen ? 'sidebar-trigger-hidden' : ''}`}
        onMouseEnter={() => setIsOpen(true)}
        title="Hover to Open Menu"
      ></div>

      {/* Sidebar Drawer */}
      <div
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="d-flex justify-content-end px-3 d-md-none">
          {/* Close button for small screens if needed, mostly redundant with hover logic but good for touch */}
          <FaTimes className="cursor-pointer text-white mt-2" onClick={() => setIsOpen(false)} />
        </div>

        <div className="logo-container mt-3">
          <img src={logo} alt="Logo" className="logo" />
        </div>

        <div className="user-info">
          {/* Dynamic Avatar */}
          {user?.profileImage ? (
            <img src={user.profileImage} alt="User" className="avatar" style={{ objectFit: 'cover' }} />
          ) : (
            <div className="avatar d-flex align-items-center justify-content-center text-white fw-bold bg-primary"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                fontSize: '1.2rem',
                minWidth: '50px' // Prevent shrinking
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div>
            <div className="user-name">{user?.name || "User"}</div>
            <div className="user-role">{getRoleLabel()}</div>
          </div>
        </div>

        <ul className="nav-list">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  // Optional: Close on click? setIsOpen(false); 
                }}
                className={`nav-item ${isActive ? "active" : ""}`}
                title={item.name}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.name}</span>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SideBar;
