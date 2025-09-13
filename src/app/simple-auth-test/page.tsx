'use client';

import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';

// Direct Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB9fTTuNleIGli6JRXwvGJhCoGFtRu4FeU",
  authDomain: "nomad-navigator-xej23.firebaseapp.com",
  projectId: "nomad-navigator-xej23",
  storageBucket: "nomad-navigator-xej23.firebasestorage.app",
  messagingSenderId: "843370239890",
  appId: "1:843370239890:web:b2e901fda85f270fa3934b"
};

export default function SimpleAuthTest() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [auth, setAuth] = useState<any>(null);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig, 'test-app');
      const authInstance = getAuth(app);
      setAuth(authInstance);
      setStatus('Firebase initialized');

      // Check for redirect result
      getRedirectResult(authInstance).then((result) => {
        if (result?.user) {
          setUser(result.user);
          setStatus(`Signed in via redirect: ${result.user.email}`);
        }
      }).catch((err) => {
        if (err.code !== 'auth/no-auth-event') {
          console.error('Redirect error:', err);
        }
      });

      // Listen to auth state
      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUser(user);
          setStatus(`Signed in: ${user.email}`);
        } else {
          setUser(null);
        }
      });

      return () => unsubscribe();
    } catch (err: any) {
      setError(`Init error: ${err.message}`);
    }
  }, []);

  const testDirectPopup = async () => {
    if (!auth) return;
    
    try {
      setError('');
      setStatus('Attempting popup sign-in...');
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        setUser(result.user);
        setStatus(`Success! Signed in as: ${result.user.email}`);
      }
    } catch (err: any) {
      setError(`Popup error: ${err.code} - ${err.message}`);
      setStatus('Popup failed');
      
      // Auto-retry with redirect
      if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/popup-closed-by-user') {
        testDirectRedirect();
      }
    }
  };

  const testDirectRedirect = async () => {
    if (!auth) return;
    
    try {
      setError('');
      setStatus('Attempting redirect sign-in...');
      
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
      setStatus('Redirecting to Google...');
    } catch (err: any) {
      setError(`Redirect error: ${err.code} - ${err.message}`);
      setStatus('Redirect failed');
    }
  };

  const signOut = async () => {
    if (!auth) return;
    
    try {
      await auth.signOut();
      setUser(null);
      setStatus('Signed out');
    } catch (err: any) {
      setError(`Sign out error: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Simple Auth Test</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p className="text-sm"><strong>Status:</strong> {status}</p>
        <p className="text-sm"><strong>Domain:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'Loading...'}</p>
        <p className="text-sm"><strong>Project:</strong> nomad-navigator-xej23</p>
        <p className="text-sm"><strong>Auth Domain:</strong> nomad-navigator-xej23.firebaseapp.com</p>
      </div>

      {user && (
        <div className="mb-4 p-4 bg-green-100 rounded">
          <p className="font-semibold">Signed in!</p>
          <p>Email: {user.email}</p>
          <p>UID: {user.uid}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 rounded">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-x-2">
        {!user ? (
          <>
            <Button onClick={testDirectPopup}>Test Popup</Button>
            <Button onClick={testDirectRedirect} variant="outline">Test Redirect</Button>
          </>
        ) : (
          <Button onClick={signOut} variant="destructive">Sign Out</Button>
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded">
        <h2 className="font-semibold mb-2">If auth fails:</h2>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>The domain shown above must be in Firebase authorized domains</li>
          <li>Google Sign-In must be enabled in Firebase Console</li>
          <li>Try the redirect method if popup fails</li>
          <li>Check browser console for detailed errors</li>
        </ol>
      </div>
    </div>
  );
}