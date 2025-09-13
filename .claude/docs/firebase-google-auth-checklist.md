# Firebase Google Authentication Checklist

## CRITICAL: Firebase Console Configuration

### 1. Enable Google Sign-In Provider
Go to Firebase Console → Authentication → Sign-in method:
1. Click on "Google" provider
2. Toggle "Enable" switch ON
3. Set project public-facing name: "Nomad Navigator"
4. Set project support email: (your email)
5. Click "Save"

### 2. Add Authorized Domains
Firebase Console → Authentication → Settings → Authorized domains:
- `localhost`
- `nomad-navigatordup-70195-f4cf9.firebaseapp.com`
- `nomad-navigatordup-70195-f4cf9.web.app`
- Any custom domain you're using

### 3. Configure OAuth Consent Screen (Google Cloud Console)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `nomad-navigatordup-70195-f4cf9`
3. Navigate to: APIs & Services → OAuth consent screen
4. Configure:
   - App name: Nomad Navigator
   - User support email: (your email)
   - Authorized domains: Add your domains
   - Save

### 4. Update OAuth 2.0 Client ID (Google Cloud Console)
APIs & Services → Credentials → OAuth 2.0 Client IDs:
1. Click on "Web client (auto created by Google Service)"
2. Add Authorized JavaScript origins:
   - `http://localhost:9002`
   - `http://localhost:3000`
   - `https://nomad-navigatordup-70195-f4cf9.firebaseapp.com`
   - `https://nomad-navigatordup-70195-f4cf9.web.app`
3. Add Authorized redirect URIs:
   - `http://localhost:9002/__/auth/handler`
   - `https://nomad-navigatordup-70195-f4cf9.firebaseapp.com/__/auth/handler`
   - `https://nomad-navigatordup-70195-f4cf9.web.app/__/auth/handler`
4. Save

## Debugging Steps

### Check Console Logs
When you click "Sign in with Google", you should see:
1. `🔥 Using Firebase project: nomad-navigatordup-70195-f4cf9`
2. `🌐 Auth domain: nomad-navigatordup-70195-f4cf9.firebaseapp.com`
3. `🚀 Starting Google sign-in...`
4. `🔑 Using project: nomad-navigatordup-70195-f4cf9`

### Common Errors and Solutions

#### Error: `auth/unauthorized-domain`
- **Cause**: Current domain not in authorized list
- **Fix**: Add domain to Firebase Console authorized domains

#### Error: `auth/operation-not-allowed`
- **Cause**: Google provider not enabled
- **Fix**: Enable Google provider in Firebase Console

#### Error: `auth/invalid-api-key`
- **Cause**: API key mismatch
- **Fix**: Verify API key in .env.local matches Firebase Console

#### Error: `auth/configuration-not-found`
- **Cause**: Firebase Auth not set up
- **Fix**: Complete Firebase Auth setup in console

#### Popup opens but nothing happens
- **Cause**: OAuth redirect URI mismatch
- **Fix**: Add correct redirect URIs in Google Cloud Console

## Testing Authentication

1. **Clear browser data**:
   - Clear cookies for your domain
   - Clear localStorage
   - Hard refresh (Ctrl+Shift+R)

2. **Test popup auth**:
   - Click "Sign in with Google"
   - Should open popup
   - Select account
   - Should close and sign in

3. **If popup fails, redirect will automatically trigger**:
   - Page will redirect to Google
   - Select account
   - Should redirect back and sign in

## Current Configuration
- **Project ID**: `nomad-navigatordup-70195-f4cf9`
- **Auth Domain**: `nomad-navigatordup-70195-f4cf9.firebaseapp.com`
- **API Key**: `AIzaSyD6KQ31WlGyU5BIXBXOrr0URPLzMqlkixg`