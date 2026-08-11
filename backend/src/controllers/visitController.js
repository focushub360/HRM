import Visit from '../models/Visit.js';
import ActivityLog from '../models/ActivityLog.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/visits
export const logVisit = asyncHandler(async (req, res) => {
  const companyId = isNaN(req.body.companyId) ? req.body.companyId : parseInt(req.body.companyId);

  const visit = await Visit.create({
    ...req.body,
    companyId,
    timestamp: new Date().toISOString()
  });

  await ActivityLog.create({
    userId: req.body.userId,
    companyId,
    action: 'CLIENT_VISIT',
    details: `Visited ${req.body.clientName || 'Client'} - ${req.body.notes || 'Field Visit'}`,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    userName: req.body.userName || 'Sales Agent',
    employeeType: 'sales',
    timestamp: new Date().toISOString()
  });

  const io = req.app.get('io');
  if (req.body.companyId) io.to(`company_${req.body.companyId}`).emit('visit-logged', visit);

  res.status(201).json(visit);
});

// GET /api/visits?companyId=&employeeId=  or /api/visits/:companyId
export const getVisits = asyncHandler(async (req, res) => {
  const companyId = req.query.companyId || req.params.companyId;
  const employeeId = req.query.employeeId;

  if (!companyId || companyId === 'undefined' || companyId === 'null') {
    return res.status(400).json({ error: 'Valid Company ID is required' });
  }

  const numId = Number(companyId);
  const filter = isNaN(numId)
    ? { companyId }
    : { $or: [{ companyId: numId }, { companyId: String(companyId) }] };

  if (employeeId) filter.userId = employeeId;

  const visits = await Visit.find(filter).sort({ timestamp: -1 });
  res.json(visits);
});

// DELETE /api/visits/:id
export const deleteVisit = asyncHandler(async (req, res) => {
  const result = await Visit.deleteOne({ _id: req.params.id });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Visit not found' });
  res.json({ message: 'Visit deleted successfully', id: req.params.id });
});