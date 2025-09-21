
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

  // Sign in with Google using Popup flow (better for Firebase IDE)
  const signInWithGoogle = async (): Promise<void> => {
    console.log('🚀 Starting Google sign-in...');
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Try popup first (works better in Firebase IDE)
      try {
        console.log('📱 Attempting popup sign-in...');
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Google sign-in successful via popup');

        // Create/update user document
        await createUserDocument(result.user);
        const data = await fetchUserData(result.user.uid);
        setUserData(data);

        return;
      } catch (popupError: any) {
        console.log('⚠️ Popup blocked or failed:', popupError.code);

        // If popup fails, fall back to redirect
        if (popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/cancelled-popup-request') {
          console.log('🔄 Falling back to redirect sign-in...');
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const data = await fetchUserData(user.uid);
        setUserData(data);
        if (data) {
          try {
            await tripsService.syncLocalStorageToFirestore(user.uid);
            console.log('✅ Local trips synced to Firestore on auth');
          } catch (syncError) {
            console.error('Error syncing local trips:', syncError);
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    // Handle redirect result
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          console.log('✅ Google sign-in redirect result received');
          const user = result.user;
          setUser(user);
          await createUserDocument(user);
          const data = await fetchUserData(user.uid);
          setUserData(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('❌ Google sign-in getRedirectResult error:', error);
        setLoading(false);
      });

    return unsubscribe;
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
