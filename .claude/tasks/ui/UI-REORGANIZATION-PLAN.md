# UI File Reorganization Plan

## Current Issues Identified

### 1. Misleading File Names
- **`trip-search-form.tsx`** - Actually the homepage/start screen, not just a form
- **`trip-details-form.tsx`** - The actual trip form component used within homepage
- **`chat-container-v2.tsx`** - The main itinerary/chat page, not just a container
- **`chat-interface.tsx`** - The actual chat panel within the itinerary page

### 2. Unclear Component Organization
- Pages and components mixed together in `/components` folder
- No clear separation between page-level components and reusable components
- Components scattered across different folders without clear logic

### 3. Confusing Import Paths
- Components importing from multiple nested levels
- No clear hierarchy visible from imports

## Proposed New Structure

```
src/
├── app/
│   ├── page.tsx                    # Main app router (unchanged)
│   └── layout.tsx                  # App layout (unchanged)
│
├── pages/                          # NEW: Full page components
│   ├── home/
│   │   ├── HomePage.tsx            # Was: trip-search-form.tsx
│   │   └── components/
│   │       ├── TripPlanningForm.tsx    # Was: trip-details-form.tsx
│   │       ├── RecentTrips.tsx         # Extract from HomePage
│   │       └── WelcomeSection.tsx      # Extract from HomePage
│   │
│   └── itinerary/
│       ├── ItineraryPage.tsx          # Was: chat-container-v2.tsx
│       └── components/
│           ├── ChatPanel.tsx           # Was: chat-interface.tsx
│           ├── ItineraryDisplay.tsx    # Was: itinerary-view.tsx
│           ├── MapView.tsx             # Was: map-panel.tsx
│           └── LoadingProgress.tsx     # Was: modern-loading-panel.tsx
│
└── components/                     # Reusable components only
    ├── ui/                         # Keep as-is (shadcn components)
    ├── map/                        # Reusable map components
    │   ├── ActivityMarker.tsx
    │   ├── RouteLayer.tsx
    │   └── utils/
    │
    ├── itinerary/                  # Reusable itinerary components
    │   ├── ActivityCard.tsx
    │   ├── DaySchedule.tsx
    │   ├── DayTimeline.tsx         # Was: day-timeline-v2.tsx
    │   ├── ExportMenu.tsx
    │   └── CoworkingSpots.tsx
    │
    ├── forms/                      # Generic form components
    │   └── (move generic form components here)
    │
    └── navigation/                 # Keep as-is
        └── Header.tsx
```

## File Renaming Map

### Pages
| Current File | New File | Purpose |
|-------------|----------|---------|
| `components/forms/trip-search-form.tsx` | `pages/home/HomePage.tsx` | Main landing page |
| `components/forms/trip-details-form.tsx` | `pages/home/components/TripPlanningForm.tsx` | Trip planning form |
| `components/chat/chat-container-v2.tsx` | `pages/itinerary/ItineraryPage.tsx` | Main itinerary/chat page |
| `components/chat/chat-interface.tsx` | `pages/itinerary/components/ChatPanel.tsx` | Chat conversation panel |
| `components/itinerary/itinerary-view.tsx` | `pages/itinerary/components/ItineraryDisplay.tsx` | Itinerary display panel |
| `components/map/map-panel.tsx` | `pages/itinerary/components/MapView.tsx` | Map visualization panel |
| `components/chat/modern-loading-panel.tsx` | `pages/itinerary/components/LoadingProgress.tsx` | Loading state component |

### Components
| Current File | New File | Purpose |
|-------------|----------|---------|
| `components/itinerary/day-timeline-v2.tsx` | `components/itinerary/DayTimeline.tsx` | Day timeline component |
| `components/itinerary/activity-card.tsx` | `components/itinerary/ActivityCard.tsx` | Keep as-is |
| `components/itinerary/day-schedule.tsx` | `components/itinerary/DaySchedule.tsx` | Keep as-is |
| `components/map/activity-marker.tsx` | `components/map/ActivityMarker.tsx` | Keep as-is |
| `components/map/route-layer.tsx` | `components/map/RouteLayer.tsx` | Keep as-is |

## Import Updates Required

### In `app/page.tsx`
```typescript
// OLD
const StartItinerary = dynamic(() => import('@/components/forms/trip-search-form'))
const ChatDisplay = dynamic(() => import('@/components/chat/chat-container-v2'))

// NEW
const HomePage = dynamic(() => import('@/pages/home/HomePage'))
const ItineraryPage = dynamic(() => import('@/pages/itinerary/ItineraryPage'))
```

### Component References
- Update all imports throughout the codebase
- Update type imports from moved files
- Update relative imports within moved components

## Implementation Steps

### Phase 1: Create New Structure (No Breaking Changes)
1. Create `/src/pages` directory structure
2. Create subdirectories for `home` and `itinerary`
3. Copy files to new locations with new names
4. Update imports within copied files

### Phase 2: Update References
1. Update `app/page.tsx` to import from new locations
2. Update all component imports
3. Test application thoroughly

### Phase 3: Cleanup
1. Remove old files from `/components/forms` and `/components/chat`
2. Move reusable components to appropriate folders
3. Clean up any remaining references

## Benefits

1. **Clear Page vs Component Separation**: Pages folder contains full-page components, components folder has only reusable pieces
2. **Intuitive Naming**: File names match their actual purpose (HomePage, ItineraryPage, etc.)
3. **Better Organization**: Related components grouped together under their parent page
4. **Easier Navigation**: Developers can quickly find files based on functionality
5. **Scalable Structure**: Easy to add new pages and their components

## Naming Conventions Going Forward

### Pages
- Use `[PageName]Page.tsx` format (e.g., `HomePage.tsx`, `ProfilePage.tsx`)
- Place in `/pages/[page-name]/` folder

### Page-Specific Components
- Place in `/pages/[page-name]/components/`
- Use descriptive names (e.g., `TripPlanningForm.tsx`, `ChatPanel.tsx`)

### Reusable Components
- Keep in `/components/[category]/`
- Use generic, reusable names (e.g., `ActivityCard.tsx`, `LoadingSpinner.tsx`)

### Utils and Helpers
- Keep in `/lib/` or within component folders as `utils/`
- Use lowercase with hyphens (e.g., `date-parser.ts`, `geocoding.ts`)

## Testing Strategy

1. Create parallel structure first (don't delete old files)
2. Update imports one at a time
3. Test each major component after moving
4. Run full application tests
5. Only delete old files after confirming everything works

## Rollback Plan

If issues arise:
1. Keep git commits atomic (one component move per commit)
2. Can revert individual moves if needed
3. Old structure remains until Phase 3 completion