import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const activityLogSchema = new mongoose.Schema(
  {
    userId: String,
    companyId: mongoose.Schema.Types.Mixed,
    action: String,
    details: String,
    latitude: mongoose.Schema.Types.Mixed,
    longitude: mongoose.Schema.Types.Mixed,
    userName: String,
    employeeType: String,
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false, timestamps: false }
);

activityLogSchema.set('toJSON', idTransform);

export default mongoose.model('ActivityLog', activityLogSchema);