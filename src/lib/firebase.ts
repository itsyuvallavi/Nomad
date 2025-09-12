/**
 * Firebase Configuration and Initialization
 * Sets up Firebase Auth and Firestore for the Nomad Navigator app
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB9fTTuNleIGli6JRXwvGJhCoGFtRu4FeU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "nomad-navigator-xej23.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nomad-navigator-xej23",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "nomad-navigator-xej23.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "843370239890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:843370239890:web:b2e901fda85f270fa3934b",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
function validateFirebaseConfig() {
  const required = {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId
  };
  
  const missing = Object.entries(required).filter(([key, value]) => !value).map(([key]) => key);
  
  if (missing.length > 0) {
    console.error('Missing Firebase configuration:', missing);
    throw new Error(`Missing required Firebase configuration: ${missing.join(', ')}`);
  }

  console.log('✅ Firebase configuration validated');
}

// Initialize Firebase
let app;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;

try {
  validateFirebaseConfig();
  
  // Initialize Firebase app (only once)
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('🔥 Firebase initialized successfully');
  } else {
    app = getApp();
  }
  
  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Initialize Analytics (client-side only)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    try {
      analytics = getAnalytics(app);
      console.log('📊 Firebase Analytics initialized');
    } catch (error) {
      console.warn('⚠️ Firebase Analytics failed to initialize:', error);
      analytics = null;
    }
  }
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Export Firebase services
export { auth, db, analytics };

// Export the app for any additional Firebase services
export default app;