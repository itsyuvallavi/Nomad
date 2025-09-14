# LocationIQ Implementation Plan

## Overview
Replace Radar and Google Maps/Places APIs with LocationIQ throughout the Nomad Navigator codebase.

## Current State Analysis

### APIs Currently in Use:
1. **Radar API** (`src/services/api/radar.ts`)
   - Places search
   - Geocoding (basic city coordinates)
   - Chain/category search
   - Used in map visualization

2. **Google Places API** (`src/services/api/google-places.ts`)
   - Venue search
   - Geocoding
   - Place details (ratings, photos, opening hours)
   - Used for activity generation

3. **Map Components** (`src/features/map/`)
   - `radar-map.tsx` - Uses Radar Maps or OSM fallback
   - Geocoding utilities for coordinate lookup

## LocationIQ Features to Implement

### 1. Core Services
- **Geocoding (Forward & Reverse)**: Convert addresses ↔ coordinates
- **Places Search**: Find venues, restaurants, attractions
- **Autocomplete**: Location suggestions for user input
- **Map Tiles**: Visual map display
- **Routing**: Calculate routes between activities (if needed)

### 2. Implementation Structure

```
src/services/api/
├── locationiq.ts          # Main LocationIQ service
├── locationiq-places.ts   # Places search wrapper
└── locationiq-geocoding.ts # Geocoding utilities
```

## Phase 1: Core Service Setup

### 1.1 Create LocationIQ Base Service
**File**: `src/services/api/locationiq.ts`
- API client setup with key management
- Rate limiting (60 req/sec for free tier, 300 req/sec for paid)
- Error handling and retry logic
- Request queue management

### 1.2 Implement Geocoding Service
**File**: `src/services/api/locationiq-geocoding.ts`
- Forward geocoding (address → coordinates)
- Reverse geocoding (coordinates → address)
- Batch geocoding support
- Cache frequently used locations

### 1.3 Implement Places Service
**File**: `src/services/api/locationiq-places.ts`
- Nearby search (POI around coordinates)
- Category-based search
- Text search for specific venues
- Place details retrieval

## Phase 2: Service Integration

### 2.1 Replace in AI Flows
**Files to Update**:
- `src/services/ai/flows/generate-personalized-itinerary.ts`
- `src/services/ai/utils/unified-generator.ts`
- `src/services/ai/services/location-enrichment.ts`

**Changes**:
- Replace Google Places calls with LocationIQ
- Update activity enrichment to use LocationIQ POI data
- Adapt response schemas to LocationIQ format

### 2.2 Update Places Unified Service
**File**: `src/services/api/places-unified.ts`
- Add LocationIQ as primary provider
- Keep static data as fallback
- Remove Google Places and Radar dependencies

### 2.3 Update API Configuration
**File**: `src/lib/constants/api-config.ts`
- Add LocationIQ configuration
- Update data source logging
- Remove Radar/Google references

## Phase 3: Map Component Migration

### 3.1 Create LocationIQ Map Component
**File**: `src/features/map/components/locationiq-map.tsx`
- Use LocationIQ map tiles
- Implement marker placement
- Add route visualization
- Support day selection

### 3.2 Update Map Integration Points
**Files**:
- `src/features/map/components/itinerary-map.tsx`
- `src/features/map/components/map-panel.tsx`
- Remove `radar-map.tsx` references

### 3.3 Update Geocoding Utilities
**File**: `src/features/map/utils/geocoding.ts`
- Use LocationIQ geocoding
- Update coordinate lookup logic

## Phase 4: Environment & Configuration

### 4.1 Environment Variables
**Update `.env`**:
```env
LOCATIONIQ_API_KEY=your_key_here
# Remove:
# GOOGLE_API_KEY=...
# RADR_API_KEY=...
```

### 4.2 Update Documentation
- Update `CLAUDE.md` with LocationIQ details
- Update README with new setup instructions
- Document API limits and best practices

## Phase 5: Testing & Cleanup

### 5.1 Testing Strategy
- Test geocoding accuracy
- Verify places search quality
- Check map rendering
- Validate AI flow integration
- Run full baseline tests

### 5.2 Cleanup
- Remove unused Radar files
- Remove Google Places files
- Clean up unused dependencies
- Update package.json

## LocationIQ API Mappings

### Category Mappings (Radar → LocationIQ)
```javascript
{
  'restaurant': 'restaurant',
  'cafe': 'cafe',
  'bar': 'bar,pub,nightclub',
  'hotel': 'hotel,motel',
  'museum': 'museum',
  'attraction': 'attraction,tourism',
  'shopping': 'shop,mall',
  'park': 'park',
  'entertainment': 'entertainment,theatre,cinema',
  'nightlife': 'nightclub,bar',
  'gym': 'fitness_centre,sports_centre',
  'spa': 'spa',
  'bank': 'bank,atm',
  'grocery': 'supermarket,convenience'
}
```

### Response Format Adaptation
LocationIQ returns different response structure:
- `osm_id` instead of `place_id`
- `display_name` instead of `formatted_address`
- `lat/lon` instead of nested `geometry.location`
- `extratags` for additional metadata

## Implementation Priority

1. **Critical** (Day 1):
   - LocationIQ base service
   - Geocoding implementation
   - Basic places search

2. **Important** (Day 2):
   - AI flow integration
   - Map component creation
   - Testing setup

3. **Nice to Have** (Day 3):
   - Advanced features (routing, autocomplete)
   - Performance optimizations
   - Comprehensive documentation

## Rate Limiting Considerations

### Free Tier Limits:
- 5,000 requests/day
- 60 requests/second

### Optimization Strategies:
- Cache geocoding results
- Batch similar requests
- Use static data for common locations
- Implement request queue with throttling

## Risk Mitigation

1. **API Quality**: LocationIQ may have less venue data than Google
   - Solution: Keep static data as fallback
   - Consider hybrid approach for critical data

2. **Rate Limits**: Free tier may be restrictive
   - Solution: Implement aggressive caching
   - Consider paid tier for production

3. **Map Quality**: May differ from Radar/Google
   - Solution: Use OpenStreetMap tiles option
   - Allow user to switch map styles

## Success Criteria

✅ All geocoding works correctly
✅ Places search returns relevant results
✅ Map displays properly with markers
✅ AI flows generate valid itineraries
✅ No Radar or Google dependencies remain
✅ All baseline tests pass

## Notes

- LocationIQ is built on OpenStreetMap data
- Supports multiple map tile styles
- Has good documentation and SDKs
- Pricing is competitive for paid tiers
- GDPR compliant (European company)