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
  browserLocalPersistence,
  indexedDBLocalPersistence
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
      // Check if we're on mobile (Safari desktop can now use popup with COOP fix)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      // Set persistence BEFORE any auth operations
      // Use IndexedDB for Safari (survives ITP better than localStorage)
      const persistenceType = isSafari ? indexedDBLocalPersistence : browserLocalPersistence;
      console.log('🔧 Setting persistence type:', persistenceType.type);
      await setPersistence(auth, persistenceType);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Add scopes for profile and email
      provider.addScope('profile');
      provider.addScope('email');

      if (isMobile) {
        // On mobile, use redirect (popup doesn't work well on mobile)
        console.log(`📱 Mobile detected, using redirect sign-in...`);

        // Use multiple methods to persist the auth state for Safari ITP compatibility
        localStorage.setItem('pendingGoogleAuth', 'true');
        localStorage.setItem('authTimestamp', Date.now().toString());
        sessionStorage.setItem('authRedirectUrl', window.location.href);

        // For Safari: Store in IndexedDB as well (survives ITP)
        if (isSafari) {
          try {
            const dbRequest = indexedDB.open('nomad-auth-state', 1);
            dbRequest.onupgradeneeded = () => {
              const db = dbRequest.result;
              if (!db.objectStoreNames.contains('auth')) {
                db.createObjectStore('auth');
              }
            };
            dbRequest.onsuccess = () => {
              const db = dbRequest.result;
              const tx = db.transaction('auth', 'readwrite');
              const store = tx.objectStore('auth');
              store.put({ timestamp: Date.now(), pending: true }, 'googleAuth');
              console.log('💾 Safari auth state saved to IndexedDB');
            };
          } catch (idbError) {
            console.warn('IndexedDB storage failed:', idbError);
          }
        }

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
          localStorage.removeItem('authTimestamp');
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
          localStorage.setItem('authTimestamp', Date.now().toString());
          sessionStorage.setItem('authRedirectUrl', window.location.href);

          // Add URL parameter as backup signal
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('authProvider', 'google');

          await signInWithRedirect(auth, provider);
          // This line won't execute as the page redirects
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      localStorage.removeItem('pendingGoogleAuth');
      localStorage.removeItem('authTimestamp');
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