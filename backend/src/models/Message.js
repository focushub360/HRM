import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const messageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.Mixed, required: true },
    channel: { type: String, default: 'company' }, // 'company', 'hr', 'broadcast', 'team', 'dm'
    targetGroup: { type: String, default: 'General' }, // Department or Group
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, default: 'employee' },
    senderAvatar: { type: String, default: '' },
    receiverId: { type: String, default: '' }, // For DMs
    receiverName: { type: String, default: '' },
    content: { type: String, required: true },
    attachments: { type: Array, default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false, timestamps: true }
);

messageSchema.set('toJSON', idTransform);

export default mongoose.model('Message', messageSchema);