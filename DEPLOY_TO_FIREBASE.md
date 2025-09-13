# Firebase Deployment Guide for Nomad Navigator

## Prerequisites
✅ Firebase CLI installed (`npm install -g firebase-tools`)
✅ Logged in to Firebase (`firebase login`)
✅ Project already initialized (you have this)

## Step 1: Build the Next.js App
```bash
npm run build
```
✅ Already done - build successful!

## Step 2: Export for Firebase Hosting
Since Firebase Hosting serves static files, we need to export the Next.js app:

```bash
npm run build && npm run export
```

**Note:** If you don't have an export script, add this to your `package.json`:
```json
"scripts": {
  "export": "next export -o out"
}
```

However, since your app uses dynamic features (API routes, server-side rendering), you might need to deploy to Firebase Hosting with Cloud Functions.

## Step 3: Deploy to Firebase

### Option A: Deploy Everything
```bash
firebase deploy
```

### Option B: Deploy Only Hosting (if functions are failing)
```bash
firebase deploy --only hosting
```

### Option C: Deploy Specific Services
```bash
# Deploy only Firestore rules
firebase deploy --only firestore

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions (after fixing)
firebase deploy --only functions
```

## Fixing Current Issues

### Functions Linting Errors ✅ FIXED
The linting errors in `functions/src/index.ts` have been fixed:
- Removed unused imports
- Fixed spacing in object literal

### If You Still Get Errors

1. **Check Node Version for Functions**
   ```bash
   cd functions
   node --version
   ```
   Firebase Functions requires Node 16 or 18. Update in `functions/package.json`:
   ```json
   "engines": {
     "node": "18"
   }
   ```

2. **Skip Functions for Now**
   If you don't need cloud functions immediately:
   ```bash
   firebase deploy --only hosting,firestore
   ```

3. **Update TypeScript Version**
   The warning about TypeScript version can be fixed in `functions/package.json`:
   ```json
   "devDependencies": {
     "typescript": "~5.1.0"
   }
   ```
   Then run:
   ```bash
   cd functions
   npm install
   cd ..
   ```

## Firebase Hosting Configuration

Make sure your `firebase.json` is configured correctly for Next.js:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## For Next.js with SSR (Server-Side Rendering)

Since your app uses dynamic features, consider using Firebase Hosting with Cloud Run:

1. Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy nomad-navigator --source . --region=us-central1
```

## Quick Deploy Command

Try this sequence:
```bash
# 1. Build the app
npm run build

# 2. Deploy only hosting and Firestore (skip functions)
firebase deploy --only hosting,firestore

# 3. If that works, try functions separately
firebase deploy --only functions
```

## Your Project URL
After successful deployment, your app will be available at:
- https://nomad-navigator-xej23.web.app
- https://nomad-navigator-xej23.firebaseapp.com

## Troubleshooting

### Error: "Command terminated with non-zero exit code"
- Check the specific service that's failing
- Deploy services individually to isolate the issue

### Error: "Missing index"
- Go to Firebase Console → Firestore → Indexes
- Create any missing indexes shown in the error

### Error: "Unauthorized"
- Ensure you're logged in: `firebase login`
- Check you have the right permissions in Firebase Console

## Environment Variables

Remember to set your environment variables in Firebase:
```bash
firebase functions:config:set someservice.key="YOUR_API_KEY"
```

Or use Firebase Hosting environment configuration for Next.js apps.