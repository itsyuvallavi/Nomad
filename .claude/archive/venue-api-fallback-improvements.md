# Venue API Fallback Improvements

**Date Created**: 2025-09-10  
**Status**: TODO  
**Priority**: Medium  
**Component**: AI Generation / External APIs

## Problem Statement

When Google Places API quota is exceeded or API fails, the venue distribution becomes uneven in multi-city trips:
- Cities where API succeeds get rich, detailed venues
- Cities where API fails get minimal, generic activities
- This creates inconsistent user experience across destinations

### Example Issue
In a NYC → London → Brussels trip:
- NYC: Full venue details with addresses, ratings, names
- London/Brussels: Generic activities without real venue data

## Current Behavior

1. System attempts to fetch venues from Google Places API
2. On failure, falls back to AI-generated activities
3. Total activity count remains correct (5 per day)
4. But quality/detail varies significantly between cities

## Proposed Solutions

### 1. Implement Tiered Fallback System
```typescript
// Fallback priority:
// 1. Google Places API (real-time)
// 2. Cached venue data (from previous successful calls)
// 3. Pre-loaded mock venues (curated list)
// 4. AI-generated activities (last resort)
```

### 2. Add Venue Caching Layer
- Cache successful Google Places responses
- Key by: `city_name + venue_type + timestamp`
- TTL: 7 days (venues don't change often)
- Storage: Local JSON files in `cache/venues/`

### 3. Create Mock Venue Database
- Pre-populate common cities with curated venues
- Cities to cover: London, Paris, Rome, Tokyo, Barcelona, Amsterdam, Brussels
- Include: Name, address, type, typical hours, brief description
- Store in: `src/data/mock-venues.json`

### 4. Implement Smart Retry Logic
```typescript
async function fetchVenuesWithFallback(city: string, type: string) {
  // Try Google Places
  const googleVenues = await tryGooglePlaces(city, type);
  if (googleVenues) return googleVenues;
  
  // Check cache
  const cachedVenues = await checkVenueCache(city, type);
  if (cachedVenues) return cachedVenues;
  
  // Use mock data
  const mockVenues = getMockVenues(city, type);
  if (mockVenues) return mockVenues;
  
  // Generate with AI
  return generateVenuesWithAI(city, type);
}
```

## Implementation Steps

1. **Create cache directory structure**
   ```
   cache/
   └── venues/
       ├── london/
       ├── paris/
       └── ...
   ```

2. **Build mock venue database**
   - Research top attractions for major cities
   - Format as structured JSON
   - Include variety of venue types

3. **Update enhanced-generator-ultra-fast.ts**
   - Add caching logic to `batchFetchVenues`
   - Implement fallback chain
   - Add cache invalidation logic

4. **Add monitoring**
   - Log API failures vs cache hits
   - Track which cities rely on fallbacks
   - Monitor API quota usage

## Success Criteria

- [ ] All cities in multi-city trips have consistent venue quality
- [ ] API quota usage reduced by 50%
- [ ] No empty or generic activities when API fails
- [ ] Cache hit rate > 30% for popular cities
- [ ] Mock venues feel authentic and useful

## Testing

1. Simulate API failures for specific cities
2. Verify fallback chain works correctly
3. Test cache expiration and refresh
4. Validate mock venue quality
5. Check multi-city trip consistency

## Notes

- Consider using free APIs as additional fallbacks (OpenStreetMap, etc.)
- May want to pre-warm cache for top 20 cities
- Could offer "offline mode" using only cached/mock data
- Monitor Google API quota dashboard for optimization opportunities

## Related Files

- `/src/ai/utils/enhanced-generator-ultra-fast.ts` - Main generation logic
- `/src/lib/api/google-places.ts` - Google Places API integration
- `/src/lib/utils/cache.ts` - Caching utilities
- `/logs/ai-requests/` - API failure logs