# 💼 Unified HRMS & Sales Tracking System

A comprehensive Human Resource Management and Sales Tracking suite. This project includes a **Web Portal**, a **Desktop Application**, a **Mobile App** for field agents, and a **Firebase-powered Backend**.

---

## 🏗️ Project Architecture

This is a multi-module project consisting of:

1.  **Backend Server** (`/backend`): Node.js + Express API using Google Firestore.
2.  **Web Frontend** (`/src`): React + Vite web portal.
3.  **Desktop App** (`/electron-app`): Electron wrapper around the web portal.
4.  **Mobile App** (`/mobile-app`): Expo (React Native) app for field employees.

---

## 🚀 How to Run the Project Locally

Follow these steps in order to get the entire system running on your machine.

### Step 1: Start the Backend (API & Database)
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   *The backend will run on `http://localhost:5000`.*

### Step 2: Start the Web Portal (Frontend)
1. Open a **new terminal** in the project root.
2. Install root dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   *The web portal will be available at `http://localhost:5173`.*

### Step 3: Launch the Desktop App (Optional)
1. Ensure the Web Portal (Step 2) is already running.
2. Open a **new terminal** in the project root.
3. Run the Electron launcher:
   ```bash
   npm run electron
   ```

### Step 4: Start the Mobile App (For Field Agents)
1. Open a **new terminal** and navigate to the `mobile-app` folder:
   ```bash
   cd mobile-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the `BASE_URL` in `mobile-app/src/services/api.js` to your computer's local IP address (e.g., `192.168.x.x`).
4. Start Expo:
   ```bash
   npx expo start
   ```
5. Scan the QR code with the **Expo Go** app on your phone.

---

## ⚡ Quick Start (Windows)
We have provided a batch script to launch the Backend and Web Portal simultaneously:
Simply double-click **`START_PROJECT.bat`** in the root directory.

---

## 📁 Module Documentation
- [Backend Setup & API Docs](./BACKEND_SETUP.md)
- [Frontend Details](./FRONTEND_README.md)
- [Mobile App Guide](./mobile-app/MOBILE_README.md)

---

## 📝 Credentials & Configuration

---

### 🔐 Default Login Credentials

Sign in directly using any of the active accounts below (the Unified Login System handles role routing automatically).

---

#### 🏢 Company Portal (System Admin)
*Super Admin access to manage companies and global settings.*

| Field | Value |
|-------|-------|
| **Email** | `admin@focus.com` |
| **Password** | `Focus@123` |
| **Name** | Admin User |

---

#### 👔 HR Manager Portal (Administrative Access)
*HR/Admin access to manage employees, attendance, and payroll for a specific company (Cobinno).*

| Field | Value |
|-------|-------|
| **Email** | `hr@focus.com` |
| **Password** | `ZT@aeCZbu!fh` |
| **Name** | hr |
| **Company** | Cobinno |

---

#### 👤 Employee Portal (Staff Portal)
*Standard employee access for attendance, tracking, and dashboard.*

| # | Name | Email | Password | Role / Department |
|---|------|-------|----------|-------------------|
| 1 | EMP | `offemp@gmail.com` | `yf3fdnl#Vi$y` | Office (Unassigned) |
| 2 | Mobile Sales Tester | `sales@test.com` | `salestest` | Sales Field Agent |

---

### 🌐 Frontend Environment Variables

**File: `.env`** *(Local Development)*
```env
VITE_API_URL=http://localhost:5000/api
```

**File: `.env.production`** *(Production / Deployed)*
```env
VITE_API_URL=https://hrms-backend-22uq.onrender.com/api
VITE_SOCKET_URL=https://hrms-backend-22uq.onrender.com
```

---

### 🔥 Firebase Configuration (Frontend)

**File: `src/firebase.js`**
```js
const firebaseConfig = {
    apiKey:            "<YOUR_API_KEY>",
    authDomain:        "<YOUR_AUTH_DOMAIN>",
    projectId:         "<YOUR_PROJECT_ID>",
    storageBucket:     "<YOUR_STORAGE_BUCKET>",
    messagingSenderId: "<YOUR_MESSAGING_SENDER_ID>",
    appId:             "<YOUR_APP_ID>",
    measurementId:     "<YOUR_MEASUREMENT_ID>"
};
```

---

### 🛡️ Firebase Admin SDK – Service Account (Backend)

**File: `backend/serviceAccountKey.json`**

| Field | Value |
|-------|-------|
| `type` | `service_account` |
| `project_id` | `<YOUR_PROJECT_ID>` |
| `private_key_id` | `<YOUR_PRIVATE_KEY_ID>` |
| `client_email` | `<YOUR_CLIENT_EMAIL>` |
| `client_id` | `<YOUR_CLIENT_ID>` |
| `auth_uri` | `https://accounts.google.com/o/oauth2/auth` |
| `token_uri` | `https://oauth2.googleapis.com/token` |

> ⚠️ **Never commit `serviceAccountKey.json` to a public repository.** The private key grants full admin access to your Firebase project.

---

### ☁️ Firebase Project Info

| Property | Value |
|----------|-------|
| **Project ID** | `<YOUR_PROJECT_ID>` |
| **Firebase Console** | [https://console.firebase.google.com/project/<YOUR_PROJECT_ID>](https://console.firebase.google.com/project/<YOUR_PROJECT_ID>) |
| **Storage Bucket** | `<YOUR_PROJECT_ID>.firebasestorage.app` |
| **Firestore DB** | Enabled (default region) |
| **Firebase Auth** | Enabled |

---

### 🚀 Deployed Backend (Render)

| Property | Value |
|----------|-------|
| **API Base URL** | `https://hrms-backend-22uq.onrender.com/api` |
| **Socket URL** | `https://hrms-backend-22uq.onrender.com` |
