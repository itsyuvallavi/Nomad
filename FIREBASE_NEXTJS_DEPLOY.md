# Deploy Next.js to Firebase with FULL Functionality

## The Problem
Firebase Hosting only serves static files, but your Next.js app needs:
- Server-side rendering (SSR)
- API routes (/api/*)
- Dynamic routes
- Authentication handling
- Real-time data updates

## Solution: Firebase Cloud Run Integration

Since Firebase App Hosting requires GitHub integration, we'll use Cloud Run directly:

### Step 1: Create Dockerfile
Create a file called `Dockerfile` in your project root:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 2: Update next.config.ts
Add this to your next.config.ts to enable standalone output:

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  // ... rest of your config
}
```

### Step 3: Deploy to Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/nomad-navigator-xej23/nomad-app

# Deploy to Cloud Run
gcloud run deploy nomad-app \
  --image gcr.io/nomad-navigator-xej23/nomad-app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="$(cat .env.local | grep NEXT_PUBLIC | xargs | tr ' ' ',')"
```

### Step 4: Connect Cloud Run to Firebase Hosting

Update firebase.json:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "nomad-app",
          "region": "us-central1"
        }
      }
    ]
  }
}
```

Then deploy:
```bash
firebase deploy --only hosting
```

## Alternative: Quick Deploy with Firebase CLI (Experimental)

Firebase now has experimental support for Next.js:

```bash
# Initialize Web Frameworks
firebase init hosting

# When prompted:
# - Choose "Next.js"
# - Select your project
# - Choose "Yes" for SSR

# Deploy
firebase deploy
```

## Why This Works

This setup gives you:
- ✅ Full Next.js SSR support
- ✅ API routes work perfectly
- ✅ Authentication works
- ✅ Real-time Firestore updates
- ✅ All environment variables
- ✅ Exact same functionality as localhost

## Your URLs After Deployment
- Cloud Run: https://nomad-app-[hash]-uc.a.run.app
- Firebase Hosting: https://nomad-navigator-xej23.web.app
- Firebase Hosting (alt): https://nomad-navigator-xej23.firebaseapp.com