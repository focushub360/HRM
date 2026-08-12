import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    country: { type: String, default: null },
    postalCode: { type: String, default: null }
  },
  { _id: false }
);

// Employees live in their own top-level collection (instead of a Firestore
// sub-collection) but keep a numeric `id` + `companyId` so all the existing
// frontend comparisons (e.id === parseInt(...)) keep working unchanged.
const employeeSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    companyId: { type: Number, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    empId: { type: String, index: true },
    password: { type: String, required: true },
    role: { type: String, default: 'employee' },
    employeeType: { type: String, default: 'office' },
    department: { type: String, default: 'Unassigned' },
    position: { type: String, default: 'TBD' },
    joiningDate: { type: String, default: null },
    shift: {
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    },
    salary: { type: Number, default: null },
    reportingManager: { type: String, default: null },
    aadharDoc: { type: String, default: null },
    certificates: { type: Array, default: [] },
    headHrId: { type: Number, default: null },
    headHrName: { type: String, default: null },
    headHrEmail: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: addressSchema, default: () => ({}) },
    createdDate: { type: String, default: () => new Date().toLocaleDateString() },
    status: { type: String, default: 'Active' }
  },
  { strict: false, timestamps: true }
);

employeeSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Employee', employeeSchema);