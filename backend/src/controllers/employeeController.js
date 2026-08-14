import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import { getNextSequence } from '../models/Counter.js';
import { generatePassword } from '../utils/helpers.js';
import asyncHandler from '../utils/asyncHandler.js';

// POST /api/companies/:companyId/employees
export const addEmployeeToCompany = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });

  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  // Ensure unique email ID
  const existingEmployee = await Employee.findOne({ email });
  if (existingEmployee) {
    return res.status(400).json({ error: 'This email ID is already registered to an employee.' });
  }

  const empId = `EMP-${company.code}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const password = generatePassword();
  const newId = await getNextSequence('employeeId');

  const employee = await Employee.create({
    ...req.body,
    id: newId,
    companyId: company.id,
    name: req.body.name || 'Unknown',
    email: req.body.email || 'No Email',
    empId,
    password, // Store generated or frontend-provided password
    employeeType: req.body.employeeType || 'office',
    department: req.body.department || 'Unassigned',
    position: req.body.position || 'TBD',
    joiningDate: req.body.joiningDate || null,
    salary: req.body.salary || null,
    reportingManager: req.body.reportingManager || null,
    aadharDoc: req.body.aadharDoc || null,
    certificates: req.body.certificates || [],
    headHrId: req.body.headHrId || null,
    headHrName: req.body.headHrName || null,
    headHrEmail: req.body.headHrEmail || null,
    phone: req.body.phone || null,
    address: {
      street: req.body.street || null,
      city: req.body.city || null,
      state: req.body.state || null,
      country: req.body.country || null,
      postalCode: req.body.postalCode || null
    },
    createdDate: new Date().toLocaleDateString(),
    status: 'Active'
  });

  company.employees = (company.employees || 0) + 1;
  await company.save();

  console.log(`[DB] Added employee ${empId} to Company ${company.id}`);
  res.status(201).json({ employeeAccount: employee, companyId: company.id });
});

// GET /api/companies/:companyId/employees  (optional ?hrId= filter)
export const getEmployeesByCompany = asyncHandler(async (req, res) => {
  const { hrId } = req.query;
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const filter = { companyId: company.id };
  if (hrId) filter.headHrId = Number(hrId);

  const employees = await Employee.find(filter);
  res.json(employees);
});

// DELETE /api/companies/:companyId/employees/:employeeId
export const removeEmployeeFromCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Employee not found' });

  const result = await Employee.deleteOne({
    id: parseInt(req.params.employeeId),
    companyId: company.id
  });

  if (result.deletedCount === 0) return res.status(404).json({ error: 'Employee not found' });

  company.employees = Math.max(0, (company.employees || 1) - 1);
  await company.save();

  res.json({ message: 'Employee deleted successfully' });
});

// PUT /api/companies/:companyId/employees/:employeeId
export const updateEmployeeInCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ id: Number(req.params.companyId) });
  if (!company) return res.status(404).json({ error: 'Employee not found or update failed' });

  // Ensure unique email ID if it's being updated
  if (req.body.email) {
    const existingEmployee = await Employee.findOne({ email: req.body.email, id: { $ne: parseInt(req.params.employeeId) } });
    if (existingEmployee) {
      return res.status(400).json({ error: 'This email ID is already registered to another employee.' });
    }
  }

  const updated = await Employee.findOneAndUpdate(
    { id: parseInt(req.params.employeeId), companyId: company.id },
    { $set: req.body },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: 'Employee not found or update failed' });

  res.json({ ...updated.toJSON(), companyId: company.id, type: 'employee', role: 'employee' });
});