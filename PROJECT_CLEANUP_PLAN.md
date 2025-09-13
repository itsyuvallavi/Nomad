# Nomad Navigator Project Cleanup & Restoration Plan

## Current State Analysis

### ✅ What's Working
- Core Next.js 15 structure intact
- Firebase configuration present (.firebaserc, firebase.json)
- AI flows and components preserved
- Package dependencies installed
- Environment files present (.env, .env.local)

### ⚠️ Issues Identified

1. **Mixed Deployment Configurations**
   - `apphosting.yaml` (Firebase App Hosting - requires GitHub)
   - `next.config.ts` has `output: 'export'` (static export)
   - Multiple deployment guide files cluttering root
   - Firebase functions folder present but may not be needed

2. **Configuration Conflicts**
   - Duplicate `images` key in next.config.ts (lines 7 & 30)
   - Static export mode incompatible with SSR/API routes
   - Firebase hosting configured for `/out` directory (static files)

3. **Unnecessary Files**
   - Multiple deployment documentation files in root
   - Lighthouse report in root
   - Shell scripts (start-server.sh)
   - zzFix file (unknown purpose)
   - Config folders that may be redundant

4. **Firebase Project Mismatch**
   - `.firebaserc` points to `nomadnew-23747`
   - Previous references to `nomad-navigator-xej23`

## Cleanup & Restoration Steps

### Phase 1: Remove Unnecessary Files
```bash
# Remove deployment documentation clutter
rm DEPLOY_CORRECT.md
rm DEPLOY_TO_FIREBASE.md
rm FIREBASE_NEXTJS_DEPLOY.md
rm FIX_BROWSER_ERROR.md

# Remove unnecessary files
rm lighthouse-report.json
rm start-server.sh
rm zzFix
rm apphosting.yaml  # Not needed for standard Firebase Hosting

# Clean up config folders if redundant
rm -rf config/development
rm -rf config/production
rm -rf config/testing
```

### Phase 2: Fix Next.js Configuration
Update `next.config.ts`:
```typescript
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Remove static export for full Next.js features
  // output: 'export',  // REMOVE THIS
  
  trailingSlash: true,
  
  typescript: {
    ignoreBuildErrors: true,  // Consider setting to false later
  },
  
  eslint: {
    ignoreDuringBuilds: true,  // Consider setting to false later
  },
  
  // Headers for CORS
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
        ],
      },
    ];
  },
  
  // Single images configuration
  images: {
    unoptimized: true,  // For static export compatibility
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
```

### Phase 3: Choose Deployment Strategy

#### Option A: Firebase Hosting with Static Export (Simpler but Limited)
- Keep `output: 'export'` in next.config.ts
- No SSR, no API routes
- Simple `firebase deploy --only hosting`

#### Option B: Firebase Hosting with Cloud Functions (Recommended)
- Remove `output: 'export'`
- Full Next.js features
- Requires functions setup

#### Option C: Vercel Deployment (Easiest)
- Full Next.js support out of the box
- No configuration needed
- Just `vercel` command

### Phase 4: Update Firebase Configuration

Update `firebase.json` for Option A (Static):
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
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

Update `firebase.json` for Option B (SSR with Functions):
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": ".next/static",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "function": "nextjsFunc"
      }
    ]
  },
  "functions": {
    "source": ".",
    "runtime": "nodejs18"
  }
}
```

### Phase 5: Clean Package.json Scripts
Update deployment scripts:
```json
{
  "scripts": {
    // Keep existing scripts, add/modify:
    "build:static": "next build && next export -o out",
    "deploy:firebase": "npm run build:static && firebase deploy --only hosting,firestore",
    "deploy:vercel": "vercel --prod"
  }
}
```

### Phase 6: Environment Setup
Ensure `.env.local` has all required variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nomadnew-23747
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

OPENAI_API_KEY=
GOOGLE_API_KEY=
AMADEUS_API_KEY=
AMADEUS_API_SECRET=
```

### Phase 7: Testing & Validation
1. Run `npm run typecheck` - fix any TypeScript errors
2. Run `npm run lint` - fix linting issues
3. Run `npm run build` - ensure build succeeds
4. Run `npm run dev` - test locally
5. Run `npm run test:ai --baseline` - verify AI flows

### Phase 8: Deployment
Choose one:
- **Firebase Static**: `npm run deploy:firebase`
- **Vercel**: `vercel --prod`
- **Local Testing**: `npm run dev`

## Quick Start Commands

```bash
# 1. Clean up files
rm DEPLOY_*.md FIREBASE_*.md FIX_*.md lighthouse-report.json start-server.sh zzFix apphosting.yaml

# 2. Fix next.config.ts (manually edit)

# 3. Test build
npm run build

# 4. Deploy (choose one)
firebase deploy --only hosting,firestore  # Static to Firebase
vercel --prod                             # Full-featured to Vercel
```

## Recommended: Use Vercel
Given your project's complexity with AI features, API routes, and SSR needs:
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Your app will be live with full features

## Notes
- Firebase functions folder can be removed if not using Cloud Functions
- Keep `.claude` folder for AI task tracking
- Keep `CLAUDE.md` for AI assistant guidance
- Consider moving to Vercel for easier deployment with full Next.js features