import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAjCr2OHqp7twKa2jO9zzUq3GyKdSwVHWI',
  authDomain: 'nomadoldrepair-86680360-86245.firebaseapp.com',
  projectId: 'nomadoldrepair-86680360-86245',
  storageBucket: 'nomadoldrepair-86680360-86245.firebasestorage.app',
  messagingSenderId: '336606783309',
  appId: '1:336606783309:web:a09a6e10579788ea0bf904'
};

console.log('Testing Firebase Auth Providers...\n');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Test email/password auth
const testEmail = 'test@example.com';
const testPassword = 'testpass123';

async function testAuth() {
  console.log('1. Testing Email/Password Authentication...');

  try {
    // Try to sign in (will fail if user doesn't exist or auth not enabled)
    await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Email/Password sign-in successful');
  } catch (error: any) {
    console.log('Sign-in error:', error.code);

    if (error.code === 'auth/operation-not-allowed') {
      console.error('❌ Email/Password authentication is NOT enabled!');
      console.error('   Please enable it in Firebase Console:');
      console.error('   1. Go to https://console.firebase.google.com/');
      console.error('   2. Select project: nomadoldrepair-86680360-86245');
      console.error('   3. Go to Authentication > Sign-in method');
      console.error('   4. Enable Email/Password provider');
    } else if (error.code === 'auth/user-not-found') {
      console.log('✅ Email/Password auth is enabled (user not found is expected)');
    } else if (error.code === 'auth/wrong-password') {
      console.log('✅ Email/Password auth is enabled (wrong password is expected)');
    } else if (error.code === 'auth/invalid-email') {
      console.log('⚠️  Invalid email format');
    } else if (error.code === 'auth/configuration-not-found') {
      console.error('❌ Authentication is not configured in Firebase!');
      console.error('   Please set up Authentication in Firebase Console first');
    } else {
      console.log('⚠️  Unexpected error:', error.message);
    }
  }

  console.log('\n2. Testing if we can create accounts...');
  try {
    // Try to create a test account
    const testEmail2 = `test${Date.now()}@example.com`;
    await createUserWithEmailAndPassword(auth, testEmail2, 'testpass123');
    console.log('✅ Account creation works!');
    // Clean up - delete the test user
    if (auth.currentUser) {
      await auth.currentUser.delete();
      console.log('   (Test account cleaned up)');
    }
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      console.error('❌ Email/Password authentication is DISABLED in Firebase!');
    } else {
      console.log('⚠️  Create account error:', error.code, error.message);
    }
  }

  console.log('\n3. Current Auth Configuration:');
  console.log('   Project:', firebaseConfig.projectId);
  console.log('   Auth Domain:', firebaseConfig.authDomain);
  console.log('   App ID:', firebaseConfig.appId);

  console.log('\n📝 Next Steps:');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Select your project: nomadoldrepair-86680360-86245');
  console.log('3. Navigate to Authentication > Sign-in method');
  console.log('4. Enable Email/Password provider');
  console.log('5. Enable Google provider (optional)');
  console.log('6. Add your domain to Authorized domains if deploying');
}

testAuth().then(() => process.exit(0));