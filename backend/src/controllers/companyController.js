import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import { getNextSequence } from '../models/Counter.js';
import asyncHandler from '../utils/asyncHandler.js';

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
    return company;
  });

  res.json(companiesWithEmployees);
});

// GET /api/companies/:id
export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.id) });
  if (!company) return res.status(404).json({ error: 'Company not found' });
  res.json(company);
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

  res.status(201).json(company);
});

// PUT /api/companies/:id
export const updateCompany = asyncHandler(async (req, res) => {
  const { name, code, location } = req.body;
  const updated = await Company.findOneAndUpdate(
    { id: Number(req.params.id) },
    { $set: { name, code, location } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Company not found' });
  res.json(updated);
});

// DELETE /api/companies/:id
export const deleteCompany = asyncHandler(async (req, res) => {
  await Company.deleteOne({ id: Number(req.params.id) });
  await Employee.deleteMany({ companyId: Number(req.params.id) });
  res.json({ message: 'Company deleted successfully' });
});

// GET /api/companies/:companyId/credentials
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
  );
  if (!updated) return res.status(404).json({ error: 'Company not found' });
  res.json(updated);
});

// PUT /api/companies/:companyId/admin
export const updateCompanyAdmin = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Company Admin not found or update failed' });

  company.admin = { ...(company.admin?.toObject?.() || company.admin), ...req.body };
  await company.save();

  res.json({ ...company.admin.toObject?.() ?? company.admin, companyId: company.id, type: 'company', role: 'admin' });
});