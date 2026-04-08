'use client';

/**
 * Authentication Provider
 * Provides global auth state using Supabase Auth.
 */

import React, { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import { tripsService } from '@/services/trips/trips-service';

// User data interface stored in public.users
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
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
    lastTripGenerated?: string;
  };
}

// Auth context interface
export interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_PREFERENCES = {
  travelStyle: 'mid-range' as const,
  interests: [],
  preferredLanguage: 'en',
  currency: 'USD',
  defaultTripLength: 7,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from public.users
  const fetchUserData = useCallback(async (uid: string): Promise<UserData | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error || !data) return null;

      return {
        uid: data.id,
        email: data.email,
        displayName: data.display_name ?? '',
        photoURL: data.photo_url ?? undefined,
        createdAt: data.created_at,
        lastLoginAt: data.last_login_at,
        preferences: data.preferences ?? DEFAULT_PREFERENCES,
        stats: data.stats ?? { totalTripsPlanned: 0, favoriteDestinations: [] },
      };
    } catch {
      return null;
    }
  }, []);

  // Ensure user row exists in public.users (handled by DB trigger, but we upsert as fallback)
  const ensureUserDocument = useCallback(async (user: User, displayName?: string) => {
    await supabase.from('users').upsert({
      id: user.id,
      email: user.email!,
      display_name: displayName ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      photo_url: user.user_metadata?.avatar_url ?? null,
      last_login_at: new Date().toISOString(),
      preferences: DEFAULT_PREFERENCES,
      stats: { totalTripsPlanned: 0, favoriteDestinations: [] },
    }, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });
  }, []);

  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });

    if (error) throw error;

    // Create profile row immediately (trigger may not fire fast enough client-side)
    if (data.user) {
      await ensureUserDocument(data.user, displayName);
    }
  }, [ensureUserDocument]);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserData(null);
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  }, []);

  // Update user profile in public.users
  const updateUserProfile = useCallback(async (data: Partial<UserData>) => {
    if (!user) throw new Error('No user logged in');

    const updatePayload: Record<string, any> = {};
    if (data.displayName !== undefined) updatePayload.display_name = data.displayName;
    if (data.photoURL !== undefined) updatePayload.photo_url = data.photoURL;
    if (data.preferences !== undefined) updatePayload.preferences = data.preferences;
    if (data.stats !== undefined) updatePayload.stats = data.stats;

    const { error } = await supabase.from('users').update(updatePayload).eq('id', user.id);
    if (error) throw error;

    const newData = await fetchUserData(user.id);
    setUserData(newData);
  }, [user, fetchUserData]);

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    if (!user) return;
    const data = await fetchUserData(user.id);
    setUserData(data);
  }, [user, fetchUserData]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Ensure user document exists (handles OAuth sign-ins)
          await ensureUserDocument(currentUser);
          const data = await fetchUserData(currentUser.id);
          setUserData(data);

          // Sync localStorage trips
          try {
            await tripsService.syncLocalStorageToFirestore(currentUser.id);
          } catch {
            // Non-critical
          }
        } else {
          setUserData(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [ensureUserDocument, fetchUserData]);

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
    refreshUserData,
  }), [user, userData, loading, signUp, signIn, signInWithGoogle, logout, resetPassword, updateUserProfile, refreshUserData]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};