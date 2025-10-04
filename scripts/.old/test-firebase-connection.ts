#!/usr/bin/env tsx

/**
 * Test Firebase Connection Script
 * Tests Firebase Authentication and Firestore connectivity
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Initialize Firebase manually for testing
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase Connection...\n');

  // Test 1: Check Firebase Auth initialization
  console.log('1️⃣ Testing Firebase Auth initialization...');
  try {
    if (auth) {
      console.log('✅ Firebase Auth initialized successfully');
      console.log(`   Project ID: ${auth.app.options.projectId}`);
      console.log(`   Auth Domain: ${auth.app.options.authDomain}\n`);
    } else {
      throw new Error('Auth is null');
    }
  } catch (error) {
    console.error('❌ Firebase Auth initialization failed:', error);
    process.exit(1);
  }

  // Test 2: Check Firestore initialization
  console.log('2️⃣ Testing Firestore initialization...');
  try {
    if (db) {
      console.log('✅ Firestore initialized successfully');
      console.log(`   Project ID: ${db.app.options.projectId}\n`);
    } else {
      throw new Error('Firestore is null');
    }
  } catch (error) {
    console.error('❌ Firestore initialization failed:', error);
    process.exit(1);
  }

  // Test 3: Test Firestore connectivity (read operation)
  console.log('3️⃣ Testing Firestore connectivity (read)...');
  try {
    const testCollection = collection(db, 'test-connection');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firestore read operation successful');
    console.log(`   Documents in test-connection: ${snapshot.size}\n`);
  } catch (error: any) {
    console.error('❌ Firestore read failed:', error.message);
    if (error.code === 'permission-denied') {
      console.log('   Note: This is expected if you need to be authenticated first\n');
    }
  }

  // Test 4: Check environment variables
  console.log('4️⃣ Checking environment variables...');
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'OPENAI_API_KEY',
  ];

  let allPresent = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Set`);
    } else {
      console.log(`❌ ${envVar}: Missing`);
      allPresent = false;
    }
  }

  if (allPresent) {
    console.log('\n✅ All required environment variables are set');
  } else {
    console.log('\n⚠️  Some environment variables are missing');
  }

  console.log('\n🎉 Firebase connection test completed!');
  console.log('\nNext steps:');
  console.log('1. Test authentication by signing in at http://localhost:9000');
  console.log('2. Try creating a trip to test Firestore write operations');
  console.log('3. Check Firebase Console for any security rule issues');
}

// Run the test
testFirebaseConnection().catch(console.error);
