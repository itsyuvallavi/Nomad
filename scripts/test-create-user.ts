import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAjCr2OHqp7twKa2jO9zzUq3GyKdSwVHWI',
  authDomain: 'nomadoldrepair-86680360-86245.firebaseapp.com',
  projectId: 'nomadoldrepair-86680360-86245',
  storageBucket: 'nomadoldrepair-86680360-86245.firebasestorage.app',
  messagingSenderId: '336606783309',
  appId: '1:336606783309:web:a09a6e10579788ea0bf904'
};

async function testUserCreationAndLogin() {
  console.log('🧪 Testing User Creation and Login Flow\n');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // Test credentials
  const testEmail = `testuser${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  console.log('📧 Test email:', testEmail);
  console.log('🔑 Test password:', testPassword);
  console.log('');

  try {
    // Step 1: Create a new user
    console.log('1️⃣ Creating new user...');
    const createResult = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User created successfully!');
    console.log('   User ID:', createResult.user.uid);
    console.log('   Email:', createResult.user.email);
    console.log('');

    // Step 2: Sign out
    console.log('2️⃣ Signing out...');
    await auth.signOut();
    console.log('✅ Signed out successfully');
    console.log('');

    // Step 3: Sign in with the created user
    console.log('3️⃣ Signing in with created user...');
    const signInResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Sign in successful!');
    console.log('   User ID:', signInResult.user.uid);
    console.log('   Email:', signInResult.user.email);
    console.log('');

    // Step 4: Clean up - delete the test user
    console.log('4️⃣ Cleaning up test user...');
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
      console.log('✅ Test user deleted');
    }

    console.log('\n🎉 All authentication tests passed successfully!');
    console.log('✅ Firebase Authentication is working correctly');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.code);
    console.error('   Message:', error.message);

    if (error.code === 'auth/operation-not-allowed') {
      console.error('\n⚠️  Email/Password authentication is DISABLED!');
      console.error('Please enable it in Firebase Console:');
      console.error('1. Go to https://console.firebase.google.com/');
      console.error('2. Select project: nomadoldrepair-86680360-86245');
      console.error('3. Go to Authentication > Sign-in method');
      console.error('4. Enable Email/Password provider');
    } else if (error.code === 'auth/network-request-failed') {
      console.error('\n⚠️  Network error - check your internet connection');
    } else if (error.code === 'auth/invalid-api-key') {
      console.error('\n⚠️  Invalid API key - check Firebase configuration');
    }

    // Try to clean up if user was created
    if (auth.currentUser) {
      try {
        await deleteUser(auth.currentUser);
        console.log('   (Test user cleaned up)');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  console.log('\n📝 You can now try logging in with a real user account in the app');
  console.log('   If login still fails, check the browser console for detailed error logs');
}

testUserCreationAndLogin().then(() => process.exit(0));