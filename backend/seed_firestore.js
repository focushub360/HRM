import { db } from './firebaseService.js';

const seedDatabase = async () => {
    console.log('🌱 Seeding Firestore (FORCE MODE)...');

    try {
        const companyRef = db.collection('companies').doc('1');
        console.log('Overwriting Company 1...');

        const defaultCompany = {
            id: 1,
            name: "Tech Solutions India",
            code: "TSI-001",
            location: "Bangalore, India",
            employees: 0,
            hrCount: 1,
            status: "Active",
            createdDate: "2023-01-15",
            admin: {
                name: "Admin User",
                email: "admin@focus.com",
                password: "Focus@123"
            },
            hrAccounts: [
                {
                    id: 1,
                    name: "Raj Kumar",
                    email: "raj.kumar@techsolutions.com",
                    empId: "HR-TSI-001",
                    password: "Secure@123",
                    createdDate: "2023-01-20",
                    status: "Active",
                }
            ],
            employeeAccounts: [
                {
                    id: 1,
                    name: "Alice Johnson",
                    email: "alice@techsolutions.com",
                    empId: "EMP-TSI-001",
                    password: "password",
                    employeeType: "office",
                    department: "Sales",
                    position: "Sales Manager",
                    status: "Active",
                    createdDate: "2023-01-20"
                },
                {
                    id: 2,
                    name: "Bob Smith",
                    email: "bob@techsolutions.com",
                    empId: "EMP-TSI-002",
                    password: "password",
                    employeeType: "office",
                    department: "Engineering",
                    position: "Software Engineer",
                    status: "Active",
                    createdDate: "2023-01-21"
                },
                {
                    id: 3,
                    name: "Charlie Brown",
                    email: "charlie@techsolutions.com",
                    empId: "EMP-TSI-003",
                    password: "password",
                    employeeType: "office",
                    department: "Marketing",
                    position: "Marketing Lead",
                    status: "Active",
                    createdDate: "2023-01-22"
                }
            ]
        };

        const res = await companyRef.set(defaultCompany);
        console.log('✅ Default Company Created/Overwritten.');
        console.log('Write Time:', res.writeTime.toDate());

    } catch (error) {
        console.error('Error seeding database:', error);
    }
    process.exit(0);
};

seedDatabase();
