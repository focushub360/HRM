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
    hrAccounts: { type: [hrAccountSchema], default: [] }
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