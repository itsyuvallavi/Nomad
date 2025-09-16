# /app - Next.js App Router

This directory contains the **Next.js 13+ App Router** files for routing and page rendering.

## ✅ What belongs here:
- `page.tsx` files (route definitions)
- `layout.tsx` files (layout wrappers)
- `loading.tsx` files (loading states)
- `error.tsx` files (error boundaries)
- Route handlers (`route.ts` in API routes)
- Metadata configuration

## ❌ What does NOT belong here:
- Complex page components (use `/pages`)
- Reusable components (use `/components`)
- Business logic (use `/services`)
- Utility functions (use `/lib`)

## 📁 Structure:

```
/app/
  layout.tsx          # Root layout
  page.tsx           # Home page route
  /api/              # API routes
    /[endpoint]/
      route.ts
  /[route]/          # Other routes
    page.tsx
```

## How it works with `/pages`:
1. Route files here (`page.tsx`) are thin wrappers
2. They import the actual page component from `/pages`
3. Example:
   ```tsx
   // app/page.tsx
   import HomePage from '@/pages/home/HomePage';
   export default HomePage;
   ```

## File Types:

### `page.tsx`
- Defines a route
- Should be minimal - just imports and renders page component

### `layout.tsx`
- Wraps child routes
- Provides common layout elements

### `loading.tsx`
- Loading UI while page loads

### `error.tsx`
- Error boundary for the route

### `route.ts`
- API route handlers
- Server-side endpoints

## Examples:
- ✅ Simple page.tsx that imports from /pages
- ✅ API route handler
- ✅ Root layout with providers
- ❌ Complex page logic (→ `/pages`)
- ❌ Reusable components (→ `/components`)
- ❌ API integration logic (→ `/services`)