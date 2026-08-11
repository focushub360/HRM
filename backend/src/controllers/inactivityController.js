import InactivityAlert from '../models/InactivityAlert.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/inactivity-alerts
export const logInactivityAlert = asyncHandler(async (req, res) => {
  const alert = await InactivityAlert.create({
    ...req.body,
    timestamp: new Date().toISOString()
  });
  res.status(201).json(alert);
});

// GET /api/companies/:companyId/inactivity-alerts
export const getInactivityAlerts = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const alerts = await InactivityAlert.find({
    $or: [{ companyId: String(companyId) }, { companyId: Number(companyId) }]
  }).sort({ timestamp: -1 });
  res.json(alerts);
});