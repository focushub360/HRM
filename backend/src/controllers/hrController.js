import Company from '../models/Company.js';
import { generatePassword } from '../utils/helpers.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/companies/:companyId/hr
export const addHRToCompany = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });

  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const empId = `HR-${company.code}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
  const password = generatePassword();

  const newHR = {
    id: (company.hrAccounts?.length || 0) + 1,
    name,
    email,
    empId,
    password,
    createdDate: new Date().toLocaleDateString(),
    status: 'Active'
  };

  company.hrAccounts.push(newHR);
  company.hrCount = company.hrAccounts.length;
  await company.save();

  res.status(201).json({ hrAccount: newHR, companyId: company.id });
});

// DELETE /api/companies/:companyId/hr/:hrId
export const removeHRFromCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'HR account not found' });

  company.hrAccounts = company.hrAccounts.filter((h) => h.id !== parseInt(req.params.hrId));
  company.hrCount = company.hrAccounts.length;
  await company.save();

  res.json({ message: 'HR account deleted successfully' });
});

// PUT /api/companies/:companyId/hr/:hrId/status
export const updateHRStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status field' });

  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'HR account not found' });

  let updatedHR = null;
  company.hrAccounts = company.hrAccounts.map((h) => {
    if (h.id === parseInt(req.params.hrId)) {
      updatedHR = { ...h.toObject?.() ?? h, status };
      return updatedHR;
    }
    return h;
  });

  if (!updatedHR) return res.status(404).json({ error: 'HR account not found' });

  await company.save();
  res.json(updatedHR);
});

// PUT /api/companies/:companyId/hr/:hrId
export const updateHRInCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'HR not found or update failed' });

  const hrIdInt = parseInt(req.params.hrId);
  let updatedHR = null;

  company.hrAccounts = company.hrAccounts.map((h) => {
    if (h.id === hrIdInt) {
      updatedHR = { ...(h.toObject?.() ?? h), ...req.body };
      return updatedHR;
    }
    return h;
  });

  if (!updatedHR) return res.status(404).json({ error: 'HR not found or update failed' });

  await company.save();
  res.json({ ...updatedHR, companyId: company.id, type: 'hr', role: 'hr' });
});