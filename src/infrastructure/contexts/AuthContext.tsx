
'use client';

/**
 * Authentication Context
 * Provides global auth state management for the Nomad Navigator app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  UserCredential,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '@/services/firebase/auth';
import { tripsService } from '@/services/trips/trips-service';

// User data interface stored in Firestore
interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  preferences: {
    travelStyle: 'budget' | 'mid-range' | 'luxury';
    interests: string[];
    preferredLanguage: string;
    currency: string;
    defaultTripLength: number;
  };
  stats: {
    totalTripsPlanned: number;
    favoriteDestinations: string[];
    lastTripGenerated?: Timestamp;
  };
}

// Auth context interface
interface AuthContextType {
  // User state
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  
  // Authentication methods
  signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Profile methods
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Default user preferences
  const defaultPreferences = {
    travelStyle: 'mid-range' as const,
    interests: [],
    preferredLanguage: 'en',
    currency: 'USD',
    defaultTripLength: 7
  };

  // Create user document in Firestore
  const createUserDocument = async (user: User, additionalData: any = {}) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const userData: any = {
        email: user.email!,
        displayName: user.displayName || additionalData.displayName || '',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        preferences: defaultPreferences,
        stats: {
          totalTripsPlanned: 0,
          favoriteDestinations: []
        }
      };

      // Only add photoURL if it exists
      if (user.photoURL) {
        userData.photoURL = user.photoURL;
      }

      await setDoc(userRef, userData);
      console.log('✅ User document created');
    } else {
      // Update last login time
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
    }
  };

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string): Promise<UserData | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { uid, ...userSnap.data() } as UserData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string): Promise<UserCredential> => {
    console.log('📝 Attempting sign up for:', email);
    console.log('🔑 Auth configuration:', {
      projectId: auth.app.options.projectId,
      authDomain: auth.app.options.authDomain,
      apiKey: auth.app.options.apiKey ? '✅ Present' : '❌ Missing'
    });

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Account created successfully');

      // Update the user's display name
      await updateProfile(result.user, { displayName });
      console.log('✅ Display name updated');

      // Create user document
      await createUserDocument(result.user, { displayName });

      console.log('✅ User signed up successfully');
      return result;
    } catch (error: any) {
      console.error('❌ Sign up error:', {
        code: error.code,
        message: error.message,
        details: error
      });

      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Authentication is not properly configured. Please contact support.');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email/password accounts are not enabled. Please contact support.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }

      throw error;
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    console.log('🔐 Attempting sign in for:', email);
    console.log('🔑 Auth configuration:', {
      projectId: auth.app.options.projectId,
      authDomain: auth.app.options.authDomain,
      apiKey: auth.app.options.apiKey ? '✅ Present' : '❌ Missing'
    });

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Sign in successful, user:', result.user.email);

      // Update last login time
      await updateDoc(doc(db, 'users', result.user.uid), {
        lastLoginAt: serverTimestamp()
      });

      console.log('✅ User signed in successfully');
      return result;
    } catch (error: any) {
      console.error('❌ Sign in error:', {
        code: error.code,
        message: error.message,
        details: error
      });

      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Authentication is not properly configured. Please contact support.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Incorrect email or password.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed login attempts. Please try again later.');
      }

      throw error;
    }
  };

  // Sign in with Google using redirect flow (works with popup blockers)
  const signInWithGoogle = async (): Promise<void> => {
    console.log('🚀 Starting Google sign-in...');
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

        // Store the current URL to redirect back after auth
        sessionStorage.setItem('authRedirectUrl', window.location.href);

        await signInWithRedirect(auth, provider);
        // This line won't execute as the page redirects
      } else {
        // On desktop, try popup first but have better fallback
        try {
          console.log('💻 Attempting popup sign-in...');

          // Mark that we're using popup to prevent redirect check
          sessionStorage.setItem('googleAuthMethod', 'popup');

          const result = await signInWithPopup(auth, provider);
          console.log('✅ Google sign-in successful via popup');

          // Clear ALL auth flags after successful popup to prevent redirect checks
          sessionStorage.removeItem('googleAuthMethod');
          localStorage.removeItem('pendingGoogleAuth');
          sessionStorage.removeItem('authRedirectUrl');

          // Create/update user document
          await createUserDocument(result.user);
          const data = await fetchUserData(result.user.uid);
          setUserData(data);

          return;
        } catch (popupError: any) {
          console.log('⚠️ Popup failed:', popupError.code, popupError.message);

          // Clear popup flag since it failed
          sessionStorage.removeItem('googleAuthMethod');

          // Always fall back to redirect on any popup error
          console.log('🔄 Falling back to redirect sign-in...');
          localStorage.setItem('pendingGoogleAuth', 'true');

          // Store the current URL to redirect back after auth
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
      throw error;
    }
  };

  // Log out
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUserData(null);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<UserData>): Promise<void> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, data);
      
      // Refresh local user data
      await refreshUserData();
      
      console.log('✅ User profile updated');
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  // Refresh user data from Firestore
  const refreshUserData = async (): Promise<void> => {
    if (!user) return;
    
    const data = await fetchUserData(user.uid);
    setUserData(data);
  };

  // Handle auth state changes and redirect results
  useEffect(() => {
    let mounted = true;

    // ONLY check for redirect result if we're actually coming back from a redirect
    // This is CRITICAL - do not call getRedirectResult unless absolutely necessary
    const pendingAuth = localStorage.getItem('pendingGoogleAuth');

    if (pendingAuth === 'true') {
      console.log('🔍 Found pending auth flag, checking for redirect result...');

      // Clear flag immediately to prevent any duplicate checks
      localStorage.removeItem('pendingGoogleAuth');

      // Set persistence and check for redirect result
      setPersistence(auth, browserLocalPersistence)
        .then(() => getRedirectResult(auth))
        .then(async (result) => {
          if (!mounted) return;

          if (result && result.user) {
            console.log('✅ Google sign-in redirect successful');

            // Create/update user document
            await createUserDocument(result.user);
            const data = await fetchUserData(result.user.uid);

            if (mounted) {
              setUser(result.user);
              setUserData(data);

              // Sync local trips
              if (data) {
                try {
                  await tripsService.syncLocalStorageToFirestore(result.user.uid);
                  console.log('✅ Local trips synced to Firestore');
                } catch (syncError) {
                  console.error('Error syncing local trips:', syncError);
                }
              }
            }
          } else {
            console.log('ℹ️ No redirect result found');
          }

          setLoading(false);
        })
        .catch((error: any) => {
          if (!mounted) return;

          if (error.code && error.code !== 'auth/redirect-cancelled-by-user') {
            console.error('Redirect result error:', error);
          }
          setLoading(false);
        });
    }

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      // Check if we're currently handling a redirect
      const pendingAuth = localStorage.getItem('pendingGoogleAuth');

      if (user) {
        setUser(user);
        const data = await fetchUserData(user.uid);

        if (mounted) {
          setUserData(data);

          // Only sync trips if not handling redirect (to avoid duplicate syncs)
          if (data && !pendingAuth) {
            try {
              await tripsService.syncLocalStorageToFirestore(user.uid);
              console.log('✅ Local trips synced to Firestore on auth');
            } catch (syncError) {
              console.error('Error syncing local trips:', syncError);
            }
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }

      // Only set loading to false if we're not waiting for a redirect
      if (!pendingAuth) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    updateUserProfile,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
