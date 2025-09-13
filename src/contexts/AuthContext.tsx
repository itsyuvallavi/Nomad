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
import { auth, db } from '@/lib/firebase';
import { tripsService } from '@/lib/trips-service';

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
      const userData: Omit<UserData, 'uid'> = {
        email: user.email!,
        displayName: user.displayName || additionalData.displayName || '',
        photoURL: user.photoURL || undefined,
        createdAt: serverTimestamp() as Timestamp,
        lastLoginAt: serverTimestamp() as Timestamp,
        preferences: defaultPreferences,
        stats: {
          totalTripsPlanned: 0,
          favoriteDestinations: []
        }
      };
      
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
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(result.user, { displayName });
      
      // Create user document
      await createUserDocument(result.user, { displayName });
      
      console.log('✅ User signed up successfully');
      return result;
    } catch (error: any) {
      console.error('Sign up error:', error);
      
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
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login time
      await updateDoc(doc(db, 'users', result.user.uid), {
        lastLoginAt: serverTimestamp()
      });
      
      console.log('✅ User signed in successfully');
      return result;
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Authentication is not properly configured. Please contact support.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password.');
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

  // Sign in with Google
  const signInWithGoogle = async (): Promise<void> => {
    console.log('🚀 Starting Google sign-in...');
    try {
      // Ensure persistence is set
      await setPersistence(auth, browserLocalPersistence);
      console.log('✅ Persistence set to local');
      
      const provider = new GoogleAuthProvider();
      
      // IMPORTANT: Don't add scopes - let Firebase handle defaults
      // Adding scopes can cause issues with the popup flow
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log('📱 Provider configured');
      console.log('🔑 Using project:', auth.app.options.projectId);
      console.log('🌐 Auth domain:', auth.app.options.authDomain);
      console.log('📍 Current origin:', window.location.origin);
      
      // Try popup with better error handling
      const popupStartTime = Date.now();
      try {
        console.log('🪟 Attempting popup sign-in...');
        console.log('⏰ Start time:', new Date().toISOString());

        // Use signInWithPopup directly
        const result = await signInWithPopup(auth, provider);

        const popupDuration = Date.now() - popupStartTime;
        console.log(`⏱️ Popup was open for ${popupDuration}ms`);
        console.log('📦 Raw result received:', result ? 'Result exists' : 'No result');
        
        if (result && result.user) {
          console.log('✅ Google sign-in successful via popup');
          console.log('👤 User info:', {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName
          });
          
          // Create user document
          await createUserDocument(result.user);
          
          // Update last login time
          const userRef = doc(db, 'users', result.user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            await updateDoc(userRef, {
              lastLoginAt: serverTimestamp()
            });
            console.log('✅ User document updated');
          }
        }
      } catch (popupError: any) {
        const popupDuration = Date.now() - popupStartTime;
        console.log(`⏱️ Popup closed/failed after ${popupDuration}ms`);

        console.error('❌ Popup error details:', {
          code: popupError.code,
          message: popupError.message,
          customData: popupError.customData,
          name: popupError.name
        });

        // Check if this is a Firebase IDE specific issue
        const isFirebaseIDE = window.location.hostname.includes('cloudworkstations.dev');

        // Log the error but don't automatically redirect
        if (popupError.code === 'auth/popup-closed-by-user') {
          console.log('🔍 Popup was closed');
          console.log('📍 Current domain:', window.location.hostname);

          if (isFirebaseIDE) {
            console.log('🔥 Detected Firebase IDE environment');
            console.log('⚠️ Firebase IDE may have issues with popup auth');
            console.log('💡 Try one of these solutions:');
            console.log('   1. Deploy to Firebase Hosting and test there');
            console.log('   2. Test locally with npm run dev');
            console.log('   3. Add this exact domain to OAuth redirect URIs in Google Cloud Console');
            throw new Error('Google sign-in may not work properly in Firebase IDE. Deploy to Firebase Hosting or test locally.');
          }

          console.log('⚠️ NOT automatically redirecting - user can retry if needed');
          throw new Error('Sign-in popup was closed. Please try again.');
        } else if (popupError.code === 'auth/popup-blocked') {
          console.log('🚫 Popup was blocked by browser');
          console.log('⚠️ NOT automatically redirecting - user needs to allow popups');
          throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
        } else if (popupError.code === 'auth/unauthorized-domain') {
          console.error('🚨 DOMAIN NOT AUTHORIZED!');
          console.error('Add this domain to Firebase Console:', window.location.hostname);
          throw new Error(`This domain (${window.location.hostname}) is not authorized for Google sign-in. Please contact support.`);
        } else if (popupError.code === 'auth/cancelled-popup-request') {
          console.log('⚠️ Another popup is already open');
          throw new Error('Another sign-in popup is already open. Please close it and try again.');
        } else {
          // Other errors should be thrown with more detail
          console.error('❌ Unexpected popup error:', popupError);
          throw popupError;
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      console.error('Full error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
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

  // Removed redirect result handler since we're using popup-only authentication

  // Listen to auth state changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      
      try {
        if (user) {
          setUser(user);
          
          // Fetch additional user data from Firestore
          const data = await fetchUserData(user.uid);
          setUserData(data);
          
          // Sync localStorage trips to Firestore
          try {
            await tripsService.syncLocalStorageToFirestore(user.uid);
            console.log('✅ Local trips synced to Firestore on auth');
          } catch (syncError) {
            console.error('Error syncing local trips:', syncError);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        setUserData(null);
      }
      
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