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

The app has **3 portals** on the login screen. Use the credentials below for each.

---

#### 🏢 Company Portal (System Admin)

| Field | Value |
|-------|-------|
| **Email** | `admin@focus.com` |
| **Password** | `Focus@123` |
| **Name** | Admin User |

---

#### 👔 HR Manager Portal (Administrative Access)

| Field | Value |
|-------|-------|
| **Email** | `raj.kumar@techsolutions.com` |
| **Password** | `Secure@123` |
| **Name** | Raj Kumar |
| **Emp ID** | `HR-TSI-001` |
| **Company** | Tech Solutions India |

---

#### 👤 Employee Portal (Staff Portal)

| # | Name | Email | Password | Emp ID | Department |
|---|------|-------|----------|--------|------------|
| 1 | Alice Johnson | `alice@techsolutions.com` | `password` | `EMP-TSI-001` | Sales |
| 2 | Bob Smith | `bob@techsolutions.com` | `password` | `EMP-TSI-002` | Engineering |
| 3 | Charlie Brown | `charlie@techsolutions.com` | `password` | `EMP-TSI-003` | Marketing |

> 💡 Run `node backend/seed_firestore.js` to seed the database with the above default accounts.

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
    apiKey:            "AIzaSyDBRe7aaOZHsOv9K3bDv2QjhLgUdlPxsOA",
    authDomain:        "pic-gen-6bc8d.firebaseapp.com",
    projectId:         "pic-gen-6bc8d",
    storageBucket:     "pic-gen-6bc8d.firebasestorage.app",
    messagingSenderId: "788766460578",
    appId:             "1:788766460578:web:498f1cd47baf7fe3b325fb",
    measurementId:     "G-HH65D8KXEB"
};
```

---

### 🛡️ Firebase Admin SDK – Service Account (Backend)

**File: `backend/serviceAccountKey.json`**

| Field | Value |
|-------|-------|
| `type` | `service_account` |
| `project_id` | `pic-gen-6bc8d` |
| `private_key_id` | `703143b88f707e9f313cea9ac8c9153b1a27ea3c` |
| `client_email` | `firebase-adminsdk-fbsvc@pic-gen-6bc8d.iam.gserviceaccount.com` |
| `client_id` | `115976971177547653924` |
| `auth_uri` | `https://accounts.google.com/o/oauth2/auth` |
| `token_uri` | `https://oauth2.googleapis.com/token` |

> ⚠️ **Never commit `serviceAccountKey.json` to a public repository.** The private key grants full admin access to your Firebase project.

---

### ☁️ Firebase Project Info

| Property | Value |
|----------|-------|
| **Project ID** | `pic-gen-6bc8d` |
| **Firebase Console** | [https://console.firebase.google.com/project/pic-gen-6bc8d](https://console.firebase.google.com/project/pic-gen-6bc8d) |
| **Storage Bucket** | `pic-gen-6bc8d.firebasestorage.app` |
| **Firestore DB** | Enabled (default region) |
| **Firebase Auth** | Enabled |

---

### 🚀 Deployed Backend (Render)

| Property | Value |
|----------|-------|
| **API Base URL** | `https://hrms-backend-22uq.onrender.com/api` |
| **Socket URL** | `https://hrms-backend-22uq.onrender.com` |
