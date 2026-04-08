import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client (singleton)
 * Use this in all React components, hooks, and client-side code.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton instance for convenience
export const supabase = createClient();
