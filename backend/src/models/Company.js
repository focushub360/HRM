import mongoose from 'mongoose';

// Sub-schema for the company's own admin/owner login
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Admin User' },
    email: { type: String, default: '' },
    password: { type: String, default: '' }
  },
  { _id: false }
);

// Sub-schema for HR accounts embedded inside a company (small collection,
// same as the previous Firestore design)
const hrAccountSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true },
    name: String,
    email: String,
    empId: String,
    password: String,
    createdDate: String,
    status: { type: String, default: 'Active' }
  },
  { _id: false }
);

// ---------------------------------------------------------------------
// Feature Toggle Settings (Admin Settings -> "Application Settings")
// ---------------------------------------------------------------------
// Every organization/company on this platform has different operational
// needs. Some need strict GPS + face-camera verification for check-in,
// some only need GPS, some don't want the Chat/Task modules enabled at
// all for their staff. Instead of hardcoding this per-company, the
// Company Admin can flip these ON/OFF per company from Admin Settings ->
// Application Settings, and it instantly applies to that company's HR +
// every employee under it.
//
// IMPORTANT: default value for every flag is `true` (enabled) so existing
// companies created before this feature shipped keep working exactly as
// before until an admin explicitly turns something off.
const featureSettingsSchema = new mongoose.Schema(
  {
    // --- Attendance / Check-in & Check-out conditions ---
    attendanceLocationEnabled: { type: Boolean, default: true }, // require GPS location capture at check-in/out
    attendanceCameraEnabled: { type: Boolean, default: true },   // require webcam/face capture + proctoring at check-in/out

    // --- Collaboration / add-on modules ---
    chatEnabled: { type: Boolean, default: true },          // internal company Chat module
    taskManagementEnabled: { type: Boolean, default: true }, // Project/Task Management module
    liveTrackingEnabled: { type: Boolean, default: true },    // HR "Live Tracking" map of field employees
    recognitionEnabled: { type: Boolean, default: true },     // Recognition / kudos wall
    feedEnabled: { type: Boolean, default: true },            // Company social Feed
    eventsEnabled: { type: Boolean, default: true },          // Events calendar
    salesModuleEnabled: { type: Boolean, default: true }      // Sales Leads/Visits/Tasks module
  },
  { _id: false }
);

// strict:false lets HR (via Settings/Company Management pages) save
// arbitrary extra fields (policies, profit config, etc.) directly on the
// company document, exactly like the old `companyRef.update(settingsData)`
// call used to.
const companySchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    location: String,
    subdomain: { type: String, default: '' },
    portalUrl: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    employees: { type: Number, default: 0 },
    hrCount: { type: Number, default: 0 },
    status: { type: String, default: 'Active' },
    createdDate: { type: String, default: () => new Date().toLocaleDateString() },
    admin: { type: adminSchema, default: () => ({}) },
    hrAccounts: { type: [hrAccountSchema], default: [] },
    // Per-company feature toggles - see featureSettingsSchema comment above.
    featureSettings: { type: featureSettingsSchema, default: () => ({}) }
  },
  { strict: false, timestamps: true }
);

companySchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Company', companySchema);