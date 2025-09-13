# Fix: Google Sign-In Window Stuck After Email Selection

## Problem
- Google sign-in popup opens ✅
- You select your email ✅
- Window gets stuck and doesn't complete ❌
- Error: `auth/popup-closed-by-user` (misleading - it's actually a redirect issue)

## Root Cause
The OAuth redirect URI isn't configured properly for your new Firebase project.

## Solution

### Step 1: Enable Google Provider in NEW Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your NEW project: **nomad-navigatordup-70195-f4cf9**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google**
5. Make sure it's **Enabled**
6. **IMPORTANT:** Click **Save** even if it looks enabled

### Step 2: Add OAuth Redirect Domain

1. Still in Firebase Console for **nomad-navigatordup-70195-f4cf9**
2. Go to **Authentication** → **Settings** → **Authorized domains**
3. Make sure these are added:
   - `nomad-navigatordup-70195-f4cf9.firebaseapp.com` (should be there by default)
   - `9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev` (your current domain)

### Step 3: Fix Google Cloud Console OAuth (Most Important!)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. **Make sure you select the correct project**: `nomad-navigatordup-70195-f4cf9`
3. Navigate to **APIs & Services** → **Credentials**
4. You should see "Web client (auto created by Google Service)"
5. Click on it to edit
6. Under **Authorized JavaScript origins**, add:
   ```
   https://9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev
   http://localhost:9000
   ```
7. Under **Authorized redirect URIs**, add:
   ```
   https://9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev/__/auth/handler
   https://nomad-navigatordup-70195-f4cf9.firebaseapp.com/__/auth/handler
   ```
8. Click **SAVE**

### Step 4: Clear and Retry

1. **Clear browser data:**
   - Press `Ctrl+Shift+Delete`
   - Select "Cookies and other site data"
   - Select "Cached images and files"
   - Clear data

2. **Sign out of Google (important!):**
   - Go to [accounts.google.com](https://accounts.google.com)
   - Sign out completely

3. **Hard refresh the app:**
   - `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

4. **Try signing in again:**
   - Click Sign in
   - Select your Google account
   - It should now complete successfully

## Why This Happens

When you select your email in the Google popup, Google tries to redirect back to your app with the authentication token. If the redirect URI isn't properly configured in Google Cloud Console, the window gets stuck because it can't complete the redirect.

## Quick Verification

To verify the OAuth client is configured correctly:
1. In Google Cloud Console → APIs & Services → Credentials
2. Click on your OAuth 2.0 Client ID
3. Check that your current domain is in both:
   - Authorized JavaScript origins
   - Authorized redirect URIs (with `/__/auth/handler` path)

## Alternative: Check Browser Console

While the popup is stuck, check the main window's browser console for errors. You might see:
- Cross-origin errors
- Redirect URI mismatch errors
- These will tell you exactly what domain/URI needs to be added

## Still Not Working?

The issue might be that the OAuth consent screen needs configuration:
1. Google Cloud Console → APIs & Services → OAuth consent screen
2. Make sure it's configured and published (or in testing with your email added)
3. Add your email to test users if it's in testing mode