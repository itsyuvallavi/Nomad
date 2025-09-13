# Performance Optimization Plan
**Date:** 2025-01-13  
**Status:** TODO  
**Priority:** HIGH  

## Problem Statement
The Nomad Navigator app is experiencing slow performance despite previous optimization efforts. Users report the site feels sluggish, and Lighthouse tests indicate performance issues.

## Current State Analysis

### Symptoms
1. Slow initial page load
2. Heavy JavaScript bundles (544 KB First Load JS on home page)
3. Development server shows warnings about:
   - Handlebars/webpack compatibility issues
   - Headers not working with static export (though we removed static export)
4. Large component sizes visible in build output

### Potential Causes
1. **Heavy Dependencies**
   - Genkit AI libraries loading unnecessarily on client
   - Multiple UI libraries (Radix UI, Framer Motion, React Icons)
   - Amadeus SDK and other API clients bundled client-side

2. **Missing Optimizations**
   - No code splitting for routes
   - No lazy loading for heavy components
   - AI flows possibly loading on initial render
   - All Radix UI components imported eagerly

3. **Development vs Production**
   - Currently testing in development mode (slower)
   - React dev tools and hot reload overhead
   - Source maps and debugging code included

## Optimization Strategy

### Phase 1: Immediate Quick Wins (30 mins)
1. **Dynamic Imports for Heavy Components**
   ```typescript
   // Before
   import ChatDisplay from '@/components/chat/chat-container';
   
   // After
   const ChatDisplay = dynamic(() => import('@/components/chat/chat-container'), {
     loading: () => <LoadingSpinner />,
     ssr: false
   });
   ```

2. **Move AI Flows to Server-Only**
   - Add 'use server' directive to AI flow files
   - Ensure they're not bundled client-side
   - Use API routes for AI operations

3. **Optimize Bundle Analyzer**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```
   - Analyze what's making bundles large
   - Identify unnecessary dependencies

### Phase 2: Component-Level Optimizations (1 hour)
1. **Lazy Load Route Components**
   ```typescript
   // In app/trips/page.tsx
   const TripsContent = dynamic(() => import('./TripsContent'), {
     loading: () => <TripsLoading />
   });
   ```

2. **Split Radix UI Imports**
   ```typescript
   // Instead of importing all at once
   import * as Dialog from '@radix-ui/react-dialog';
   
   // Import only what's needed
   import { Root, Trigger, Content } from '@radix-ui/react-dialog';
   ```

3. **Optimize Images**
   - Use Next.js Image component with lazy loading
   - Implement blur placeholders
   - Optimize image sizes

### Phase 3: API and Data Optimizations (1 hour)
1. **Move Heavy Operations Server-Side**
   - Amadeus API calls
   - OpenAI operations
   - Firestore queries

2. **Implement Proper Caching**
   ```typescript
   // Add to API routes
   export const revalidate = 3600; // Cache for 1 hour
   ```

3. **Use React Suspense**
   ```typescript
   <Suspense fallback={<Loading />}>
     <HeavyComponent />
   </Suspense>
   ```

### Phase 4: Production Build Optimizations (30 mins)
1. **Update next.config.ts**
   ```typescript
   const nextConfig: NextConfig = {
     // ... existing config
     
     // Add production optimizations
     compiler: {
       removeConsole: process.env.NODE_ENV === 'production',
     },
     
     // Enable SWC minification
     swcMinify: true,
     
     // Optimize for production
     productionBrowserSourceMaps: false,
     
     // Module federation for code splitting
     experimental: {
       optimizeCss: true,
       optimizePackageImports: ['lucide-react', '@radix-ui/*'],
     }
   };
   ```

2. **Optimize package.json scripts**
   ```json
   {
     "scripts": {
       "build:prod": "NODE_ENV=production next build",
       "start:prod": "NODE_ENV=production next start",
       "analyze": "ANALYZE=true next build"
     }
   }
   ```

## Implementation Steps

### Step 1: Analyze Current Bundle
```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Run analysis
ANALYZE=true npm run build
```

### Step 2: Implement Dynamic Imports
1. Start with heaviest components:
   - ChatContainer
   - ItineraryDisplay
   - MapComponents
   - AI-related components

### Step 3: Optimize Dependencies
1. Check if we can tree-shake:
   - Amadeus SDK
   - Genkit libraries
   - Unused Radix components

### Step 4: Server-Side Optimizations
1. Move AI flows to API routes
2. Implement edge functions for faster responses
3. Add caching headers

### Step 5: Test Performance
```bash
# Build for production
npm run build:prod

# Start production server
npm run start:prod

# Run Lighthouse
npx lighthouse http://localhost:3000 --view
```

## Success Metrics
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Total Bundle Size < 300KB
- [ ] Lighthouse Performance Score > 80

## Risk Mitigation
1. **Test each optimization separately**
2. **Keep backup of current working state**
3. **Monitor for functionality breaks**
4. **Use feature flags for gradual rollout**

## Files to Modify
1. `/src/app/page.tsx` - Add dynamic imports
2. `/src/components/chat/chat-container.tsx` - Lazy load
3. `/src/ai/flows/*.ts` - Add 'use server' directive
4. `/next.config.ts` - Add optimization flags
5. `/src/app/api/` - Move AI operations here

## Testing Checklist
- [ ] All pages load without errors
- [ ] AI chat functionality works
- [ ] Trip creation/saving works
- [ ] Cross-device sync works
- [ ] No console errors in production
- [ ] Lighthouse score improved

## Rollback Plan
If optimizations break functionality:
1. Revert git commits
2. Remove dynamic imports
3. Restore original imports
4. Re-test basic functionality

## Notes
- Current First Load JS: 544 KB (way too high)
- Target First Load JS: < 200 KB
- Development mode is always slower - test in production
- Consider using Vercel's Edge Runtime for API routes