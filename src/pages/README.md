# /pages - Page Components

This directory contains **page-level components** and their specific sub-components.

## ✅ What belongs here:
- Full page components
- Page-specific components that aren't reused
- Page-specific logic and state
- Components tightly coupled to a specific page

## ❌ What does NOT belong here:
- Reusable UI components (use `/components`)
- Utility functions (use `/lib`)
- API services (use `/services`)
- Next.js route files (use `/app`)

## 📁 Subdirectories:

### `/home`
Home/landing page
- `HomePage.tsx` - Main home page component
- `/components`
  - `TripPlanningForm.tsx` - Trip planning form specific to home

### `/itinerary`
Itinerary/trip display page
- `ItineraryPage.tsx` - Main itinerary page
- `/components`
  - `/chat` - Chat interface components
  - `/itinerary` - Itinerary display components
  - `/map` - Map visualization components

## Structure Pattern:
```
/pages/
  /[page-name]/
    [PageName]Page.tsx         # Main page component
    /components/               # Page-specific components
      [Component].tsx
```

## Important Note:
This is NOT the Next.js `/app` directory. These are React components that represent full pages but are imported by the actual Next.js route files in `/app`.

## Examples:
- ✅ HomePage component
- ✅ ItineraryPage component
- ✅ Page-specific forms
- ✅ Page-specific display components
- ❌ Shared button (→ `/components/ui`)
- ❌ Auth context (→ `/infrastructure/contexts`)
- ❌ API calls (→ `/services`)