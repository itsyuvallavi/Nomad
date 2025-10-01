# Next.js App Router

## Overview

This directory contains the Next.js 13+ App Router structure for routing, layouts, and API endpoints.

## Directory Structure

```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx               # Home page (/)
├── globals.css            # Global styles
├── api/                   # API routes
│   ├── ai/               # AI endpoint (/api/ai)
│   │   └── route.ts
│   └── feedback/         # Feedback endpoint (/api/feedback)
│       └── route.ts
├── favorites/            # Favorites page
│   └── page.tsx
├── profile/              # User profile
│   └── page.tsx
├── settings/             # App settings
│   └── page.tsx
└── trips/                # Saved trips
    └── page.tsx
```

## App Router Conventions

### Page Routes (`page.tsx`)

Each `page.tsx` file creates a route:

- `app/page.tsx` → `/`
- `app/profile/page.tsx` → `/profile`
- `app/trips/page.tsx` → `/trips`

### API Routes (`route.ts`)

API endpoints use `route.ts` files:

```typescript
// app/api/ai/route.ts
export async function POST(request: NextRequest) {
  // Handle POST /api/ai
}

export async function GET(request: NextRequest) {
  // Handle GET /api/ai
}
```

**Current API Endpoints:**
- `POST /api/ai` - Conversational itinerary generation with OSM data
- `POST /api/feedback` - User feedback submission

### Layouts (`layout.tsx`)

The root layout wraps all pages:

```typescript
// app/layout.tsx
export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

## Key Files

### Root Layout (`layout.tsx`)

- Wraps entire application
- Includes providers (Auth, Theme, etc.)
- Sets metadata and viewport
- Loads global styles

### Home Page (`page.tsx`)

- Landing page with trip planning form
- Delegates to `HomePage` component
- Protected by auth (redirects if not logged in)

### API Route (`api/ai/route.ts`)

- Simplified endpoint (was `/api/ai/generate-itinerary-v2`)
- Handles conversational AI flow
- Returns real venues from OpenStreetMap
- 60-second timeout for generation

## Page Components

### ✅ What Belongs Here

- Minimal route definitions
- Metadata exports
- Layout wrappers
- Loading/Error boundaries
- Route handlers

### ❌ What Does NOT Belong Here

- Complex page logic → Use `/pages` components
- Reusable components → Use `/components`
- Business logic → Use `/services`
- API logic → Delegate to services

## Routing Examples

### Static Routes

```typescript
// app/profile/page.tsx
export default function ProfilePage() {
  return <ProfilePageComponent />;
}
```

### Dynamic Routes

```typescript
// app/trips/[id]/page.tsx
export default function TripPage({
  params
}: {
  params: { id: string }
}) {
  return <TripDetails tripId={params.id} />;
}
```

### API Routes

```typescript
// app/api/ai/route.ts
import { itineraryAPIHandler } from '@/services/ai/api-handler';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Delegate to service
  const result = await itineraryAPIHandler.processRequest(body);

  return NextResponse.json(result);
}
```

## Metadata Configuration

```typescript
// app/layout.tsx or page.tsx
export const metadata = {
  title: 'Nomad Navigator',
  description: 'AI-powered travel planning with real venues',
  icons: {
    icon: '/logo.ico'
  }
};
```

## Performance Optimizations

### Route Segment Config

```typescript
// In route.ts files
export const runtime = 'nodejs';  // or 'edge'
export const dynamic = 'force-dynamic';
export const revalidate = 3600;  // ISR revalidation
export const maxDuration = 60;   // Function timeout
```

### Loading States

```typescript
// app/trips/loading.tsx
export default function Loading() {
  return <TripsSkeleton />;
}
```

### Error Handling

```typescript
// app/trips/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ErrorComponent error={error} retry={reset} />;
}
```

## Best Practices

1. **Keep pages minimal** - Delegate to page components
2. **Use services for logic** - Don't put business logic here
3. **Proper error boundaries** - Add error.tsx files
4. **Loading states** - Add loading.tsx for better UX
5. **Metadata for SEO** - Export metadata from pages

## Environment Variables

The app uses these environment variables:

```bash
# Required for AI features
OPENAI_API_KEY=xxx

# Firebase configuration (public)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
# ... etc

# Optional
LOCATIONIQ_API_KEY=xxx
OPENWEATHERMAP=xxx
```

## Development

```bash
# Run development server
npm run dev

# App runs on http://localhost:9002
```

## Future Enhancements

- [ ] Add middleware for auth protection
- [ ] Implement route groups for organization
- [ ] Add parallel routes for modals
- [ ] Implement intercepting routes
- [ ] Add server actions for forms