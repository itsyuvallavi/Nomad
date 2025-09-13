# Firebase Authentication Setup Instructions

## Enable Cross-Domain Authentication

To allow authentication to work across both your development URL and Firebase hosting URL, you need to configure the following in the Firebase Console:

### 1. Add Authorized Domains

Go to your Firebase Console:
1. Navigate to **Authentication** → **Settings** → **Authorized domains**
2. Add both of these domains:
   - `nomad-navigatordup-70195-f4cf9.web.app`
   - `nomad-navigatordup-70195-f4cf9.firebaseapp.com`
   - Your development URL (if different from localhost)

### 2. Configure Google OAuth Redirect URIs

In the Firebase Console:
1. Go to **Authentication** → **Sign-in method** → **Google**
2. Click on the Google provider configuration
3. Add your redirect URIs:
   - `https://nomad-navigatordup-70195-f4cf9.firebaseapp.com/__/auth/handler`
   - `https://nomad-navigatordup-70195-f4cf9.web.app/__/auth/handler`

### 3. Update OAuth 2.0 Client in Google Cloud Console

If the above doesn't work, you may need to:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `nomad-navigatordup-70195-f4cf9`
3. Navigate to **APIs & Services** → **Credentials**
4. Find your Web OAuth 2.0 Client
5. Add these Authorized redirect URIs:
   - `https://nomad-navigatordup-70195-f4cf9.firebaseapp.com/__/auth/handler`
   - `https://nomad-navigatordup-70195-f4cf9.web.app/__/auth/handler`
   - `http://localhost:9002` (for local development)
   - `http://localhost:9002/__/auth/handler`

### 4. Verify Configuration

After making these changes:
1. The redirect-based authentication should work across domains
2. Users can sign in on one domain and remain authenticated on the other
3. Google Sign-In will redirect back to the correct domain

## Implementation Changes Made

✅ **Changed from popup to redirect authentication**
- Modified `signInWithGoogle()` to use `signInWithRedirect()` instead of `signInWithPopup()`
- Added `getRedirectResult()` handler in AuthContext to process redirect results
- This approach works better with Firebase IDE and cross-domain scenarios

✅ **Fixed return type**
- Changed `signInWithGoogle` return type from `Promise<UserCredential>` to `Promise<void>`
- Redirect-based auth doesn't immediately return credentials

✅ **Added redirect result handler**
- New useEffect to check for redirect results on page load
- Properly creates user document after successful Google sign-in
- Updates last login timestamp

## Testing

1. **Test Google Sign-In**:
   - Click "Sign in with Google"
   - Should redirect to Google
   - After selecting account, should redirect back
   - User should be logged in

2. **Test Cross-Domain**:
   - Sign in on one URL
   - Navigate to the other URL
   - Should remain authenticated

3. **Test Manual Sign-Up/Sign-In**:
   - Create account with email/password
   - Sign out
   - Sign back in
   - Should work without errors