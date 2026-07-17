import { db } from './firebaseService.js';

const resetDatabase = async () => {
    console.log('🧹 Starting Full Database Cleanup...');

    try {
        // 1. Delete all Companies
        const companiesSnapshot = await db.collection('companies').get();
        const deleteCompanyPromises = companiesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteCompanyPromises);
        console.log(`✅ Deleted ${deleteCompanyPromises.length} companies.`);

        // 2. Delete all Activity Logs
        const activitiesSnapshot = await db.collection('activityLogs').get();
        const deleteActivityPromises = activitiesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteActivityPromises);
        console.log(`✅ Deleted ${deleteActivityPromises.length} activity logs.`);

        // 3. Delete all Inactivity Alerts
        const alertsSnapshot = await db.collection('inactivityAlerts').get();
        const deleteAlertPromises = alertsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteAlertPromises);
        console.log(`✅ Deleted ${deleteAlertPromises.length} inactivity alerts.`);

        console.log('✨ Data Wiped Successfully.');

        // 4. Create Clean Admin User
        console.log('🌱 Seeding Clean Admin Account...');
        const cleanCompany = {
            id: 1,
            name: "My Company",
            code: "COMP-001",
            location: "Headquarters",
            employees: 0,
            hrCount: 0,
            status: "Active",
            createdDate: new Date().toLocaleDateString(),
            admin: {
                name: "Super Admin",
                email: "admin@focus.com",
                password: "Focus@123"
            },
            hrAccounts: [],
            employeeAccounts: []
        };

        // Use '1' as ID to ensure the default login always works
        await db.collection('companies').doc('1').set(cleanCompany);
        console.log('✅ Clean Admin Account Created: admin@focus.com / Focus@123');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
    }
    process.exit(0);
};

resetDatabase();
