import Notification from '../models/Notification.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/notifications/:recipientId
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipientId: req.params.recipientId }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
});

// PUT /api/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const updated = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Notification not found' });
  res.json(updated);
});
