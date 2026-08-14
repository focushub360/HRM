import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true }, // Can be empId or companyId
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' }, // 'task', 'project', 'alert', 'info'
  read: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
});

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
