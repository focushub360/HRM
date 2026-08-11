import mongoose from 'mongoose';
import { idTransform } from './_shared.js';

// Kept for parity with the old backend's weekly cleanup job. The current
// frontend chat (Chat.jsx) talks to Firebase directly, but this collection
// is here and wired into the cleanup scheduler in case chat is later
// migrated to this REST API too.
const messageSchema = new mongoose.Schema(
  {
    companyId: mongoose.Schema.Types.Mixed,
    senderId: String,
    receiverId: String,
    content: String,
    timestamp: { type: String, default: () => new Date().toISOString() }
  },
  { strict: false }
);

messageSchema.set('toJSON', idTransform);

export default mongoose.model('Message', messageSchema);