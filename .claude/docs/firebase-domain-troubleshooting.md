# Firebase Domain Authorization Troubleshooting

## The Issue
Your Firebase IDE is using this domain:
```
9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev
```

This needs to be added EXACTLY as shown to Firebase authorized domains.

## Quick Fix Attempts

### 1. Try Different Domain Formats
Sometimes Firebase needs different formats. Try adding ALL of these:
- `9000-firebase-nomad-navigatordup-1757728217418.cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev`
- `*.cloudworkstations.dev`
- `cluster-76blnmxvvzdpat4inoxk5tmzik.cloudworkstations.dev`

### 2. Use Redirect Method (Now Implemented)
The code now automatically falls back to redirect method even for unauthorized domains. This might work where popup doesn't.

### 3. Check Firebase Console Again
1. Go to: https://console.firebase.google.com
2. Select: **nomad-navigator-xej23**
3. Navigate to: **Authentication → Settings → Authorized domains**
4. You should see:
   - `localhost` 
   - `nomad-navigator-xej23.firebaseapp.com`
   - `nomad-navigator-xej23.web.app`
   - Your Firebase IDE domain (the long one above)

### 4. Alternative: Test Locally
If Firebase IDE continues to have issues, you can test locally:
```bash
# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Run the app locally
npm run dev
```
Then access at: http://localhost:9002

### 5. Check OAuth Consent Screen
In Google Cloud Console (if OAuth client now exists):
1. Go to: https://console.cloud.google.com
2. Select: **nomad-navigator-xej23**
3. Navigate to: **APIs & Services → OAuth consent screen**
4. Make sure it's configured and not in "Testing" mode with restrictions

### 6. Clear Everything and Retry
```bash
# Clear all caches
rm -rf .next
rm -rf node_modules/.cache
npm run build
```

Then:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear site data (cookies, localStorage)
3. Try again

### 7. Firebase Project Settings Check
In Firebase Console:
1. Go to Project Settings
2. Check that the project is active
3. Verify the Web app configuration matches what's in your code

## What's Changed in Code
- Now attempts redirect method even when domain is unauthorized
- This might bypass the domain check in some cases
- The redirect should work if the domain is properly configured

## If Nothing Works
The issue might be:
1. Firebase IDE has special restrictions
2. The project might need to be migrated to a new one
3. OAuth consent screen might need configuration in Google Cloud

Try accessing your app from a different URL or locally to isolate if it's a Firebase IDE-specific issue.