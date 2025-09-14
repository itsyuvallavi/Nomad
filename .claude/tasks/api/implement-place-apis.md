# Task: Implement Place and Weather APIs

## Status: TODO

## Overview
We have several API services that are built but not integrated into the main application. These should be implemented to enhance the user experience.

## APIs to Implement

### 1. Static Places API (`/services/api/static-places.ts`)
- **Purpose**: Provides offline/testing capability without API costs
- **Features**:
  - Uses pre-generated activity data from `data/static/static-activities.json`
  - Returns hardcoded venues for major cities
  - No API calls required
- **Use Cases**:
  - Testing without consuming API quota
  - Offline mode functionality
  - Fallback when APIs are down
- **Integration Points**:
  - Could be used in `simple-generator.ts` as a fallback
  - Useful for development/testing environments

### 2. Unified Places API (`/services/api/places-unified-locationiq.ts`)
- **Purpose**: Clean, unified interface for place searches using LocationIQ
- **Features**:
  - Dynamic, real-time venue data
  - Returns coordinates, ratings, photos
  - Consistent interface across different venue types
- **Use Cases**:
  - Enhanced venue search in itinerary generation
  - Better activity recommendations
  - More detailed place information
- **Integration Points**:
  - Could replace or enhance current LocationIQ usage
  - Integrate into `location-enrichment-locationiq.ts`

### 3. Weather API (`/services/api/weather.ts`)
- **Purpose**: Provide weather information for trip planning
- **Features**:
  - Current weather conditions
  - Weather forecasts
  - Climate data for destinations
- **Use Cases**:
  - Show weather in itinerary view
  - Help users pack appropriately
  - Suggest indoor/outdoor activities based on weather
- **Integration Points**:
  - Add weather data to itinerary generation
  - Display in itinerary view component
  - Include in trip recommendations

## Implementation Steps

### Phase 1: Static Places (Quick Win)
1. Add toggle in settings for "Offline Mode"
2. Modify `simple-generator.ts` to check offline mode
3. If offline, use `static-places.ts` instead of API calls
4. Test with sample cities

### Phase 2: Weather Integration
1. Add weather field to itinerary schema
2. Call weather API during itinerary generation
3. Add weather display to `itinerary-view.tsx`
4. Show weather icons and temperature for each day

### Phase 3: Unified Places Enhancement
1. Replace current LocationIQ calls with unified interface
2. Add more detailed venue information to itineraries
3. Implement venue photo fetching
4. Add venue ratings and reviews

## Benefits
- **Reduced API Costs**: Static fallback reduces API usage
- **Better UX**: Weather and detailed venue info
- **Offline Capability**: App works without internet
- **Development Speed**: Test without API limits

## Testing Approach
1. Start with static places in dev environment
2. A/B test unified places vs current implementation
3. Monitor API usage and costs
4. Gather user feedback on weather feature

## Priority: Medium
These features would enhance the app but aren't critical for core functionality.

## Estimated Effort
- Static Places: 2-3 hours
- Weather Integration: 3-4 hours
- Unified Places: 4-5 hours

## Notes
- All API services are already built and tested
- Just need integration into main app flow
- Consider feature flags for gradual rollout