# OpenStreetMap Integration Plan
*Phase-by-Phase Implementation Guide*

## 🎯 Goal
Replace LocationIQ (0% accuracy, costs money) with OpenStreetMap (FREE, better accuracy)

## 📋 Implementation Phases

### Phase 1: Add OSM Services (Non-Breaking)
*Add new services alongside LocationIQ - no breaking changes*

#### 1.1 Create Core OSM Service
**File:** `/src/services/api/openstreetmap.ts`
```typescript
// Features to implement:
- Nominatim geocoding (address → coordinates)
- Overpass API for POI search (find restaurants, museums, etc.)
- Distance calculations
- Route optimization
- Special queries (wheelchair accessible, vegan restaurants)
- Medical facilities search (hospitals, dialysis centers)
```

**Key Functions:**
- `searchPlace()` - Find locations by name
- `geocode()` - Convert address to coordinates
- `searchPOIs()` - Find points of interest
- `findTouristAttractions()` - Get popular venues
- `findRestaurants()` - With dietary filters
- `findMedicalFacilities()` - Hospitals, pharmacies, dialysis
- `optimizeRoute()` - Minimize travel distance

#### 1.2 Create Location Enrichment Service
**File:** `/src/services/ai/services/location-enrichment-osm.ts`
```typescript
// Parallel to location-enrichment-locationiq.ts
- enrichItineraryWithOSM() - Main enrichment function
- Uses OSM instead of LocationIQ
- Better handling of accessibility/dietary needs
```

#### 1.3 Create Test Suite
**File:** `/tests/api/test-osm-accuracy.ts`
```typescript
// Test the same venues that LocationIQ failed:
- Sagrada Familia Barcelona → Should find in Spain, not Australia!
- La Boqueria Market → Should find in Barcelona
- Tokyo venues → Should find in Japan
- Medical facilities → Should find actual hospitals
```

### Phase 2: Create Map Component
*Replace LocationIQ map with OSM/Leaflet*

#### 2.1 Create OSM Map Component
**File:** `/src/pages/itinerary/components/map/OSMMap.tsx`
```typescript
// Using react-leaflet (already installed)
- Free OpenStreetMap tiles
- No API key needed
- Markers for venues
- Route display
- Mobile responsive
```

### Phase 3: Testing & Validation
*Ensure OSM works better than LocationIQ*

#### 3.1 Run Accuracy Tests
```bash
npm run test:osm  # Test OSM accuracy
# Should show >80% accuracy vs LocationIQ's 0%
```

#### 3.2 Compare Results
- Barcelona venues found correctly ✅
- Tokyo venues in Japan, not France ✅
- Medical facilities actually exist ✅
- Addresses are real ✅

### Phase 4: Switch AI Flows to OSM
*Update imports and function calls*

#### 4.1 Update AI Flow Files
```typescript
// Files to update:
1. /src/services/ai/flows/generate-personalized-itinerary.ts
2. /src/services/ai/flows/generate-personalized-itinerary-v2.ts
3. /src/services/ai/conversation/ai-conversation-controller.ts
4. /src/services/ai/utils/conversational-generator.ts

// Change:
import { enrichItineraryWithLocationIQ } from '.../location-enrichment-locationiq';
// To:
import { enrichItineraryWithOSM } from '.../location-enrichment-osm';

// Change:
const enriched = await enrichItineraryWithLocationIQ(itinerary);
// To:
const enriched = await enrichItineraryWithOSM(itinerary);
```

#### 4.2 Update Route Optimizer
```typescript
// File: /src/services/ai/utils/route-optimizer.ts
// Change LocationIQ distance import to OSM
import { calculateDistance } from '@/services/api/openstreetmap';
```

#### 4.3 Update Map Component
```typescript
// File: /src/pages/itinerary/components/map/MapView.tsx
// Change from LocationIQMap to OSMMap
import { OSMMap } from './OSMMap';
```

### Phase 5: Remove LocationIQ
*Clean up all LocationIQ code*

#### 5.1 Delete LocationIQ Files
```bash
# API Services
rm src/services/api/locationiq.ts
rm src/services/api/locationiq-enhanced.ts
rm src/services/api/static-places.ts

# AI Services
rm src/services/ai/services/location-enrichment-locationiq.ts

# Map Components
rm src/pages/itinerary/components/map/Locationiq-map.tsx

# Tests
rm tests/api/test-locationiq-accuracy.ts
```

#### 5.2 Clean Package.json
```json
// Remove:
"maplibre-gl": "^5.7.1"

// Run:
npm uninstall maplibre-gl
```

#### 5.3 Clean Environment Variables
```bash
# Remove from .env.local:
LOCATIONIQ_API_KEY=...
NEXT_PUBLIC_LOCATIONIQ_API_KEY=...
```

## 📊 Success Metrics

### Before (LocationIQ):
- ❌ 0% accuracy for tourist venues
- ❌ Costs money per request
- ❌ Requires API key
- ❌ Sagrada Familia → Australia
- ❌ Rate limited

### After (OpenStreetMap):
- ✅ 80%+ accuracy expected
- ✅ Completely FREE
- ✅ No API key needed
- ✅ Sagrada Familia → Barcelona
- ✅ Better accessibility data
- ✅ Dietary restriction support

## 🚀 Implementation Order

### Day 1 (Today):
1. **Hour 1:** Create OSM service
2. **Hour 2:** Create enrichment service
3. **Hour 3:** Test and validate
4. **Hour 4:** Create map component

### Day 2 (If needed):
1. **Hour 1:** Switch AI flows
2. **Hour 2:** Delete LocationIQ
3. **Hour 3:** Final testing

## ⚠️ Risk Mitigation

### Potential Issues:
1. **OSM rate limits**
   - Solution: 1 req/second limit built in

2. **Missing venues**
   - Solution: Fallback to city coordinates

3. **Different data format**
   - Solution: Adapter functions to normalize

### Rollback Plan:
```bash
# If something goes wrong:
git stash  # Save current work
git checkout main  # Return to working version
# Fix issues and try again
```

## 📝 Testing Checklist

### Before Going Live:
- [ ] OSM finds Barcelona venues correctly
- [ ] Tokyo venues are in Japan
- [ ] Medical facilities search works
- [ ] Dietary filters work (vegetarian, vegan)
- [ ] Wheelchair accessibility data available
- [ ] Map displays without errors
- [ ] Routes optimize properly
- [ ] No LocationIQ references remain

## 💡 Key Advantages

### Why This Will Work:
1. **OSM has better data** - Community maintained
2. **Overpass API is powerful** - Complex queries possible
3. **No vendor lock-in** - Open source forever
4. **Better for nomads** - Good worldwide coverage
5. **Ethical choice** - Supporting open data

### What We're Trading:
- Lose: Commercial venue photos/reviews
- Gain: Accurate locations that actually exist!

## 📚 Resources

### Documentation:
- [Nominatim API](https://nominatim.org/release-docs/develop/api/Overview/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Leaflet Maps](https://leafletjs.com/)
- [React-Leaflet](https://react-leaflet.js.org/)

### Test Queries:
```javascript
// Nominatim example:
https://nominatim.openstreetmap.org/search?q=Sagrada+Familia+Barcelona&format=json

// Overpass example (find restaurants):
[out:json];
node["amenity"="restaurant"](around:1000,41.3851,2.1734);
out body;
```

## ✅ Ready to Start?

**Step 1:** Create OSM service (won't break anything)
**Step 2:** Test it works better than LocationIQ
**Step 3:** Switch over when confident
**Step 4:** Delete LocationIQ forever

This is a safe, phased approach that we can stop at any point if issues arise.