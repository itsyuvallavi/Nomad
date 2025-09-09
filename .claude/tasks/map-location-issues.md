# Map Location Issues - Investigation & Fix Plan

## Problems Identified
1. **Wrong addresses displayed for activities** - The address shown on screen doesn't match the actual/real address of the activity
2. **Wrong map markers for addresses** - The location shown on the map doesn't match the displayed address
3. **Double error** - Both the address AND the map location are incorrect

## Investigation Steps

### 1. Trace Data Flow
- [ ] Check where activity addresses come from (AI generation vs API)
- [ ] Verify how addresses are passed to map component
- [ ] Check geocoding process (address → coordinates)

### 2. Identify Root Causes
- [ ] AI generating fake/incorrect addresses?
- [ ] Geocoding API failing or using wrong service?
- [ ] Coordinate system mismatch?
- [ ] Data transformation errors?

### 3. Debug Points
- [ ] Log original AI-generated addresses
- [ ] Log geocoding requests and responses
- [ ] Log coordinates passed to map markers
- [ ] Compare with real venue data

## Potential Issues to Check

### Address Generation
- AI might be generating plausible but fake addresses
- Missing real venue lookup via Foursquare/Google Places
- Address format issues

### Geocoding Problems
- Wrong geocoding service being used
- API key issues
- Rate limiting causing fallbacks
- Caching stale/wrong coordinates

### Map Display Issues
- Coordinate system confusion (lat/lng swap?)
- Map projection issues
- Marker placement logic errors
- Wrong map center or zoom level

## Fix Strategy

### Quick Fixes
1. Verify API keys are working (Google Maps, Foursquare)
2. Add logging to trace address → coordinate flow
3. Check if real venue search is actually being called

### Proper Solution
1. Ensure AI uses real venue data from APIs
2. Implement proper geocoding with fallbacks
3. Validate coordinates before displaying
4. Add address verification step
5. Show confidence indicators for locations

## Files to Check
- `src/components/map/` - Map display components
- `src/lib/api/foursquare.ts` - Real venue search
- `src/lib/api/google-places.ts` - Google Places integration
- `src/ai/flows/generate-personalized-itinerary.ts` - Where addresses are generated
- `src/components/itinerary/activity-card.tsx` - How addresses are displayed

## Test Cases
1. Generate itinerary for known location (e.g., "3 days in Paris")
2. Check specific venues (Eiffel Tower, Louvre)
3. Compare displayed address vs map location vs real address
4. Test with different cities to see if issue is consistent