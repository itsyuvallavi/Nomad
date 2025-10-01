# Pages Directory

Page-level components and their specific sub-components.

## Directory Structure

```
pages/
├── home/                           # Home/landing page
│   ├── HomePage.tsx               # Main home page component
│   └── components/                # Home-specific components
│       └── TripPlanningForm.tsx   # Trip planning form
└── itinerary/                     # Itinerary display page
    ├── ItineraryPage.tsx          # Main itinerary page
    └── components/                # Itinerary-specific components
        ├── chat/                  # Chat interface
        │   ├── ChatPanel.tsx      # Main chat panel
        │   ├── LoadingProgress.tsx # Loading indicator
        │   └── hooks/
        │       └── use-chat-state.ts # Chat state hook
        └── itinerary/             # Itinerary display
            ├── ItineraryDisplay.tsx # Main display
            ├── DayTimeline.tsx    # Day timeline view
            ├── Day-schedule.tsx   # Daily schedule
            ├── Activity-card.tsx  # Activity cards
            ├── Coworking-spots.tsx # Coworking locations
            ├── Export-menu.tsx    # Export options
            └── Loading-skeleton.tsx # Loading state
```

## What Belongs Here

✅ **DO** place here:
- Full page components (HomePage, ItineraryPage, etc.)
- Page-specific components not used elsewhere
- Page-specific business logic and state management
- Components tightly coupled to a specific page
- Page-specific hooks and utilities

❌ **DON'T** place here:
- Reusable UI components → Use `src/components/`
- Shared utilities → Use `src/lib/utils/`
- API services → Use `src/services/`
- Next.js route files → Use `src/app/`
- Global contexts → Use `src/infrastructure/contexts/`

## Architecture Pattern

Each page follows this structure:
```
/[page-name]/
  ├── [PageName]Page.tsx    # Main page component
  └── components/           # Page-specific components
      └── [Component].tsx   # Individual components
```

## Important Notes

1. **Not Next.js Routes**: This is NOT the Next.js `/app` directory. These are React components imported by the actual route files in `/app`.

2. **Page Isolation**: Components in a page's `/components` folder should ONLY be used by that page.

3. **Component Promotion**: If a page-specific component needs to be shared, move it to `/components`.

## Usage Examples

```tsx
// In src/app/page.tsx (Next.js route)
import HomePage from '@/pages/home/HomePage';

export default function HomeRoute() {
  return <HomePage />;
}
```

```tsx
// In src/app/itinerary/page.tsx (Next.js route)
import ItineraryPage from '@/pages/itinerary/ItineraryPage';

export default function ItineraryRoute() {
  return <ItineraryPage />;
}
```

## Page Components

### Home Page (`/home`)
The main landing page where users start their trip planning journey. Contains the trip planning form and initial user interactions.

### Itinerary Page (`/itinerary`)
Displays generated itineraries with interactive chat interface for refinements. Includes:
- **Chat Panel**: AI-powered chat for itinerary modifications
- **Itinerary Display**: Visual representation of the trip plan
- **Activity Management**: Cards and timelines for daily activities
- **Export Options**: Various export formats for the itinerary

## Migration Notes

When Next.js App Router pages grow complex, extract their logic into this pages directory to maintain clean route files and better component organization.