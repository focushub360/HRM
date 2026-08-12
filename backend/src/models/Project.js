import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const projectSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    title: String,
    description: String,
    deadline: String,
    createdBy: String,
    status: { type: String, default: 'Active' },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

projectSchema.set('toJSON', idTransform);

export default mongoose.model('Project', projectSchema);