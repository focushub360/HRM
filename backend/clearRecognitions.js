import { db } from './firebaseService.js';

async function clear() {
  console.log('Fetching recognitions...');
  const snapshot = await db.collection('recognitions').get();
  console.log(`Found ${snapshot.size} recognitions.`);
  
  if (snapshot.size === 0) {
    console.log('No recognitions to delete.');
    process.exit(0);
  }
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log('Successfully cleared all recognitions.');
  process.exit(0);
}

clear().catch(err => {
  console.error('Error clearing recognitions:', err);
  process.exit(1);
});
