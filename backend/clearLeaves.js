import { db } from './firebaseService.js';

async function clear() {
  console.log('Fetching leaveRequests...');
  const snapshot = await db.collection('leaveRequests').get();
  console.log(`Found ${snapshot.size} leave requests.`);
  if (snapshot.size === 0) {
    console.log('No leave requests to delete.');
    process.exit(0);
  }
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log('Successfully cleared all leaveRequests');
  process.exit(0);
}

clear().catch(err => {
  console.error('Error clearing leaveRequests:', err);
  process.exit(1);
});
