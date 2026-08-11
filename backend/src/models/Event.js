import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const eventSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    hostId: String,
    hostName: String,
    date: mongoose.Schema.Types.Mixed,
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

eventSchema.set('toJSON', idTransform);

export default mongoose.model('Event', eventSchema);