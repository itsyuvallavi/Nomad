# Configure OAuth for nomad-navigator-xej23

## ✅ Good News
You already have the Google Cloud Project (`nomad-navigator-xej23`) that matches your Firebase project!

## Steps to Configure OAuth

### 1. Go to Google Cloud Console
- URL: https://console.cloud.google.com
- Make sure you're in project: `nomad-navigator-xej23` (Project number: 843370239890)

### 2. Enable Google Sign-In in Firebase First
1. Go to: https://console.firebase.google.com
2. Select project: `nomad-navigator-xej23`
3. Navigate to: **Authentication → Sign-in method**
4. Click on **Google** provider
5. Toggle **Enable** ON
6. Set:
   - Project public-facing name: **Nomad Navigator**
   - Project support email: **(your email)**
7. Click **Save**

### 3. Configure OAuth in Google Cloud Console
1. In Google Cloud Console, go to: **APIs & Services → Credentials**
2. You should see "Web client (auto created by Google Service)"
3. Click on it to edit

#### Add Authorized JavaScript origins:
```
http://localhost
http://localhost:3000
http://localhost:9002
https://nomad-navigator-xej23.firebaseapp.com
https://nomad-navigator-xej23.web.app
```

Also add your Firebase IDE URL (check your browser's address bar for the exact URL)

#### Add Authorized redirect URIs:
```
http://localhost/__/auth/handler
http://localhost:3000/__/auth/handler
http://localhost:9002/__/auth/handler
https://nomad-navigator-xej23.firebaseapp.com/__/auth/handler
https://nomad-navigator-xej23.web.app/__/auth/handler
```

4. Click **Save**

### 4. Wait and Test
1. Wait 5 minutes for changes to propagate
2. Clear browser cache/cookies
3. Try signing in again

## Updated Configuration
Your app is now using:
- **Project ID**: `nomad-navigator-xej23`
- **Project Number**: `843370239890`
- **Auth Domain**: `nomad-navigator-xej23.firebaseapp.com`
- **API Key**: `AIzaSyB9fTTuNleIGli6JRXwvGJhCoGFtRu4FeU`

## Testing
1. Navigate to `/test-auth`
2. You should see:
   - Project: nomad-navigator-xej23
   - Auth Domain: nomad-navigator-xej23.firebaseapp.com
3. Click "Test Popup Auth"
4. The popup should now work correctly!