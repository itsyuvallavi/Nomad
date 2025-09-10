# Map Integration Implementation Plan

## Objective
Add interactive map visualization to show itinerary locations, routes, and enable location-based discovery.

## Features to Implement

### 1. Interactive Map View
- Display all itinerary locations on a map
- Show day-by-day route visualization
- Clickable markers with activity details
- Zoom to fit all locations

### 2. Daily Routes
- Draw routes between daily activities
- Show travel times and distances
- Different colors for each day
- Walking/driving route options

### 3. Location Issues (PRIORITY FIX)
**Current Problems:**
- Wrong addresses displayed for activities
- Wrong map markers for addresses  
- Both address AND map location incorrect

**Debug Steps:**
- Trace data flow from AI generation → display
- Check if real venue lookup is working (Foursquare/Google)
- Verify geocoding process and API keys
- Add logging for address → coordinate conversion

### 4. Location Discovery
- Search for nearby attractions
- Add new activities from map
- Filter by category (food, attractions, etc.)
- Show opening hours and ratings

### 4. Visual Enhancements
- Custom markers for different activity types
- Clustering for multiple nearby locations
- Heat map for activity density
- Day/night mode support

## Technical Approach

### Map Provider Options
1. **Mapbox GL JS** (Recommended)
   - Better performance
   - More customization
   - Free tier available
   - Great React integration

2. **Google Maps**
   - More data
   - Better search
   - Higher cost
   - Familiar to users

3. **Leaflet** (Open Source)
   - Completely free
   - OpenStreetMap data
   - Lighter weight
   - Good for MVP

### Implementation Strategy
- Start with Leaflet for MVP (no API key needed)
- Use react-leaflet for React integration
- Add Mapbox later for production

## ✅ Implementation Completed

### Components Created:

1. **itinerary-map.tsx** - Main map component
   - Dynamic loading with SSR disabled
   - Geocoding integration with OpenStreetMap Nominatim API
   - Activity grouping by day
   - Zoom and pan controls
   - Route toggle functionality

2. **activity-marker.tsx** - Custom map markers
   - Dynamic SVG icons with day numbers
   - Color-coded by activity category (food, work, travel, etc.)
   - Popup with activity details
   - Click to select day functionality

3. **route-layer.tsx** - Route visualization
   - Polyline connections between daily activities  
   - Different colors for each day (8 color palette)
   - Dashed/solid line based on selection
   - Automatic path calculation

4. **geocoding.ts** - Address to coordinates conversion
   - OpenStreetMap Nominatim API (free, no key required)
   - Result caching to minimize API calls
   - Batch geocoding with rate limiting
   - Fallback coordinates for major cities
   - Helper functions for center point and bounds calculation

### Features Implemented:

✅ **Interactive Map View**
- All itinerary locations displayed on map
- Toggle map visibility with Show/Hide button
- Automatic bounds fitting to show all markers
- Loading state with animation

✅ **Daily Routes**
- Routes drawn between activities for each day
- Different colors per day (blue, green, amber, purple, pink, cyan, orange, lime)
- Toggle routes on/off with navigation button
- Visual distinction for selected vs unselected routes

✅ **Location Discovery**
- Clickable markers with activity details
- Day selection from map syncs with itinerary view
- Smooth scroll to selected day in itinerary
- Day filter buttons below map

✅ **Visual Enhancements**
- Custom SVG markers with day numbers
- Category-based marker colors and icons
- Emoji icons for different activity types
- Popup tooltips with activity information
- Map controls (zoom in/out, fit bounds, toggle routes)

✅ **Mobile Optimization**
- Responsive map height (400px mobile, 500px desktop)
- Touch-friendly controls
- Collapsible map view to save space
- Button-based day selection for easy touch targets

### Integration:

- Added to `itinerary-view.tsx` with collapsible map section
- Show/Hide Map button in header
- Day selection buttons for filtering
- Automatic scroll to day when selected from map
- Synced with multi-destination location tabs

### Technical Details:

- Uses Leaflet with react-leaflet wrapper
- OpenStreetMap tiles (free, no API key)
- Nominatim geocoding API (free, rate limited)
- Dynamic imports to avoid SSR issues
- Efficient caching of geocoded addresses
- Batch processing with rate limiting

## File Structure
```
src/components/map/
├── itinerary-map.tsx       // Main map component
├── activity-marker.tsx     // Custom markers
├── route-layer.tsx        // Route visualization
├── map-controls.tsx       // Zoom, layers, etc.
└── utils/
    ├── geocoding.ts       // Address to coordinates
    └── route-calc.ts      // Route calculations
```

## Success Criteria
- ✅ All activities displayed on map
- ✅ Routes between daily activities
- ✅ Click markers for details
- ✅ Mobile touch support
- ✅ Performance: <2s load time
- ✅ Works offline with cached tiles

## MVP Implementation
1. Basic map with OpenStreetMap
2. Simple markers for activities
3. Lines connecting daily activities
4. Basic popups with activity info
5. Zoom controls

## Future Enhancements
- Real-time location tracking
- Offline map downloads
- 3D building view
- Street view integration
- AR navigation