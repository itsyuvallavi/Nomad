/**
 * Firebase Configuration and Initialization
 * Sets up Firebase Auth and Firestore for the Nomad Navigator app
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
// NEVER hardcode API keys - always use environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
  console.log('🔥 Using Firebase project:', firebaseConfig.projectId);
  console.log('🌐 Auth domain:', firebaseConfig.authDomain);
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
// Re-export for backward compatibility
export { auth, db, analytics };
export { auth as default };

// Also export from this location for new imports
export const firebaseAuth = auth;
export const firestore = db;
export const firebaseAnalytics = analytics;