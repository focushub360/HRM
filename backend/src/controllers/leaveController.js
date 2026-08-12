import LeaveRequest from '../models/LeaveRequest.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/leaverequests
export const addLeaveRequest = asyncHandler(async (req, res) => {
  const request = await LeaveRequest.create({
    ...req.body,
    status: 'Pending',
    requestDate: new Date().toISOString()
  });
  res.status(201).json(request);
});

// GET /api/leaverequests/company/:companyId
export const getLeaveRequestsByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const numId = Number(companyId);
  const requests = await LeaveRequest.find(
    isNaN(numId) ? { companyId } : { $or: [{ companyId: numId }, { companyId: String(companyId) }] }
  );
  res.json(requests);
});

// GET /api/leaverequests/user/:userId
export const getLeaveRequestsByUser = asyncHandler(async (req, res) => {
  const requests = await LeaveRequest.find({ userId: req.params.userId });
  res.json(requests);
});

// PUT /api/leaverequests/:id
export const updateLeaveRequestStatus = asyncHandler(async (req, res) => {
  const { status, approverId, approverName } = req.body;
  const updated = await LeaveRequest.findByIdAndUpdate(
    req.params.id,
    { status, approverId, approverName, approvalDate: new Date().toISOString() },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Request not found or failed update' });
  res.json(updated);
});