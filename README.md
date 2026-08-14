# 💼 Focus Engineering Unified HRMS & Sales Tracking System

A comprehensive Human Resource Management and Sales Tracking suite. This project includes a **Web Portal**, a **Desktop Application**, a **Mobile App** for field agents, and an **EC2-hosted Backend** powered by MongoDB.

---

## 🏗️ Project Architecture (AWS Cloud)

This system is fully deployed on AWS, utilizing same-origin routing to eliminate CORS issues and Mixed Content warnings:

1. **Frontend (Web Portal)**: React + Vite application, hosted on AWS S3 and served via CloudFront.
2. **Backend (API & WebSockets)**: Node.js + Express API + Socket.io, hosted on AWS EC2 (`65.1.134.117:5000`).
3. **CloudFront Routing**: 
   - `/*` routes to the S3 bucket (Frontend)
   - `/api/*` routes to the EC2 instance (Backend)
4. **Desktop App**: Electron wrapper around the web portal.
5. **Mobile App**: Expo (React Native) app for field employees.

---

## 📝 Live Production Details & Credentials

### 🌐 Live URLs

| Service | URL |
|---------|-----|
| **Production App (Frontend & API)** | [https://hrms.focusengineeringapp.com](https://hrms.focusengineeringapp.com) |
| **Backend API Route** | `https://hrms.focusengineeringapp.com/api` |

### 🔐 Focus Engineering Login Credentials

Sign in directly at `https://hrms.focusengineeringapp.com` using any of the active accounts below. The Unified Login System will auto-detect the user's role and route them appropriately.

#### 🏢 1. Company Admin / Super Admin
*System-wide access to manage companies, departments, global permissions, and settings.*
- **Email**: `admin@focus.com`
- **Password**: `Focus@123`

#### 👔 2. HR Manager
*Access to approve leaves/permissions, view live daily work logs, inspect employee activity reports, and manage attendance/payroll.*
- **Email**: `hr@focus.com`
- **Password**: `ZT@aeCZbu!fh`
*(Additional HR: `priya@focus.com` / `AN7zeUnc326h`)*

#### 👤 3. Employees (Staff & Field Agents)
*Access for daily check-in, EOD checkout work summaries, leave requests, real-time chat, and project task status tracking.*
- **Bharathan** (Office Staff): `bv@focus.com` / `7OGPHZ@Ob3cU`
- **Vicky** (Office Staff): `bharathanvicky@gmail.com` / `dWqRBd05ukc@`
- **Alice Johnson** (Sales Manager): `alice@techsolutions.com` / `password`

---

## 🚀 How to Run the Project Locally

### Step 1: Start the Backend (API & Database)
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *The backend will run on `http://localhost:5000`.*

### Step 2: Start the Web Portal (Frontend)
1. Open a **new terminal** in the project root.
2. Install root dependencies and start Vite:
   ```bash
   npm install
   npm run dev
   ```
   *The web portal will be available at `http://localhost:5173`.*

### Step 3: Launch the Desktop App (Optional)
1. Ensure the Web Portal (Step 2) is already running.
2. Open a **new terminal** in the project root:
   ```bash
   npm run electron
   ```

### Step 4: Start the Mobile App (For Field Agents)
1. Open a **new terminal** and navigate to the `mobile-app` folder:
   ```bash
   cd mobile-app
   npm install
   npx expo start
   ```

---

## ⚡ Quick Start (Windows)
We have provided a batch script to launch the Backend and Web Portal simultaneously:
Simply double-click **`START_PROJECT.bat`** in the root directory.

---

## 📁 Module Documentation
- [Backend Setup & API Docs](./BACKEND_SETUP.md)
- [Frontend Details](./FRONTEND_README.md)
- [Mobile App Guide](./mobile-app/MOBILE_README.md)
