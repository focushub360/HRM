import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const recognitionSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    recognizerId: String,
    recognizerName: String,
    date: { type: String, default: () => new Date().toISOString() },
    timestamp: { type: Number, default: () => Date.now() }
  },
  { strict: false }
);

recognitionSchema.set('toJSON', idTransform);

export default mongoose.model('Recognition', recognitionSchema);