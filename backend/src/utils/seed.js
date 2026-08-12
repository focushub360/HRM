// Seeds MongoDB with the same demo company/HR/employees the old
// seed_firestore.js used, so you can log in immediately after switching.
// Usage: npm run seed
import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import Counter from '../models/Counter.js';

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding MongoDB...');

  // Reset counters relevant to this seed data
  await Counter.findByIdAndUpdate('companyId', { seq: 1 }, { upsert: true });
  await Counter.findByIdAndUpdate('employeeId', { seq: 3 }, { upsert: true });

  await Company.deleteOne({ id: 1 });
  await Employee.deleteMany({ companyId: 1 });

  await Company.create({
    id: 1,
    name: 'Tech Solutions India',
    code: 'TSI-001',
    location: 'Bangalore, India',
    employees: 3,
    hrCount: 1,
    status: 'Active',
    createdDate: '2023-01-15',
    admin: {
      name: 'Admin User',
      email: 'admin@focus.com',
      password: 'Focus@123'
    },
    hrAccounts: [
      {
        id: 1,
        name: 'Raj Kumar',
        email: 'raj.kumar@techsolutions.com',
        empId: 'HR-TSI-001',
        password: 'Secure@123',
        createdDate: '2023-01-20',
        status: 'Active'
      }
    ]
  });

  await Employee.insertMany([
    {
      id: 1,
      companyId: 1,
      name: 'Alice Johnson',
      email: 'alice@techsolutions.com',
      empId: 'EMP-TSI-001',
      password: 'password',
      employeeType: 'office',
      department: 'Sales',
      position: 'Sales Manager',
      status: 'Active',
      createdDate: '2023-01-20'
    },
    {
      id: 2,
      companyId: 1,
      name: 'Bob Smith',
      email: 'bob@techsolutions.com',
      empId: 'EMP-TSI-002',
      password: 'password',
      employeeType: 'office',
      department: 'Engineering',
      position: 'Software Engineer',
      status: 'Active',
      createdDate: '2023-01-21'
    },
    {
      id: 3,
      companyId: 1,
      name: 'Charlie Brown',
      email: 'charlie@techsolutions.com',
      empId: 'EMP-TSI-003',
      password: 'password',
      employeeType: 'office',
      department: 'Marketing',
      position: 'Marketing Lead',
      status: 'Active',
      createdDate: '2023-01-22'
    }
  ]);

  console.log('✅ Seed complete. Login with admin@focus.com / Focus@123 (Company/Admin)');
  console.log('   HR:       raj.kumar@techsolutions.com / Secure@123');
  console.log('   Employee: alice@techsolutions.com / password');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});