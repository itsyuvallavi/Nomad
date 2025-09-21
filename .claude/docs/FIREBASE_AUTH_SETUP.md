# Firebase Authentication Setup Guide

## Current Configuration
- **Project ID**: nomadoldrepair-86680360-86245
- **Auth Domain**: nomadoldrepair-86680360-86245.firebaseapp.com
- **Status**: ✅ Authentication is working correctly

## Testing Results (January 21, 2025)
- ✅ Firebase initialization successful
- ✅ Email/Password authentication enabled
- ✅ User creation and login working
- ✅ API credentials valid

## Important: Authorized Domains

For authentication to work properly in different environments, you need to add your domains to Firebase's authorized list:

### Current Firebase IDE URL
```
https://9000-firebase-nomadoldrepair-1757818076418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev
```

### Steps to Add Authorized Domains:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select project: `nomadoldrepair-86680360-86245`

2. **Navigate to Authentication Settings**
   - Go to: Authentication > Settings > Authorized domains

3. **Add These Domains** (if not already present):
   ```
   localhost
   127.0.0.1
   nomadoldrepair-86680360-86245.firebaseapp.com
   nomadoldrepair-86680360-86245.web.app
   *.cloudworkstations.dev
   ```

4. **For Firebase IDE Sessions**
   - The domain changes with each session
   - Format: `[port]-firebase-[project]-[sessionid].cluster-[clusterid].cloudworkstations.dev`
   - Add the wildcard: `*.cloudworkstations.dev` to cover all sessions

5. **For Production Deployment**
   - Add your production domain when deploying
   - Example: `yourdomain.com`, `www.yourdomain.com`

## Troubleshooting Login Issues

### If login fails with "auth/unauthorized-domain":
1. Copy the domain from the browser's address bar
2. Add it to Firebase Console > Authentication > Settings > Authorized domains
3. Save and try again

### If login fails with "auth/invalid-credential":
- Check that the email and password are correct
- Ensure the user account exists (try signing up first)

### If Google Sign-in doesn't work:
1. Enable Google provider in Firebase Console > Authentication > Sign-in method
2. Ensure pop-ups are allowed for the domain
3. Check that redirect URLs are properly configured

## Test User Creation

To create a test user for development:

```bash
npx tsx scripts/test-create-user.ts
```

Or manually in the app:
1. Click "Sign up"
2. Enter email: `test@example.com`
3. Enter password: `TestPass123!`
4. Complete registration

## Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAjCr2OHqp7twKa2jO9zzUq3GyKdSwVHWI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=nomadoldrepair-86680360-86245.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nomadoldrepair-86680360-86245
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=nomadoldrepair-86680360-86245.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=336606783309
NEXT_PUBLIC_FIREBASE_APP_ID=1:336606783309:web:a09a6e10579788ea0bf904
```

## Enhanced Logging

The authentication context now includes detailed logging:
- 🔐 Sign-in attempts with email
- 🔑 Auth configuration details
- ✅ Successful operations
- ❌ Detailed error information

Check the browser console for these logs when debugging authentication issues.