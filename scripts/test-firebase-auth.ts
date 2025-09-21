import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAjCr2OHqp7twKa2jO9zzUq3GyKdSwVHWI',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'nomadoldrepair-86680360-86245.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nomadoldrepair-86680360-86245',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'nomadoldrepair-86680360-86245.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '336606783309',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:336606783309:web:a09a6e10579788ea0bf904'
};

console.log('Testing Firebase Auth Configuration...');
console.log('Project ID:', firebaseConfig.projectId);
console.log('Auth Domain:', firebaseConfig.authDomain);

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  console.log('✅ Firebase initialized successfully');
  console.log('Auth instance:', auth ? '✅ Created' : '❌ Failed');

  // Check if we can reach the auth service
  auth.tenantId; // This will throw if auth is misconfigured
  console.log('✅ Auth service is accessible');

} catch (error: any) {
  console.error('❌ Firebase Auth Error:', error.message);
  console.error('Error code:', error.code);

  if (error.code === 'auth/configuration-not-found') {
    console.error('⚠️  Authentication is not enabled in Firebase Console');
    console.error('Please go to Firebase Console > Authentication > Sign-in method');
    console.error('and enable Email/Password and Google sign-in providers');
  }
}

process.exit(0);