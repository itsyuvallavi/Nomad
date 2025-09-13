# Firebase Deployment Guide - Updated for SSR Support

## Project Status
✅ Cleanup completed
✅ Configuration fixed
✅ API routes require server-side functionality

## Deployment Options

### Option 1: Deploy to Vercel (RECOMMENDED - Easiest)
Since your app has API routes and needs server-side functionality:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to Vercel
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Select default settings
# - Your app will be live with full functionality
```

**Advantages:**
- Zero configuration needed
- Full Next.js support (SSR, API routes, etc.)
- Automatic deployments
- Free tier available

### Option 2: Firebase App Hosting (Beta)
Firebase now supports Next.js with server-side rendering:

```bash
# Initialize Firebase App Hosting
firebase init apphosting

# Choose:
# - Your existing project (nomadnew-23747)
# - Region: us-central1
# - Create new backend or use existing

# Deploy
firebase deploy --only apphosting
```

### Option 3: Deploy to Firebase with Cloud Run
For full control with Firebase + Cloud Run:

1. Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
CMD ["node", "server.js"]
```

2. Update `next.config.ts` to add:
```typescript
output: 'standalone',
```

3. Deploy:
```bash
# Build and deploy to Cloud Run
gcloud run deploy nomad-navigator \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project nomadnew-23747
```

## Quick Test Build

Test your build locally first:
```bash
# Regular build (no static export)
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

## Environment Variables for Deployment

Make sure these are set in your deployment platform:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=nomadnew-23747
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key
AMADEUS_API_KEY=your-amadeus-key
AMADEUS_API_SECRET=your-amadeus-secret
```

## Current Project State

- ✅ Removed unnecessary deployment files
- ✅ Fixed next.config.ts (removed duplicate images, removed static export)
- ✅ Updated package.json scripts
- ✅ Firebase configuration ready
- ✅ Environment variables verified

## Recommended Next Steps

1. **Test locally first:**
   ```bash
   npm run build
   npm start
   ```

2. **Deploy to Vercel (easiest):**
   ```bash
   vercel
   ```

3. **Or use Firebase App Hosting (if you prefer Firebase):**
   ```bash
   firebase init apphosting
   firebase deploy --only apphosting
   ```

## Notes

- The project needs server-side functionality for API routes
- Static export (`output: 'export'`) is not compatible with API routes
- Vercel provides the easiest deployment with zero configuration
- Firebase App Hosting (beta) also supports Next.js with SSR