import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const proctoringLogSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    userId: String,
    timestamp: mongoose.Schema.Types.Mixed,
    serverTimestamp: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

proctoringLogSchema.set('toJSON', idTransform);

export default mongoose.model('ProctoringLog', proctoringLogSchema);