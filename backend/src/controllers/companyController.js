import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import { getNextSequence } from '../models/Counter.js';
import asyncHandler from '../utils/asyncHandler.js';

// SECURITY FIX: getCompanies (and getCompanyById) used to return
// company.admin, every hrAccounts entry, and every employeeAccounts entry
// completely raw — plaintext `password` field included — to EVERY logged-in
// user, for EVERY employee in the company, on every page load (this is
// exactly what powers the DM contact list in Chat.jsx). That's not "your
// own password exposed to you", it's the entire company's password list
// handed to anyone with any account. This strips `password` from the
// admin object and every hrAccounts/employeeAccounts entry before the
// response goes out, in one place, so no endpoint can accidentally leak it.
const stripPassword = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const { password, ...rest } = obj;
  return rest;
};

const sanitizeCompany = (company) => {
  const c = { ...company };
  if (c.admin) c.admin = stripPassword(c.admin);
  if (Array.isArray(c.hrAccounts)) c.hrAccounts = c.hrAccounts.map(stripPassword);
  if (Array.isArray(c.employeeAccounts)) c.employeeAccounts = c.employeeAccounts.map(stripPassword);
  return c;
};

// GET /api/companies
export const getCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find().sort({ id: 1 }).lean();
  const employees = await Employee.find().lean();

  const companiesWithEmployees = companies.map(company => {
    // Attach employees to the company object to match the frontend expectations
    company.employeeAccounts = employees.filter(emp => String(emp.companyId) === String(company.id));
    // Remove _id for clean json response matching the old schema
    delete company._id;
    delete company.__v;
    company.employeeAccounts.forEach(emp => {
      delete emp._id;
      delete emp.__v;
    });
    return sanitizeCompany(company);
  });

  res.json(companiesWithEmployees);
});

// GET /api/companies/:id
export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.id) }).lean();
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(sanitizeCompany(company));
});

// POST /api/companies
export const createCompany = asyncHandler(async (req, res) => {
  const { name, code, location } = req.body;
  if (!name || !code || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newId = await getNextSequence('companyId');

  const company = await Company.create({
    id: newId,
    name,
    code,
    location,
    subdomain: req.body.subdomain || '',
    portalUrl: req.body.portalUrl || '',
    contactEmail: req.body.contactEmail || '',
    employees: 0,
    hrCount: 0,
    status: 'Active',
    createdDate: new Date().toLocaleDateString(),
    hrAccounts: [],
    admin: {
      name: 'Admin User',
      email: 'admin@focus.com',
      password: 'Focus@123'
    }
  });

  res.status(201).json(sanitizeCompany(company.toObject()));
});

// PUT /api/companies/:id
export const updateCompany = asyncHandler(async (req, res) => {
  const { name, code, location } = req.body;
  const updated = await Company.findOneAndUpdate(
    { id: Number(req.params.id) },
    { $set: { name, code, location } },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: 'Company not found' });
  res.json(sanitizeCompany(updated));
});

// DELETE /api/companies/:id
export const deleteCompany = asyncHandler(async (req, res) => {
  await Company.deleteOne({ id: Number(req.params.id) });
  await Employee.deleteMany({ companyId: Number(req.params.id) });
  res.json({ message: 'Company deleted successfully' });
});

// GET /api/companies/:companyId/credentials
// NOTE: this endpoint's whole job is to return credentials (e.g. for an
// admin "view/reset password" screen), so it intentionally does NOT strip
// password here. Make sure this route is actually protected by an
// admin-only auth check upstream — it wasn't shown in what you sent me, so
// please confirm it is, since as written it returns every employee's
// plaintext password to whoever can hit this URL.
export const getCompanyCredentials = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const employeeAccounts = await Employee.find({ companyId: company.id });

  res.json({
    admin: company.admin,
    hrAccounts: company.hrAccounts || [],
    employeeAccounts
  });
});

// PUT /api/companies/:id/settings
export const updateCompanySettings = asyncHandler(async (req, res) => {
  const updated = await Company.findOneAndUpdate(
    { id: Number(req.params.id) },
    { $set: req.body },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: 'Company not found' });
  res.json(sanitizeCompany(updated));
});

// PUT /api/companies/:companyId/admin
export const updateCompanyAdmin = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Company Admin not found or update failed' });

  company.admin = { ...(company.admin?.toObject?.() || company.admin), ...req.body };
  await company.save();

  res.json({ ...stripPassword(company.admin.toObject?.() ?? company.admin), companyId: company.id, type: 'company', role: 'admin' });
});