import Event from '../models/Event.js';
import asyncHandler from '../utils/asyncHandler.js';

// GET /api/events?companyId=
export const getEventsByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: 'Company ID is required' });

  const numId = Number(companyId);
  const events = await Event.find(
    isNaN(numId) ? { companyId } : { $or: [{ companyId: numId }, { companyId: String(companyId) }] }
  ).sort({ date: 1 });
  res.json(events);
});

// POST /api/events
export const addEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({ ...req.body, createdAt: new Date().toISOString() });
  res.status(201).json(event);
});