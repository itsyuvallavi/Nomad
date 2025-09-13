'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TestGoogleAuth() {
  const { signInWithGoogle, user, logout } = useAuth();
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    console.log(message);
  };

  const testGoogleAuth = async () => {
    setStatus('Testing Google authentication...');
    setError('');
    setLogs([]);

    addLog('Starting Google sign-in test');
    addLog(`Current domain: ${window.location.hostname}`);
    addLog(`Current origin: ${window.location.origin}`);
    addLog(`Auth domain: nomad-navigatordup-70195-f4cf9.firebaseapp.com`);

    try {
      addLog('Calling signInWithGoogle()...');
      await signInWithGoogle();
      addLog('✅ Google sign-in successful!');
      setStatus('Success! User signed in.');
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
      addLog(`Error code: ${err.code}`);
      setError(err.message || 'An unknown error occurred');
      setStatus('Failed to sign in');

      // Provide specific guidance based on error
      if (err.code === 'auth/unauthorized-domain') {
        addLog('⚠️ This domain is not authorized in Firebase Console');
        addLog(`Add ${window.location.hostname} to authorized domains`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        addLog('⚠️ Popup was closed - this might be a domain authorization issue');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setStatus('Logged out successfully');
      setLogs([]);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Google Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Current Status:</h3>
            {user ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>Signed in as: {user.email}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-600">
                <AlertCircle className="h-5 w-5" />
                <span>Not signed in</span>
              </div>
            )}
          </div>

          {/* Test Button */}
          <div className="flex gap-4">
            {!user ? (
              <Button onClick={testGoogleAuth} size="lg">
                Test Google Sign-In
              </Button>
            ) : (
              <Button onClick={handleLogout} variant="outline" size="lg">
                Sign Out
              </Button>
            )}
          </div>

          {/* Status Message */}
          {status && (
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg">
              {status}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Debug Logs */}
          {logs.length > 0 && (
            <div className="p-4 bg-gray-900 text-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Debug Logs:</h3>
              <pre className="text-xs overflow-x-auto">
                {logs.join('\n')}
              </pre>
            </div>
          )}

          {/* Configuration Info */}
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold mb-2">Firebase Configuration:</h3>
            <ul className="text-sm space-y-1">
              <li><strong>Project ID:</strong> nomad-navigatordup-70195-f4cf9</li>
              <li><strong>Auth Domain:</strong> nomad-navigatordup-70195-f4cf9.firebaseapp.com</li>
              <li><strong>Current Domain:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</li>
            </ul>
            <div className="mt-3 text-sm text-yellow-800">
              <strong>Note:</strong> Make sure {typeof window !== 'undefined' ? window.location.hostname : 'your domain'} is added to the authorized domains in Firebase Console → Authentication → Settings → Authorized domains
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}