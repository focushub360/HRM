# 🖥️ HRMS Frontend (Web & Desktop)

This is the UI layer of the Human Resource Management System, built with **React** and **Vite**. It functions as both a responsive web application and a cross-platform desktop application via **Electron**.

## 🛠️ Tech Stack
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 7](https://vitejs.dev/)
- **Styling**: Bootstrap 5 + Vanilla CSS
- **Icons**: React Icons (Fa, Md) + Bootstrap Icons
- **Desktop Wrapper**: Electron 28

## 🚀 Getting Started

### 1. Installation
Navigate to the project root and install dependencies:
```bash
npm install
```

### 2. Running Locally (Web)
Start the Vite development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### 3. Running as a Desktop App (Electron)
To launch the application as a standalone desktop window (requires the dev server to be running or a specific build):
```bash
npm run electron
```

## 📂 Project Structure
- `src/components/`: Modular React components.
  - `hr/`: Management screens (Employees, Payroll, Analytics).
  - `employee/`: Self-service screens (Attendance, Permissions).
  - `sales/`: Field tracking and lead management.
- `src/context/`: State management (Auth and Theme).
- `electron-app/`: Main and preload scripts for the desktop container.
- `public/`: Static assets (Logo, Favicon).

## 🌙 Theme Support
The application features a fully integrated **Dark Mode / Light Mode** system. You can toggle the theme using the button at the bottom of the sidebar.

## 🔒 Protected Routing
Routes are protected based on user role (`hr`, `employee`, `company`). If a user attempts to access a page they don't have permission for, they are redirected to the dashboard.
