import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import HRDashboard from "./hr/HRDashboard";
import EmployeeDashboard from "./employee/EmployeeDashboard";
import CompanyDashboard from "./hr/CompanyDashboard";

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div className="alert alert-danger">Please log in first</div>;
  }

  // Route to appropriate dashboard based on user type
  switch (user?.type) {
    case "hr":
      return <HRDashboard />;
    case "employee":
      return <EmployeeDashboard />;
    case "company":
      return <CompanyDashboard />;
    default:
      return (
        <div className="container py-4">
          <div className="alert alert-warning">Unknown user type</div>
        </div>
      );
  }
};

export default Dashboard;
