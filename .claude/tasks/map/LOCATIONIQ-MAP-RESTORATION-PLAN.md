# LocationIQ Map Restoration Plan

## Current State Analysis
- **ItineraryMap.tsx**: Currently uses OSM's tile layer directly with custom geocoding
- **OSMMap.tsx**: Simplified OSM implementation with basic markers
- **MapView.tsx**: Wrapper component that decides which map to use
- **OSM API**: Used for geocoding and location enrichment services

## Issues Identified
1. OSM's free tile server has limitations and may not render properly
2. Geocoding through OSM is working but map rendering is problematic
3. Need to separate map rendering (LocationIQ) from geocoding services (OSM)

## Implementation Strategy

### Phase 1: Add LocationIQ API Configuration
1. **Environment Variables**
   - Add `LOCATIONIQ_API_KEY` to `.env`
   - Keep existing OSM services for geocoding

### Phase 2: Create LocationIQ Map Service
1. **Create `src/services/api/locationiq-map.ts`**
   - Static map generation only
   - Tile server configuration
   - No geocoding (use OSM for that)

### Phase 3: Update Map Components
1. **Update ItineraryMap.tsx**
   - Use LocationIQ tiles instead of OSM tiles
   - Keep existing geocoding logic using OSM
   - Update TileLayer URL to LocationIQ format

2. **Create fallback mechanism**
   - If LocationIQ fails, fall back to OSM tiles
   - Log errors for monitoring

### Phase 4: Testing
1. Verify map tiles load correctly
2. Ensure markers and routes still work
3. Test on different destinations
4. Validate API key usage

### Phase 5: Remove OSM Fallback
1. **Delete OSMMap.tsx component**
   - Remove `/src/pages/itinerary/components/map/OSMMap.tsx`
   - This component won't be needed anymore

2. **Update MapView.tsx**
   - Remove conditional logic for OSM/LocationIQ selection
   - Always use ItineraryMap with LocationIQ tiles
   - Simplify the component to just wrap ItineraryMap

3. **Clean up imports**
   - Remove any OSMMap imports from MapView.tsx
   - Remove any OSM tile-related constants or utilities

4. **Benefits of removing OSM fallback**
   - Cleaner codebase with single map implementation
   - Consistent user experience
   - Reduced maintenance burden
   - No confusion about which map is being used

## File Changes Required

### 1. `/src/services/api/locationiq-map.ts` (NEW)
```typescript
// LocationIQ Map Service - TILES ONLY
export const LOCATIONIQ_TILE_URL = 'https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key={key}';

export function getLocationIQTileUrl(apiKey: string) {
  return LOCATIONIQ_TILE_URL.replace('{key}', apiKey);
}
```

### 2. `/src/pages/itinerary/components/map/ItineraryMap.tsx` (MODIFY)
- Change line 332 TileLayer URL from OSM to LocationIQ
- Add API key from environment
- Keep all geocoding as-is (using OSM)

### 3. `/src/pages/itinerary/components/map/OSMMap.tsx` (OPTIONAL MODIFY)
- Can also update to use LocationIQ tiles
- Or keep as pure OSM fallback

### 4. `.env` (MODIFY)
- Add `LOCATIONIQ_API_KEY=your_key_here`

## Benefits of This Approach
1. **Minimal changes**: Only changing tile provider, not geocoding
2. **Better map quality**: LocationIQ has better tile rendering
3. **Reliability**: Dedicated tile service with API key
4. **Keep OSM benefits**: Still use free OSM geocoding
5. **Easy rollback**: Can switch back to OSM tiles easily

## Implementation Order
1. Add LocationIQ API key to environment
2. Create LocationIQ map service file
3. Update ItineraryMap to use LocationIQ tiles
4. Test with various destinations
5. Monitor API usage
6. Remove OSMMap.tsx component
7. Simplify MapView.tsx to remove fallback logic

## Rollback Plan
If LocationIQ doesn't work:
1. Simply revert TileLayer URL back to OSM
2. Remove LocationIQ service file
3. Remove API key from environment

## Notes
- LocationIQ free tier: 5,000 requests/day
- Each map tile is one request
- Average map view: ~20 tiles
- Should be sufficient for development/testing
- Production may need paid tier