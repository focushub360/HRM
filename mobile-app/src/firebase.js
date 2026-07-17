import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyDBRe7aaOZHsOv9K3bDv2QjhLgUdlPxsOA",
    authDomain: "pic-gen-6bc8d.firebaseapp.com",
    projectId: "pic-gen-6bc8d",
    storageBucket: "pic-gen-6bc8d.firebasestorage.app",
    messagingSenderId: "788766460578",
    appId: "1:788766460578:web:498f1cd47baf7fe3b325fb",
    measurementId: "G-HH65D8KXEB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence for React Native
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);

export default app;
