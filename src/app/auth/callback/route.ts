import { NextResponse } from 'next/server';
import { createClient } from '@/services/supabase/server';

/**
 * Supabase OAuth callback handler.
 * Supabase redirects the user to /auth/callback after Google sign-in.
 * This route exchanges the code for a session and redirects to the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('[Auth Callback] Error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Auth Callback] Code exchange error:', exchangeError.message);
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(exchangeError.message)}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code — redirect home
  return NextResponse.redirect(origin);
}
