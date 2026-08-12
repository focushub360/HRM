import { db } from './firebaseService.js';

async function fixSalesUser() {
    try {
        const snapshot = await db.collection('companies').get();
        if (snapshot.empty) return;

        const companyDoc = snapshot.docs[0];
        const companyData = companyDoc.data();
        let updated = false;

        const employeeAccounts = companyData.employeeAccounts.map(e => {
            if (e.email === 'sales@test.com') {
                e.employeeType = 'sales';
                updated = true;
                console.log("Updated sales@test.com to employeeType: 'sales'");
            }
            return e;
        });

        if (updated) {
            await db.collection('companies').doc(companyDoc.id).update({
                employeeAccounts
            });
            console.log("Database updated successfully.");
        } else {
            console.log("User not found.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixSalesUser();
