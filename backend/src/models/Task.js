import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const taskSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    projectId: String,
    projectTitle: String,
    title: String,
    description: String,
    assignedTo: String,
    assignedToName: String,
    assignedBy: String,
    status: { type: String, default: 'Pending' },
    completionNotes: String,
    dueDate: String,
    type: { type: String, default: 'SALES_TASK' }, // or PROJECT_TASK
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

taskSchema.set('toJSON', idTransform);

export default mongoose.model('Task', taskSchema);