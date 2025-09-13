'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAuthPage() {
  const [status, setStatus] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testPopupAuth = async () => {
    try {
      setError('');
      addStatus('Starting popup authentication...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      addStatus(`Project: ${auth.app.options.projectId}`);
      addStatus(`Auth Domain: ${auth.app.options.authDomain}`);
      
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        addStatus(`✅ Success! User: ${result.user.email}`);
        addStatus(`UID: ${result.user.uid}`);
      }
    } catch (err: any) {
      setError(`Error: ${err.code} - ${err.message}`);
      addStatus(`❌ Failed: ${err.code}`);
      
      if (err.code === 'auth/unauthorized-domain') {
        addStatus('⚠️ Current domain is not authorized in Firebase Console');
        addStatus(`Current domain: ${window.location.hostname}`);
      }
    }
  };

  const testRedirectAuth = async () => {
    try {
      setError('');
      addStatus('Starting redirect authentication...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      addStatus(`Project: ${auth.app.options.projectId}`);
      addStatus(`Auth Domain: ${auth.app.options.authDomain}`);
      
      await signInWithRedirect(auth, provider);
      addStatus('Redirecting to Google...');
    } catch (err: any) {
      setError(`Error: ${err.code} - ${err.message}`);
      addStatus(`❌ Failed: ${err.code}`);
    }
  };

  const checkRedirectResult = async () => {
    try {
      addStatus('Checking for redirect result...');
      const result = await getRedirectResult(auth);
      
      if (result && result.user) {
        addStatus(`✅ Redirect successful! User: ${result.user.email}`);
        addStatus(`UID: ${result.user.uid}`);
      } else {
        addStatus('No redirect result found');
      }
    } catch (err: any) {
      addStatus(`❌ Redirect check failed: ${err.code}`);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Auth Test Page</CardTitle>
          <div className="text-sm text-gray-600">
            <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
            <p>Hostname: {typeof window !== 'undefined' ? window.location.hostname : 'Loading...'}</p>
            <p>Project: {auth.app.options.projectId}</p>
            <p>Auth Domain: {auth.app.options.authDomain}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={testPopupAuth}>Test Popup Auth</Button>
            <Button onClick={testRedirectAuth} variant="outline">Test Redirect Auth</Button>
            <Button onClick={checkRedirectResult} variant="secondary">Check Redirect Result</Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-mono text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">Status Log:</h3>
            <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
              {status.length === 0 ? (
                <p className="text-gray-500">No actions taken yet</p>
              ) : (
                status.map((msg, idx) => (
                  <div key={idx} className="font-mono text-sm py-1">
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Troubleshooting:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• If you see "unauthorized-domain", add this domain to Firebase Console</li>
              <li>• If popup is blocked, redirect method will be used automatically</li>
              <li>• After redirect, click "Check Redirect Result" to see if it worked</li>
              <li>• Check browser console for detailed error messages</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}