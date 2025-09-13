# Fix for White Screen After Google Authentication

## The Problem
When you click "Sign in with Google", a popup opens, you select your account, but then the popup shows a white screen and doesn't close. This indicates the OAuth callback isn't being handled properly.

## Root Cause
The Firebase Auth SDK is trying to communicate between the popup window and the parent window, but the callback URL isn't properly configured in Google Cloud Console.

## Solution Steps

### 1. Go to Google Cloud Console
1. Visit: https://console.cloud.google.com
2. Select your project: `nomad-navigatordup-70195-f4cf9`

### 2. Configure OAuth 2.0 Client
1. Navigate to: **APIs & Services** → **Credentials**
2. Find "Web client (auto created by Google Service)" or your OAuth 2.0 Client ID
3. Click to edit

### 3. Add Authorized JavaScript Origins
Add ALL of these origins (exact URLs, including port if applicable):
```
http://localhost:3000
http://localhost:9002
http://localhost
https://nomad-navigatordup-70195-f4cf9.firebaseapp.com
https://nomad-navigatordup-70195-f4cf9.web.app
```

Also add your Firebase IDE URL if different (check your browser's address bar)

### 4. Add Authorized Redirect URIs
Add these redirect URIs:
```
http://localhost:3000/__/auth/handler
http://localhost:9002/__/auth/handler
https://nomad-navigatordup-70195-f4cf9.firebaseapp.com/__/auth/handler
https://nomad-navigatordup-70195-f4cf9.web.app/__/auth/handler
```

### 5. Firebase Console Settings
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Make sure these domains are listed:
   - localhost
   - nomad-navigatordup-70195-f4cf9.firebaseapp.com
   - nomad-navigatordup-70195-f4cf9.web.app
   - Your Firebase IDE domain (if different)

### 6. Clear Browser Data
1. Clear cookies for your domain
2. Clear localStorage
3. Close all tabs with your app
4. Try again in a new incognito/private window

## Testing After Configuration

1. Navigate to `/test-auth`
2. Click "Test Popup Auth"
3. The popup should:
   - Open Google sign-in
   - Let you select account
   - Close automatically
   - Sign you in

If the white screen persists, check the browser console in BOTH windows:
- Main window console
- Popup window console (right-click the white screen → Inspect)

Look for errors about:
- Cross-origin communication
- Invalid origin
- Redirect URI mismatch

## Alternative: Use Redirect Method
If popup continues to fail, the redirect method will work as a fallback:
1. The app will detect popup failure
2. Automatically redirect to Google
3. After sign-in, redirect back to your app
4. Authentication completes

## Common Issues

### "auth/popup-closed-by-user" but popup stays open
- This means the callback URL isn't working
- The popup can't communicate back to the parent window
- Check JavaScript origins in Google Cloud Console

### White screen shows error in console
- Right-click white screen → Inspect → Console
- Look for specific error messages
- Usually indicates redirect_uri mismatch

### Works in one environment but not another
- Each environment needs its own authorized origin
- Add all URLs you use to access the app