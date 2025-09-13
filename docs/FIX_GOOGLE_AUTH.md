# Fix Google Sign-In Authentication

## Problem
Firebase OAuth error: `auth/unauthorized-domain`
Current domain not authorized for OAuth operations.

## Solution Steps

### 1. Add Domain to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **nomadnew-23747**
3. Navigate to: **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add this exact domain:
   ```
   9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev
   ```
6. Click **Add**

### 2. Also Add These Common Domains (if not already present):
- `localhost`
- `127.0.0.1`
- Your production domain (if you have one)

### 3. Verify Google OAuth Settings

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Ensure it's **Enabled**
4. Check that the **Web SDK configuration** has:
   - Web client ID (should be auto-filled)
   - Web client secret (optional)

### 4. Check Google Cloud Console (if needed)

If the above doesn't work:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (Web application)
5. Click to edit
6. Under **Authorized JavaScript origins**, add:
   ```
   https://9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev
   ```
7. Under **Authorized redirect URIs**, add:
   ```
   https://9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev/__/auth/handler
   ```
8. Save changes

### 5. Clear Browser Cache

After making these changes:
1. Clear your browser cache and cookies
2. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Try signing in again

### 6. Alternative Quick Fix (Development Only)

If you're just testing, you can temporarily use the Firebase Auth Emulator:

1. Update your Firebase config to use the emulator:
```javascript
// In your firebase initialization
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

## Common Issues & Solutions

### Issue: Changes not taking effect
**Solution:** It can take 5-10 minutes for domain changes to propagate. Wait and try again.

### Issue: Multiple Firebase projects
**Solution:** Make sure you're editing the correct project in Firebase Console.

### Issue: Popup blocked
**Solution:** Ensure popups are allowed for your domain in browser settings.

## Verification Steps

1. After adding the domain, check the console for the warning message - it should disappear
2. Try Google Sign-In again
3. Check browser console for any new errors

## Note for Firebase IDE

Since you're using Firebase IDE (Cloud Workstations), the domain changes frequently. You might need to:
1. Add new domains as they're generated
2. Consider using a stable custom domain
3. Use Firebase Hosting for a consistent domain

The domain pattern for Firebase Cloud Workstations is:
`[PORT]-firebase-[PROJECT]-[INSTANCE].cluster-[HASH].cloudworkstations.dev`

This changes with each workspace, so you'll need to update it when the workspace URL changes.