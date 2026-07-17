import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import service account key
// Note: In production, consider using environment variables to store path or content
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error("CRITICAL ERROR: serviceAccountKey.json not found in backend directory.");
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app` // Guessing based on project id, can be adjusted
    });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const bucket = admin.storage().bucket();

console.log('✅ Firebase Admin Initialized');
