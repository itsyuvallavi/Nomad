'use client';

/**
 * useAuth Hook
 * Custom hook to access authentication context
 */

import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/infrastructure/contexts/AuthProvider';

/**
 * Custom hook to use auth context
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // Prevent crashing Next.js prerendering on statically compiled components
    if (typeof window === 'undefined') {
      return { user: null, userData: null, loading: true } as unknown as AuthContextType;
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};