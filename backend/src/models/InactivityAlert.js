import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const inactivityAlertSchema = new mongoose.Schema(
  {
    userId: String,
    companyId: mongoose.Schema.Types.Mixed,
    action: String,
    details: String,
    duration: mongoose.Schema.Types.Mixed,
    userName: String,
    employeeType: String,
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

inactivityAlertSchema.set('toJSON', idTransform);

export default mongoose.model('InactivityAlert', inactivityAlertSchema);