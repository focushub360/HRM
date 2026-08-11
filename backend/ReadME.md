# HRMS Backend (Node.js + Express + MongoDB)

This is a full rewrite of the old Firebase/Firestore backend into a plain
**Node.js (ESM) + Express + MongoDB (Mongoose)** REST API. All routes,
request/response shapes, and Socket.IO events are kept **identical** to the
old backend, so the existing React frontend, Electron app, and mobile app
work with **zero code changes** apart from the login page (see below).

## Folder structure

```
backend/
├── server.js                # entry point (connects DB, starts HTTP+Socket.IO)
├── package.json
├── .env.example              # copy to .env and fill in MONGODB_URI
├── nodemon.json
└── src/
    ├── app.js                 # express app, middleware, route mounting
    ├── config/
    │   └── db.js               # mongoose connection
    ├── models/                 # one file per Mongo collection
    │   ├── Counter.js           # auto-increment numeric ids (company/employee)
    │   ├── Company.js
    │   ├── Employee.js
    │   ├── ActivityLog.js
    │   ├── InactivityAlert.js
    │   ├── ProctoringLog.js
    │   ├── Lead.js
    │   ├── Visit.js
    │   ├── LeaveRequest.js
    │   ├── Event.js
    │   ├── Recognition.js
    │   ├── Post.js
    │   ├── Task.js
    │   ├── Project.js
    │   ├── GpsRoute.js
    │   ├── DailyStat.js
    │   └── Message.js
    ├── controllers/            # business logic, one file per resource
    ├── routes/                 # express routers, one file per resource + index.js
    ├── middleware/
    │   ├── errorHandler.js
    │   └── auth.js              # optional JWT protect()/authorize() helpers
    ├── socket/
    │   └── index.js             # Socket.IO event handlers
    └── utils/
        ├── helpers.js            # distance calc, password generator
        ├── asyncHandler.js
        ├── scheduler.js          # weekly chat cleanup job
        └── seed.js                # `npm run seed` - demo company/hr/employees
```

## Setup

```bash
cd backend
npm install
cp .env.example or .env
# Edit .env and paste your MongoDB connection string into MONGODB_URI
npm run dev        # nodemon, auto-restarts on change
# or
npm start
```

The server listens on `PORT` (default `5000`) exactly like before, and all
routes are still mounted under `/api`, so your frontend's
`src/config.js` (`VITE_API_URL`) does not need to change.

### Seed demo data (optional)

```bash
npm run seed
```

Creates one demo company with:
- Admin: `admin@focus.com` / `Focus@123`
- HR: `raj.kumar@techsolutions.com` / `Secure@123`
- Employee: `alice@techsolutions.com` / `password`

## Data model notes

- **Company** and **Employee** keep a numeric `id` field (auto-incremented
  via the `Counter` collection) instead of Mongo's ObjectId, because the
  existing frontend does things like `parseInt(companyId)` and
  `c.id === parseInt(companyId)`. This keeps that code working unchanged.
- **HR accounts** stay embedded inside the `Company` document (`hrAccounts`
  array), same as the old Firestore design — it's a small, tightly-coupled
  list.
- **Employees** now live in their own top-level `Employee` collection
  (previously a Firestore sub-collection) for cleaner querying, but the API
  response shape (`GET /api/companies/:companyId/employees`) is unchanged.
- All the "free-form" collections (leads, visits, tasks, projects, leave
  requests, events, recognitions, posts, activity logs, inactivity alerts,
  proctoring logs, gps routes) use `strict:false` Mongoose schemas so any
  extra fields the frontend sends are stored as-is, and expose Mongo's
  `_id` as a plain `id` string field — matching Firestore's document-id
  behaviour.

## Authentication: Universal Login

`POST /api/auth/login` now supports **two modes**:

1. **New universal login** (recommended) — send only `{ email, password }`.
   The backend automatically checks Company Admin → HR → Employee (in that
   order) for a matching email + password, and returns whichever account
   matches, including a `role` field (`admin` / `hr` / `employee`) and a
   `type` field for frontend compatibility. This powers the single login
   page (`src/components/Login.jsx`) — no more "select your portal" step.

2. **Legacy role-scoped login** (still supported) — send
   `{ type: 'company' | 'hr' | 'employee', email, password }` exactly like
   before, including the same `WRONG_ROLE` / `INACTIVE_ACCOUNT` error
   messages.

A JWT (`token`) is also included in the response for future use (e.g.
protecting routes with the provided `protect` middleware in
`src/middleware/auth.js`), but nothing currently requires it — the
frontend doesn't need to send it unless you decide to lock down routes.

## What changed vs. the old backend

- Firebase Admin SDK / Firestore → Mongoose / MongoDB.
- `database.js` (one big file) → split into `models/` + `controllers/`.
- `server.js` (one big file with all routes inline) → `routes/*.js` +
  `app.js` + `server.js`.
- Added `.env`-driven config (Mongo URI, JWT secret, CORS origin, port).
- Added optional JWT issuing/verification (not enforced by default).
- All API paths, payloads, and response shapes are unchanged.