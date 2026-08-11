import Lead from '../models/Lead.js';
import ActivityLog from '../models/ActivityLog.js';
import asyncHandler from '../utils/asyncHandler.js';

const companyIdFilter = (companyId) => {
  const num = Number(companyId);
  return isNaN(num) ? { companyId } : { $or: [{ companyId: num }, { companyId: String(companyId) }] };
};

// GET /api/leads?companyId=  or  GET /api/leads/:companyId
export const getLeads = asyncHandler(async (req, res) => {
  const companyId = req.params.companyId || req.query.companyId;
  if (!companyId) return res.status(400).json({ error: 'Company ID is required' });
  const leads = await Lead.find(companyIdFilter(companyId));
  res.json(leads);
});

// POST /api/leads
export const addLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    ...req.body,
    status: 'New',
    createdAt: new Date().toISOString()
  });

  await ActivityLog.create({
    userId: req.body.salesPersonId || req.body.userId,
    companyId: req.body.companyId,
    action: 'LEAD_CREATED',
    details: `New Lead: ${req.body.businessName || req.body.contactName || 'Client'}`,
    latitude: req.body.latitude || null,
    longitude: req.body.longitude || null,
    userName: req.body.userName || 'Sales Agent',
    employeeType: 'sales',
    timestamp: new Date().toISOString()
  });

  const io = req.app.get('io');
  if (req.body.companyId) io.to(`company_${req.body.companyId}`).emit('lead-added', lead);

  res.status(201).json(lead);
});

// PUT /api/leads/:id
export const updateLead = asyncHandler(async (req, res) => {
  const updated = await Lead.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });

  const io = req.app.get('io');
  if (req.body.companyId) {
    io.to(`company_${req.body.companyId}`).emit('lead-updated', { id: req.params.id, ...req.body });
  } else {
    io.emit('lead-updated', { id: req.params.id, ...req.body });
  }

  res.json(updated);
});