import ProctoringLog from '../models/ProctoringLog.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/proctoring/log
export const logProctoringData = asyncHandler(async (req, res) => {
  const log = await ProctoringLog.create({
    ...req.body,
    serverTimestamp: new Date().toISOString()
  });
  res.status(201).json(log);
});

// GET /api/companies/:companyId/proctoring
export const getProctoringDataByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const logs = await ProctoringLog.find({
    $or: [{ companyId: String(companyId) }, { companyId: Number(companyId) }]
  })
    .sort({ timestamp: -1 })
    .limit(100);
  res.json(logs);
});