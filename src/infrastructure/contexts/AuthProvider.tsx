'use client';

/**
 * Authentication Provider Component
 * Provides global auth state management for the Nomad Navigator app
 * Optimized with memoization to prevent unnecessary re-renders
 */

import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  UserCredential,
  setPersistence,
  browserLocalPersistence,
  getRedirectResult
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
import { useGoogleAuth } from '@/hooks/use-google-auth';

// User data interface stored in Firestore
export interface UserData {
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
export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | null>(null);

// Default user preferences
const DEFAULT_PREFERENCES = {
  travelStyle: 'mid-range' as const,
  interests: [],
  preferredLanguage: 'en',
  currency: 'USD',
  defaultTripLength: 7
};

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Use the Google auth hook
  const { signInWithGoogle: googleSignIn } = useGoogleAuth();

  // Create user document in Firestore (memoized)
  const createUserDocument = useCallback(async (user: User, additionalData: any = {}) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const userData: any = {
        email: user.email!,
        displayName: user.displayName || additionalData.displayName || '',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        preferences: DEFAULT_PREFERENCES,
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
  }, []);

  // Fetch user data from Firestore (memoized)
  const fetchUserData = useCallback(async (uid: string): Promise<UserData | null> => {
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
  }, []);

  // Sign up with email and password (memoized)
  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<UserCredential> => {
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
  }, [createUserDocument]);

  // Sign in with email and password (memoized)
  const signIn = useCallback(async (email: string, password: string): Promise<UserCredential> => {
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
  }, []);

  // Sign in with Google (using the hook)
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    await googleSignIn(
      async () => {
        // On success callback
        if (auth.currentUser) {
          await createUserDocument(auth.currentUser);
          const data = await fetchUserData(auth.currentUser.uid);
          setUserData(data);
        }
      },
      (error) => {
        // On error callback
        console.error('Google sign-in error:', error);
      }
    );
  }, [googleSignIn, createUserDocument, fetchUserData]);

  // Log out (memoized)
  const logout = useCallback(async (): Promise<void> => {
    try {
      await signOut(auth);
      setUserData(null);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  // Reset password (memoized)
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }, []);

  // Update user profile (memoized)
  const updateUserProfile = useCallback(async (data: Partial<UserData>): Promise<void> => {
    if (!user) throw new Error('No user logged in');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, data);

      // Refresh local user data
      const newData = await fetchUserData(user.uid);
      setUserData(newData);

      console.log('✅ User profile updated');
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }, [user, fetchUserData]);

  // Refresh user data from Firestore (memoized)
  const refreshUserData = useCallback(async (): Promise<void> => {
    if (!user) return;

    const data = await fetchUserData(user.uid);
    setUserData(data);
  }, [user, fetchUserData]);

  // Handle auth state changes and redirect results
  useEffect(() => {
    let mounted = true;

    // ONLY check for redirect result if we're actually coming back from a redirect
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
  }, [createUserDocument, fetchUserData]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
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
  }), [
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
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};