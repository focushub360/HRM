import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const leaveRequestSchema = new mongoose.Schema(
  {
    userId: String,
    empId: String,
    companyId: mongoose.Schema.Types.Mixed,
    userName: String,
    status: { type: String, default: 'Pending' },
    requestDate: { type: String, default: () => new Date().toISOString() },
    approverId: String,
    approverName: String,
    approvalDate: String
  },
  { strict: false }
);

leaveRequestSchema.set('toJSON', idTransform);

export default mongoose.model('LeaveRequest', leaveRequestSchema);