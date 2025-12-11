# Map Integration Implementation Plan

**Date**: December 11, 2025
**Status**: Planning
**Priority**: High

## Overview

Add an interactive map view to the itinerary display that shows:
- City location with pins for each day's activities
- Day-by-day activity markers with addresses
- City switcher for multi-city trips
- Synchronized selection between map and itinerary list

## Requirements

### Functional Requirements
1. **Map Display**
   - Show current city on map with proper zoom level
   - Display activity locations as numbered markers (matching day activities)
   - Show activity details on marker click/hover
   - Auto-center map on city when switching

2. **City Switching (Multi-City Trips)**
   - Toggle between cities for multi-city itineraries
   - Show only activities for the selected city
   - Maintain map state when switching cities

3. **Day Selection Integration**
   - Highlight activities for the selected day
   - Different marker colors/sizes for selected vs other days
   - Click marker to select that activity/day

4. **Mobile Responsive**
   - Map view works on mobile (collapsible or side panel)
   - Touch-friendly markers and controls

### Non-Functional Requirements
- Fast loading (<2s for map initialization)
- Smooth animations when switching cities/days
- Works offline (if possible with chosen library)
- Accessible (keyboard navigation, screen reader support)

## Technical Analysis

### Current Data Structure

From `src/services/ai/types/core.types.ts`, we already have coordinates in activities:

```typescript
interface Activity {
  time: string;
  description: string;
  venue_name?: string;
  category?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  rating?: number;
}

interface DayPlan {
  day: number;
  date: string;
  title: string;
  activities: Activity[];
}
```

✅ **Good news**: The enrichment pipeline already populates `coordinates` for activities via the HERE API!

### Map Library Options

#### Option 1: Google Maps (via @vis.gl/react-google-maps)
**Pros:**
- Already have Google API key in the project
- Excellent documentation and TypeScript support
- Rich ecosystem (Street View, Places integration)
- Familiar UI to most users

**Cons:**
- Requires API key with billing enabled
- Potential cost for high usage
- Heavier bundle size

**Cost Estimate:**
- Map loads: $7 per 1,000 loads
- Free tier: $200/month credit (~28k loads)

#### Option 2: Mapbox GL JS (with react-map-gl)
**Pros:**
- Modern, beautiful design
- Excellent performance
- Free tier: 50k loads/month
- Vector tiles (better mobile performance)
- Great React integration

**Cons:**
- Requires new API key
- Less familiar to users than Google Maps

#### Option 3: Leaflet (Open Source)
**Pros:**
- Free and open source
- Lightweight (~39KB)
- No API key needed for basic usage
- Good React wrapper (react-leaflet)

**Cons:**
- Requires tile provider (OpenStreetMap)
- Less polished UI than commercial options
- Limited built-in features

### **Recommendation: Google Maps**

**Reasoning:**
1. Already integrated (Google API key exists for Places/Geocoding)
2. Familiar UI increases user trust
3. Can reuse existing coordinates from HERE enrichment
4. Free tier is sufficient for current usage
5. Best TypeScript/React support

## Architecture Design

### Component Structure

```
ItineraryPanel
├── ItineraryHeader (existing)
├── DestinationSwitcher (existing - enhance for map sync)
├── DaySelector (new - unified day selection)
├── MapAndActivitiesView (new)
│   ├── ItineraryMap (new)
│   │   ├── GoogleMapWrapper (new)
│   │   ├── ActivityMarker[] (new)
│   │   └── MarkerInfoWindow (new)
│   └── DayActivities (existing - modified)
└── TravelTips (existing)
```

### New Components

#### 1. `ItineraryMap.tsx`
**Location**: `src/components/itinerary-components/map/ItineraryMap.tsx`

**Props**:
```typescript
interface ItineraryMapProps {
  city: string;
  activities: Activity[];  // All activities for the city
  selectedDay: number;     // Highlight this day's activities
  onActivityClick: (activityIndex: number, dayIndex: number) => void;
}
```

**Features**:
- Render Google Map centered on city
- Show markers for all activities with coordinates
- Highlight selected day's activities (different color/size)
- Show info window on marker click with activity details

#### 2. `ActivityMarker.tsx`
**Location**: `src/components/itinerary-components/map/ActivityMarker.tsx`

**Props**:
```typescript
interface ActivityMarkerProps {
  activity: Activity;
  dayNumber: number;
  activityNumber: number;
  isSelected: boolean;
  onClick: () => void;
}
```

**Features**:
- Custom marker with day number badge
- Different styles for selected vs unselected
- Show activity category icon

#### 3. `MapAndActivitiesView.tsx`
**Location**: `src/components/itinerary-components/map/MapAndActivitiesView.tsx`

**Responsibility**:
- Layout map and activities side-by-side (desktop) or stacked (mobile)
- Manage split panel resize
- Coordinate selection state between map and list

### State Management

**Approach**: Lift state to `ItineraryPanel` to coordinate between map and activities list.

```typescript
// In ItineraryPanel
const [selectedCity, setSelectedCity] = useState(0);
const [selectedDay, setSelectedDay] = useState(1);
const [selectedActivity, setSelectedActivity] = useState<number | null>(null);

// Pass down to both map and activities
<MapAndActivitiesView
  city={itinerary.cities[selectedCity]}
  selectedDay={selectedDay}
  selectedActivity={selectedActivity}
  onDaySelect={setSelectedDay}
  onActivitySelect={setSelectedActivity}
/>
```

### Data Flow

1. **City Selection** (for multi-city):
   - User clicks city in DestinationSwitcher
   - `setSelectedCity(index)` updates state
   - Map re-centers on new city
   - Activities list updates to show new city's days

2. **Day Selection**:
   - User clicks day tab or marker on map
   - `setSelectedDay(dayNumber)` updates state
   - Map highlights that day's markers
   - Activities list scrolls to that day

3. **Activity Selection**:
   - User clicks marker or activity card
   - `setSelectedActivity(index)` updates state
   - Map shows info window for that marker
   - Activity card highlights in list

## Implementation Steps

### Phase 1: Setup & Basic Map (2-3 hours)
1. ✅ Install dependencies
   ```bash
   npm install @vis.gl/react-google-maps
   ```

2. ✅ Create basic map component
   - Render map centered on city coordinates
   - Add API key from environment

3. ✅ Test with Brussels itinerary data

### Phase 2: Activity Markers (3-4 hours)
4. ✅ Create ActivityMarker component
   - Custom marker with number badge
   - Different colors for categories
   - Click handler

5. ✅ Render markers for all activities with coordinates
   - Group by day
   - Number markers sequentially

6. ✅ Add marker info window
   - Show activity name, time, address
   - "View details" link to scroll to activity

### Phase 3: Day Selection & Highlighting (2-3 hours)
7. ✅ Add day selector UI (tabs or dropdown)
   - Show all days for current city
   - Highlight selected day

8. ✅ Implement day highlighting
   - Different marker styles for selected day
   - Fade out non-selected days

9. ✅ Sync selection between map and activities list

### Phase 4: Multi-City Support (2-3 hours)
10. ✅ Enhance DestinationSwitcher
    - Parse multi-city destinations
    - Show city tabs/dropdown

11. ✅ Implement city switching
    - Re-center map on new city
    - Load activities for new city
    - Reset day selection

### Phase 5: Polish & Mobile (2-3 hours)
12. ✅ Responsive layout
    - Side-by-side on desktop
    - Stacked on mobile
    - Collapsible map panel

13. ✅ Animations & transitions
    - Smooth map pan/zoom
    - Fade markers in/out

14. ✅ Accessibility
    - Keyboard navigation
    - Screen reader labels

### Phase 6: Testing & Edge Cases (1-2 hours)
15. ✅ Test with various scenarios
    - Single city trip
    - Multi-city trip
    - Activities without coordinates
    - Mobile devices

16. ✅ Handle edge cases
    - Missing coordinates (show city center)
    - No activities for a day
    - API key errors

## File Structure

```
src/
├── components/
│   └── itinerary-components/
│       ├── map/
│       │   ├── ItineraryMap.tsx           (NEW)
│       │   ├── ActivityMarker.tsx         (NEW)
│       │   ├── MarkerInfoWindow.tsx       (NEW)
│       │   ├── MapAndActivitiesView.tsx   (NEW)
│       │   └── __tests__/
│       │       └── ItineraryMap.test.tsx  (NEW)
│       └── itinerary/
│           └── ItineraryDisplay/
│               ├── index.tsx              (MODIFY - integrate map)
│               ├── DestinationSwitcher.tsx (MODIFY - enhance)
│               └── DayActivities.tsx      (MODIFY - sync with map)
└── lib/
    └── utils/
        └── map-helpers.ts                 (NEW - helper functions)
```

## API Integration

### Google Maps API Setup

1. **Enable APIs** (already done):
   - Maps JavaScript API
   - Places API (already enabled)

2. **Environment Variables**:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<existing-key>
   ```

3. **Map Configuration**:
   ```typescript
   const mapConfig = {
     center: { lat: cityLat, lng: cityLng },
     zoom: 13, // City level
     mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID, // For custom styling
     gestureHandling: 'greedy', // Allow one-finger pan on mobile
     disableDefaultUI: true, // Custom controls
     zoomControl: true,
   };
   ```

## Edge Cases & Error Handling

### Missing Coordinates
**Problem**: Activity doesn't have coordinates (enrichment failed)
**Solution**:
- Don't show marker for that activity
- Show warning icon in activity card
- Fallback to city center if NO activities have coordinates

### API Key Issues
**Problem**: Google Maps API key invalid or quota exceeded
**Solution**:
- Show static map image as fallback (OpenStreetMap)
- Display error message to user
- Log error for monitoring

### Mobile Performance
**Problem**: Map is slow on older mobile devices
**Solution**:
- Lazy load map (only render when tab is visible)
- Reduce marker count (cluster nearby activities)
- Use simpler marker icons on mobile

## Testing Strategy

### Unit Tests
- Map renders with correct center/zoom
- Markers render for all activities with coordinates
- Clicking marker calls correct handler
- City switching updates map center

### Integration Tests
- Day selection syncs between map and list
- Multi-city switching works correctly
- Mobile responsive layout switches properly

### Manual Testing Checklist
- [ ] Single city trip displays correctly
- [ ] Multi-city trip shows city switcher
- [ ] Day selection highlights correct markers
- [ ] Marker click selects activity in list
- [ ] Map works on mobile (iPhone, Android)
- [ ] Works with 0, 1, and 10+ activities per day
- [ ] Handles missing coordinates gracefully

## Performance Considerations

### Bundle Size Impact
- `@vis.gl/react-google-maps`: ~50KB gzipped
- Google Maps JS API: ~400KB (loaded from CDN)
- **Total added**: ~450KB

### Optimization Strategies
1. **Code Splitting**: Lazy load map component
   ```typescript
   const ItineraryMap = dynamic(() => import('./map/ItineraryMap'), {
     loading: () => <MapSkeleton />,
     ssr: false
   });
   ```

2. **Marker Clustering**: For 20+ activities, use marker clustering
3. **Debounce**: Debounce map pan/zoom events

## Future Enhancements (Out of Scope)

- Route visualization (draw lines between activities)
- Traffic layer (show current traffic)
- Street View preview on marker click
- Custom map styling to match app theme
- Offline map tiles (Progressive Web App)
- Export map as image/PDF

## Success Metrics

1. **User Engagement**
   - % of users who interact with map
   - Average time spent on map view

2. **Performance**
   - Map load time < 2 seconds
   - Time to first marker < 1 second

3. **Error Rates**
   - API errors < 1%
   - Missing coordinates < 10%

## Timeline Estimate

**Total Development Time**: 12-18 hours (1.5-2 days)

- Phase 1: Setup - 2-3 hours
- Phase 2: Markers - 3-4 hours
- Phase 3: Selection - 2-3 hours
- Phase 4: Multi-city - 2-3 hours
- Phase 5: Polish - 2-3 hours
- Phase 6: Testing - 1-2 hours

**Recommended Approach**:
- Start with Phase 1-2 (basic map + markers)
- Get user feedback
- Iterate on Phases 3-6

## Questions to Resolve

1. **Map Position**: Side panel, overlay, or separate tab?
   - **Recommendation**: Side panel on desktop (60/40 split), bottom sheet on mobile

2. **Default View**: Map or list?
   - **Recommendation**: List on mobile, map + list on desktop

3. **Marker Clustering**: Enable for 20+ activities?
   - **Recommendation**: Yes, but only if performance is an issue

4. **Day Filtering**: Show all days or only selected day on map?
   - **Recommendation**: Show all days with selected day highlighted (better context)

---

**Next Steps**:
1. Review and approve this plan
2. Start Phase 1: Install dependencies and create basic map
3. Test with real Brussels itinerary data
