import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const visitSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    userId: String,
    userName: String,
    clientName: String,
    notes: String,
    latitude: mongoose.Schema.Types.Mixed,
    longitude: mongoose.Schema.Types.Mixed,
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

visitSchema.set('toJSON', idTransform);

export default mongoose.model('Visit', visitSchema);