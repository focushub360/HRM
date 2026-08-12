import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const dailyWorkReportSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    companyId: { type: mongoose.Schema.Types.Mixed, required: true },
    date: { type: String, required: true }, // e.g. "2026-08-12"
    formattedDate: { type: String }, // e.g. "Wed, Aug 12, 2026"
    tasks: [
      {
        title: { type: String, required: true },
        update: { type: String, required: true },
        status: { type: String, default: 'Completed' },
        hours: { type: Number, default: 0 }
      }
    ],
    generalNotes: { type: String, default: '' },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    totalSessionDuration: { type: String },
    locationAddress: { type: String },
    submittedAt: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false, timestamps: true }
);

dailyWorkReportSchema.set('toJSON', idTransform);

export default mongoose.model('DailyWorkReport', dailyWorkReportSchema);
