import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

const messageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.Mixed, required: true },
    channel: { type: String, default: 'company' }, // 'company', 'hr', 'broadcast', 'team', 'dm'
    // Used only when channel === 'team'
    teamId: { type: String, default: null },
    // Used for 'broadcast' department-wise targeting
    targetGroup: { type: String, default: 'General' },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, default: 'employee' },
    senderAvatar: { type: String, default: '' },
    receiverId: { type: String, default: '' }, // For DMs
    receiverName: { type: String, default: '' },
    content: { type: String, required: true },
    attachments: { type: Array, default: [] },
    // Client-generated id (uuid). Lets the server treat a resend/double-submit
    // of the exact same message as a no-op instead of creating a duplicate,
    // no matter what causes the resend (double-click, StrictMode re-fire,
    // client retry, flaky network, etc). Sparse so old rows without it are fine.
    clientMessageId: { type: String, default: null },
    // WhatsApp-style status tracking.
    // deliveredTo / readBy hold the userIds of RECIPIENTS (never the sender).
    deliveredTo: { type: [String], default: [] },
    readBy: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false, timestamps: true }
);

messageSchema.index({ companyId: 1, channel: 1, targetGroup: 1, createdAt: 1 });
messageSchema.index({ companyId: 1, channel: 1, teamId: 1, createdAt: 1 });
messageSchema.index({ channel: 1, senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index(
  { clientMessageId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } }
);

messageSchema.set('toJSON', idTransform);

export default mongoose.model('Message', messageSchema);