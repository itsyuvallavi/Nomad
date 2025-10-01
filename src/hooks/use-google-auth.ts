'use client';

/**
 * useGoogleAuth Hook
 * Handles Google authentication with popup/redirect fallback
 */

import { useState, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '@/services/firebase/auth';

export const useGoogleAuth = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async (
    onSuccess?: () => void,
    onError?: (error: any) => void
  ): Promise<void> => {
    console.log('🚀 Starting Google sign-in...');
    setIsGoogleLoading(true);
    setGoogleError(null);

    try {
      // Set persistence BEFORE any auth operations
      await setPersistence(auth, browserLocalPersistence);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Add scopes for profile and email
      provider.addScope('profile');
      provider.addScope('email');

      // Check if we're on mobile or if popup might be blocked
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // On mobile, always use redirect to avoid popup blocker issues
        console.log('📱 Mobile detected, using redirect sign-in...');
        localStorage.setItem('pendingGoogleAuth', 'true');
        sessionStorage.setItem('authRedirectUrl', window.location.href);
        await signInWithRedirect(auth, provider);
        // This line won't execute as the page redirects
      } else {
        // On desktop, try popup first but have better fallback
        try {
          console.log('💻 Attempting popup sign-in...');
          sessionStorage.setItem('googleAuthMethod', 'popup');

          const result = await signInWithPopup(auth, provider);
          console.log('✅ Google sign-in successful via popup');

          // Clear ALL auth flags after successful popup
          sessionStorage.removeItem('googleAuthMethod');
          localStorage.removeItem('pendingGoogleAuth');
          sessionStorage.removeItem('authRedirectUrl');

          if (onSuccess) {
            onSuccess();
          }

          setIsGoogleLoading(false);
          return;
        } catch (popupError: any) {
          console.log('⚠️ Popup failed:', popupError.code, popupError.message);
          sessionStorage.removeItem('googleAuthMethod');

          // Handle specific popup errors
          if (popupError.code === 'auth/popup-closed-by-user') {
            setGoogleError('Sign-in cancelled');
            setIsGoogleLoading(false);
            if (onError) {
              onError(popupError);
            }
            return;
          }

          // Fall back to redirect on any other popup error
          console.log('🔄 Falling back to redirect sign-in...');
          localStorage.setItem('pendingGoogleAuth', 'true');
          sessionStorage.setItem('authRedirectUrl', window.location.href);
          await signInWithRedirect(auth, provider);
          // This line won't execute as the page redirects
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      localStorage.removeItem('pendingGoogleAuth');
      sessionStorage.removeItem('authRedirectUrl');
      sessionStorage.removeItem('googleAuthMethod');

      setGoogleError(error.message || 'Failed to sign in with Google');
      setIsGoogleLoading(false);

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }, []);

  return {
    signInWithGoogle,
    isGoogleLoading,
    googleError
  };
};