import ActivityLog from '../models/ActivityLog.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/activities
export const logActivity = asyncHandler(async (req, res) => {
  const activity = await ActivityLog.create({
    ...req.body,
    timestamp: new Date().toISOString()
  });
  res.status(201).json(activity);
});

// DELETE /api/activities/:id
export const deleteActivity = asyncHandler(async (req, res) => {
  const result = await ActivityLog.deleteOne({ _id: req.params.id });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Activity not found' });
  res.json({ message: 'Activity deleted successfully' });
});

// GET /api/activities/:empId
export const getActivityLogsByUser = asyncHandler(async (req, res) => {
  const activities = await ActivityLog.find({ userId: req.params.empId });
  res.json(activities);
});

// GET /api/companies/:companyId/activities
export const getActivityLogsByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const activities = await ActivityLog.find({
    $or: [{ companyId: String(companyId) }, { companyId: Number(companyId) }]
  });
  res.json(activities);
});