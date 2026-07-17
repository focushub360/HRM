# HRMS System - Backend Setup

## Architecture

This HRMS system now uses a **database-backed architecture** instead of localStorage to ensure data persistence across sessions.

### Components

1. **Frontend** (React + Vite)
   - Running on: `http://localhost:5173`
   - Uses API calls with `axios` or `fetch`
   - Role-based Protected Routes

2. **Backend** (Node.js + Express)
   - Running on: `http://localhost:5000`
   - Real-time communication via **Socket.IO**
   - Cloud DB integration via **Google Firebase/Firestore**

3. **Database (Cloud)**
   - Type: Firestore (NoSQL)
   - Collections: `companies`, `activityLogs`, `inactivityAlerts`, `leads`, `visits`, `leaveRequests`, `events`, `recognitions`, `feed`.
   - Admin/Auth: Managed through the `companies` collection sub-objects.

## Running Both Servers

### Terminal 1 - Frontend
```bash
cd path\to\HRMS_UptoSkills
npm install
npm run dev
```

### Terminal 2 - Backend
```bash
cd path\to\HRMS_UptoSkills\backend
npm install
npm start
```

## API Endpoints

### Companies
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create company
- `DELETE /api/companies/:id` - Delete company

### HR Accounts
- `POST /api/companies/:companyId/hr` - Add HR to company
- `DELETE /api/companies/:companyId/hr/:hrId` - Delete HR

### Employees
- `POST /api/companies/:companyId/employees` - Add employee
- `DELETE /api/companies/:companyId/employees/:employeeId` - Delete employee

### Authentication
- `POST /api/auth/login` - Authenticate user (HR/Employee/Company)

### Activity
- `POST /api/activities` - Log activity
- `GET /api/activities/:empId` - Get activities for employee

### Inactivity Alerts
- `POST /api/inactivity-alerts` - Log inactivity alert
- `GET /api/companies/:companyId/inactivity-alerts` - Get alerts for company

## Data Persistence

✅ All data is now persisted in the database.json file
✅ Data survives across logout/login sessions
✅ Multiple users can maintain different login credentials
✅ Activity logs are stored permanently
✅ No data loss on page refresh or browser restart

## Future Upgrades

This architecture can easily be upgraded to:
- PostgreSQL/MongoDB for better scalability
- Redis for session management
- JWT authentication tokens
- Real-time WebSocket connections for live notifications
