import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import { capitalize } from '../utils/helpers.js';
import { generateToken } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';

// Tries to find a matching Company Admin login
const findAdminMatch = async (email, password) => {
  const company = await Company.findOne({ 'admin.email': email });
  if (!company) return null;
  if (company.admin?.password !== password) return { wrongPassword: true };

  return {
    ...(company.admin.toObject?.() ?? company.admin),
    type: 'company',
    companyId: company.id,
    companyName: company.name,
    role: 'admin'
  };
};

// Tries to find a matching HR login (embedded in a company doc)
const findHRMatch = async (email, password) => {
  const companies = await Company.find({ 'hrAccounts.email': email });
  for (const company of companies) {
    const match = (company.hrAccounts || []).find((h) => h.email === email);
    if (!match) continue;
    if (match.password !== password) return { wrongPassword: true };
    if (match.status === 'Inactive') return { error: 'INACTIVE_ACCOUNT' };

    return {
      ...(match.toObject?.() ?? match),
      type: 'hr',
      companyId: company.id,
      role: 'hr'
    };
  }
  return null;
};

// Tries to find a matching Employee login
const findEmployeeMatch = async (email, password) => {
  const employee = await Employee.findOne({ email });
  if (!employee) return null;
  if (employee.password !== password) return { wrongPassword: true };
  if (employee.status === 'Inactive') return { error: 'INACTIVE_ACCOUNT' };

  return {
    ...employee.toJSON(),
    type: 'employee',
    companyId: employee.companyId,
    role: 'employee'
  };
};

// POST /api/auth/login
// Supports BOTH modes:
//  1. Legacy role-scoped login -> body: { type: 'company'|'hr'|'employee', email, password }
//  2. NEW universal login      -> body: { email, password }  (type omitted)
//     The account's role is auto-detected from email + password across
//     Admin / HR / Employee, so a single login form works for everyone.
export const login = asyncHandler(async (req, res) => {
  const { type, email: rawEmail, password: rawPassword } = req.body;
  const email = rawEmail ? rawEmail.trim() : '';
  const password = rawPassword ? rawPassword.trim() : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ---------- Universal login (no type provided) ----------
  if (!type) {
    const checks = [findAdminMatch, findHRMatch, findEmployeeMatch];
    let sawWrongPassword = false;

    for (const check of checks) {
      const result = await check(email, password);
      if (!result) continue;
      if (result.wrongPassword) {
        sawWrongPassword = true;
        continue;
      }
      if (result.error === 'INACTIVE_ACCOUNT') {
        return res.status(403).json({ error: 'Your account is currently inactive. Please contact your administrator.' });
      }

      const token = generateToken({
        role: result.role,
        companyId: result.companyId,
        email: result.email
      });

      return res.json({ ...result, token });
    }

    if (sawWrongPassword) return res.status(401).json({ error: 'Invalid credentials' });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ---------- Legacy role-scoped login ----------
  let result = null;

  if (type === 'company' || type === 'company_admin') {
    result = await findAdminMatch(email, password);
  } else if (type === 'hr') {
    result = await findHRMatch(email, password);
  } else if (type === 'employee') {
    result = await findEmployeeMatch(email, password);
  }

  if (!result || result.wrongPassword) {
    // Check if the email belongs to a different role, to give a helpful message
    const otherRoleChecks = [
      { role: 'company', fn: findAdminMatch },
      { role: 'hr', fn: findHRMatch },
      { role: 'employee', fn: findEmployeeMatch }
    ].filter((c) => c.role !== type);

    for (const { role, fn } of otherRoleChecks) {
      const other = await fn(email, password);
      if (other && !other.wrongPassword && !other.error) {
        const roleDisplay = capitalize(role);
        return res.status(400).json({ error: `Account found as ${roleDisplay}. Please use the ${roleDisplay} Login option.` });
      }
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (result.error === 'INACTIVE_ACCOUNT') {
    return res.status(403).json({ error: 'Your account is currently inactive. Please contact your administrator.' });
  }

  const token = generateToken({ role: result.role, companyId: result.companyId, email: result.email });
  res.json({ ...result, token });
});

// POST /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { userId, type, companyId, oldPassword, newPassword } = req.body;
  if (!userId || !type || !companyId || !oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cleanOld = oldPassword.trim();
  const cleanNew = newPassword.trim();

  const company = await Company.findOne({ id: Number(companyId) });
  if (!company) return res.status(400).json({ error: 'Company not found' });

  if (type === 'company' || type === 'admin') {
    if (company.admin?.password !== cleanOld) {
      return res.status(400).json({ error: 'Invalid old password or user not found' });
    }
    company.admin.password = cleanNew;
    await company.save();
    return res.json({ message: 'Password changed successfully' });
  }

  if (type === 'hr') {
    const hr = company.hrAccounts.find((h) => String(h.id) === String(userId) || h.empId === userId);
    if (!hr || hr.password !== cleanOld) {
      return res.status(400).json({ error: 'Invalid old password or user not found' });
    }
    hr.password = cleanNew;
    await company.save();
    return res.json({ message: 'Password changed successfully' });
  }

  if (type === 'employee') {
    const employee = await Employee.findOne({
      companyId: company.id,
      $or: [{ id: Number(userId) || -1 }, { empId: userId }]
    });
    if (!employee || employee.password !== cleanOld) {
      return res.status(400).json({ error: 'Invalid old password or user not found' });
    }
    employee.password = cleanNew;
    await employee.save();
    return res.json({ message: 'Password changed successfully' });
  }

  return res.status(400).json({ error: 'Invalid account type' });
});