# Troubleshooting Firebase Authentication

## Current Error: `auth/popup-closed-by-user`

This error occurs when the Google Sign-In popup is closed before authentication completes.

## Common Causes & Solutions

### 1. User Closed the Popup
**Solution:** This is normal behavior - user simply needs to try again and complete the sign-in process.

### 2. Popup Blocker Active
**Solution:** 
- Check if your browser is blocking popups
- Allow popups for your domain: `9000-firebase-nomad-navigatordup-*.cloudworkstations.dev`
- Chrome: Click the blocked popup icon in the address bar and select "Always allow"

### 3. Browser Settings/Extensions
**Solution:**
- Disable ad blockers temporarily
- Try in an incognito/private window
- Try a different browser

### 4. Domain Not Fully Authorized Yet
**Solution:**
- Changes to authorized domains can take 5-10 minutes to propagate
- Clear browser cache: `Ctrl+Shift+Delete` → Clear cached images and files
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### 5. Alternative: Use Sign-In Redirect (Instead of Popup)

If popups continue to fail, we can switch to redirect-based authentication:

```javascript
// Instead of signInWithPopup
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';

// Use redirect instead
await signInWithRedirect(auth, googleProvider);

// Handle result on page load
useEffect(() => {
  getRedirectResult(auth).then((result) => {
    if (result) {
      // User signed in successfully
      const user = result.user;
    }
  });
}, []);
```

## Quick Checklist

1. ✅ Firebase project updated to: `nomad-navigatordup-70195-f4cf9`
2. ✅ Environment variables updated in `.env.local`
3. ⏳ Domain added to Firebase Console authorized domains
4. ⏳ Wait 5-10 minutes for propagation
5. ⏳ Clear browser cache
6. ⏳ Try again with popup allowed

## Testing Steps

1. **Clear Everything:**
   - Clear browser cache and cookies
   - Close all browser tabs
   - Restart browser

2. **Test Authentication:**
   - Open the app in a new tab
   - Click "Sign in"
   - Click "Continue with Google"
   - Complete the sign-in process without closing the popup

3. **If Still Failing:**
   - Open browser console (F12)
   - Try signing in again
   - Check for any new error messages
   - Check if popup blocker notification appears

## Browser-Specific Tips

### Chrome
- Settings → Privacy and security → Site Settings → Pop-ups and redirects
- Add your domain to "Allowed to send pop-ups"

### Firefox
- Settings → Privacy & Security → Permissions → Block pop-up windows
- Add exception for your domain

### Safari
- Safari → Preferences → Websites → Pop-up Windows
- Allow for your domain

## Note for Firebase IDE

Since you're using Firebase IDE (Cloud Workstations), the domain is complex and changes with each session. Make sure to:
1. Add the full domain including the port (9000)
2. Add both http and https versions if needed
3. Consider using a custom domain for consistency