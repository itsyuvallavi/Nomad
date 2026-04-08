'use client';

/**
 * useGoogleAuth Hook
 * Thin wrapper around Supabase OAuth — replaces the Firebase popup/redirect logic.
 * Supabase handles the redirect automatically.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';

export const useGoogleAuth = () => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async (
    onSuccess?: () => void,
    onError?: (error: any) => void
  ): Promise<void> => {
    setIsGoogleLoading(true);
    setGoogleError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) throw error;

      // signInWithOAuth triggers a redirect — onSuccess called only on non-redirecting envs
      if (onSuccess) onSuccess();
    } catch (error: any) {
      const message = error?.message ?? 'Failed to sign in with Google';
      setGoogleError(message);
      setIsGoogleLoading(false);
      if (onError) onError(error);
      throw error;
    }
  }, []);

  return { signInWithGoogle, isGoogleLoading, googleError };
};