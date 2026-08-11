import Recognition from '../models/Recognition.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/recognitions
export const addRecognition = asyncHandler(async (req, res) => {
  const rec = await Recognition.create({
    ...req.body,
    date: new Date().toISOString(),
    timestamp: Date.now()
  });
  res.status(201).json(rec);
});

// GET /api/recognitions/:companyId
export const getRecognitionsByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const numId = Number(companyId);
  const list = await Recognition.find(
    isNaN(numId) ? { companyId } : { $or: [{ companyId: numId }, { companyId: String(companyId) }] }
  ).sort({ timestamp: -1 });
  res.json(list);
});