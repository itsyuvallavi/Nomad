# OpenStreetMap Integration Improvement Plan
*Based on test results from 2025-09-17*

## Current Status
- **Before (LocationIQ):** 0/6 tests passed (0%)
- **After (OSM):** 1/6 tests passed (16.7%)
- Slight improvement but major issues remain

## Problems Identified

### 1. Wrong City Geocoding (Critical)
**Issue:** OSM finds similarly named places in wrong countries
- "Sagrada Familia Barcelona" → Found in London
- "Seine River Paris" → Found in Vietnam
- "Montmartre" → Found in Australia

**Root Cause:** Generic search without country/city constraints

**Solution:**
```typescript
// Improve search query building in location-enrichment-osm.ts
function buildSearchQuery(venueName: string, city: string, country?: string): string {
  // Add country code mapping
  const countryMap = {
    'Barcelona': 'ES',
    'Paris': 'FR',
    'Tokyo': 'JP',
    'London': 'GB'
  };

  // Use Nominatim's structured query
  return openStreetMap.searchPlace(venueName, {
    city: city,
    country: countryMap[city] || undefined,
    limit: 5
  });
}

// Add validation in enrichSpecialNeeds()
if (distance > 50) { // If venue is >50km from city center
  // This is probably wrong, use fallback
  return cityCoords;
}
```

### 2. Activity Duplication (High Priority)
**Issue:** Same activity repeated 3-5 times in itinerary
**Example:** "Lunch at La Boqueria Market" appears 3 times

**Solution:** Fix in conversational-generator.ts
```typescript
// Add deduplication logic
const uniqueActivities = activities.filter((activity, index) =>
  activities.findIndex(a =>
    a.description === activity.description
  ) === index
);
```

### 3. Ignored Medical/Dietary Constraints (Critical)
**Issue:**
- User needs dialysis → No medical facilities included
- Severe seafood allergy → Seafood restaurants suggested

**Solution:** Enhance constraint handling
```typescript
// In location-enrichment-osm.ts enrichSpecialNeeds()
if (userConstraints.includes('dialysis')) {
  const dialysisCenters = await openStreetMap.findMedicalFacilities(
    coordinates.lat,
    coordinates.lng,
    'dialysis'
  );
  // Add to every other day's activities
}

if (userConstraints.includes('seafood allergy')) {
  // Filter out any seafood restaurants
  activities = activities.filter(a =>
    !a.description.toLowerCase().includes('seafood') &&
    !a.description.toLowerCase().includes('sushi') &&
    !a.description.toLowerCase().includes('fish')
  );
}
```

### 4. Multi-City Trip Failures (High Priority)
**Issue:** Complex multi-city requests fail completely

**Solution:** Better parsing and handling
```typescript
// Parse multi-city destinations
const cities = destination.split(',').map(c => c.trim());
if (cities.length > 1) {
  // Generate separate itineraries for each city
  // Then combine them
}
```

### 5. Poor Conversation Flow (Medium Priority)
**Issue:** AI jumps to itinerary generation without asking questions

**Solution:** Update conversation controller
```typescript
// Force more questions for vague requests
if (!destination || !duration || !startDate) {
  return {
    type: 'question',
    message: 'I need more information...',
    awaitingInput: 'missing_info'
  };
}
```

## Implementation Priority

### Phase 1: Fix Critical Location Issues (2 hours)
1. Add country codes to OSM searches
2. Implement distance validation
3. Add fallback for wrong locations

### Phase 2: Fix Constraint Handling (1 hour)
1. Add medical facility search
2. Implement dietary filters
3. Add accessibility checks

### Phase 3: Fix Generation Issues (2 hours)
1. Remove activity duplication
2. Fix multi-city handling
3. Improve conversation flow

### Phase 4: Testing (1 hour)
1. Run comprehensive test suite
2. Validate all constraints work
3. Ensure correct city geocoding

## Success Metrics
- [ ] 5/6 tests passing (83%+)
- [ ] All venues in correct cities
- [ ] No duplicate activities
- [ ] Medical/dietary constraints respected
- [ ] Multi-city trips work
- [ ] Better conversation flow

## Code Changes Needed

### 1. `/src/services/api/openstreetmap.ts`
- Add country parameter to searchPlace()
- Add structured query support

### 2. `/src/services/ai/services/location-enrichment-osm.ts`
- Improve buildSearchQuery() with country codes
- Add distance validation
- Enhance constraint handling

### 3. `/src/services/ai/utils/conversational-generator.ts`
- Add activity deduplication
- Fix multi-city parsing
- Improve error handling

### 4. `/src/services/ai/conversation/ai-conversation-controller.ts`
- Force more questions for vague requests
- Add constraint validation
- Better error messages

## Expected Results After Implementation
- **Test Success Rate:** 80%+ (5/6 tests)
- **Correct City Rate:** 95%+
- **Constraint Compliance:** 100%
- **No Duplicates:** 100%
- **Multi-City Support:** Working

## Notes
The OSM integration is working but needs refinement. The main issues are:
1. Search queries too generic (easy fix)
2. AI generation logic separate from API issues
3. Need better validation and fallbacks

With these improvements, we should achieve much better results than either LocationIQ or current OSM implementation.