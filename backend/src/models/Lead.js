import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const leadSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    businessName: String,
    contactName: String,
    salesPersonId: String,
    userId: String,
    userName: String,
    latitude: mongoose.Schema.Types.Mixed,
    longitude: mongoose.Schema.Types.Mixed,
    status: { type: String, default: 'New' },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

leadSchema.set('toJSON', idTransform);

export default mongoose.model('Lead', leadSchema);