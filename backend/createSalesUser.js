import { db } from './firebaseService.js';

async function createSalesUser() {
    try {
        console.log('Fetching companies...');
        const snapshot = await db.collection('companies').get();
        if (snapshot.empty) {
            console.log('No companies found. Create a company first.');
            process.exit(1);
        }

        const companyDoc = snapshot.docs[0];
        const companyId = companyDoc.id;
        const companyData = companyDoc.data();
        
        console.log(`Using company: ${companyData.name} (ID: ${companyId})`);

        const employeeAccounts = companyData.employeeAccounts || [];
        
        // Check if sales user already exists
        const existing = employeeAccounts.find(e => e.email === 'sales@test.com');
        if (existing) {
            console.log('Sales user already exists!');
            console.log(`Email: sales@test.com`);
            console.log(`Password: ${existing.password}`);
            process.exit(0);
        }

        const newEmpId = `EMP-${companyData.code || 'TEST'}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const newEmp = {
            id: employeeAccounts.length + 1,
            name: "Mobile Sales Tester",
            email: "sales@test.com",
            empId: newEmpId,
            password: "salestest", // Fixed password for easy testing
            employeeType: "field",
            department: "Sales",
            position: "Field Agent",
            joiningDate: new Date().toISOString(),
            salary: 50000,
            status: "Active",
            role: "employee",
            type: "employee"
        };

        employeeAccounts.push(newEmp);

        await db.collection('companies').doc(companyId).update({
            employeeAccounts: employeeAccounts
        });

        console.log('\n✅ Successfully created dummy sales user for Mobile App testing!');
        console.log('----------------------------------------------------');
        console.log('Email:    sales@test.com');
        console.log('Password: salestest');
        console.log('----------------------------------------------------');
        
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

createSalesUser();
