# LocationIQ Complete Removal & OpenStreetMap Replacement Plan
*Created: January 17, 2025*

## 📊 Current LocationIQ Usage Analysis

### Files to be Modified/Deleted (17 total)

#### 1. **API Service Files** (3 files - DELETE)
- `/src/services/api/locationiq.ts` - Main LocationIQ service
- `/src/services/api/locationiq-enhanced.ts` - Enhanced LocationIQ features
- `/src/services/api/static-places.ts` - Static fallback places

#### 2. **AI Service Files** (7 files - MODIFY)
- `/src/services/ai/services/location-enrichment-locationiq.ts` - DELETE
- `/src/services/ai/flows/generate-personalized-itinerary.ts` - Update imports
- `/src/services/ai/flows/generate-personalized-itinerary-v2.ts` - Update imports
- `/src/services/ai/conversation/ai-conversation-controller.ts` - Update imports
- `/src/services/ai/utils/conversational-generator.ts` - Update enrichment call
- `/src/services/ai/utils/route-optimizer.ts` - Update distance calculation import
- `/src/services/ai/utils/openai-travel-prompts.ts` - Remove LocationIQ references

#### 3. **Map Components** (2 files - REPLACE/DELETE)
- `/src/pages/itinerary/components/map/Locationiq-map.tsx` - DELETE
- `/src/pages/itinerary/components/map/MapView.tsx` - Update to use new map

#### 4. **Test Files** (2 files - DELETE)
- `/tests/api/test-locationiq-accuracy.ts` - DELETE
- `/tests/ai/results/ai-challenge-test-*.json` - Keep but contains LocationIQ data

#### 5. **Documentation** (2 files - UPDATE)
- `/src/services/README.md` - Remove LocationIQ references
- `/src/services/ai/utils/ITINERARY_GENERATION_PROMPT.md` - Update references

#### 6. **Schema Files** (1 file - CLEAN)
- `/src/services/ai/schemas.ts` - Remove LocationIQ-specific fields

#### 7. **Environment Variables** (1 file - CLEAN)
- `/.env.local` - Remove LOCATIONIQ_API_KEY

#### 8. **Package Dependencies** (1 file - CLEAN)
- `package.json` - Remove maplibre-gl dependency

## 🔄 Replacement Strategy

### Phase 1: Create OpenStreetMap Services
1. **Create `/src/services/api/openstreetmap.ts`**
   - Nominatim for geocoding
   - Overpass API for POI search
   - No API key required!

2. **Create `/src/services/ai/services/location-enrichment-osm.ts`**
   - Replace LocationIQ enrichment
   - Use OSM for venue search
   - Implement route optimization

3. **Create `/src/pages/itinerary/components/map/OSMMap.tsx`**
   - Use Leaflet (already in project)
   - OpenStreetMap tiles (free)
   - No API key needed

### Phase 2: Update AI Flows
1. **Update all AI flow imports**
   ```typescript
   // OLD
   import { enrichItineraryWithLocationIQ } from '@/services/ai/services/location-enrichment-locationiq';

   // NEW
   import { enrichItineraryWithOSM } from '@/services/ai/services/location-enrichment-osm';
   ```

2. **Update enrichment calls**
   ```typescript
   // OLD
   const enrichedItinerary = await enrichItineraryWithLocationIQ(itinerary);

   // NEW
   const enrichedItinerary = await enrichItineraryWithOSM(itinerary);
   ```

### Phase 3: Remove LocationIQ Files
1. Delete all LocationIQ service files
2. Remove maplibre-gl from package.json
3. Clean up environment variables
4. Delete test files

## 📋 Execution Order

### Step 1: Add OSM Services (No Breaking Changes)
```bash
✅ Create /src/services/api/openstreetmap.ts
✅ Create /src/services/ai/services/location-enrichment-osm.ts
✅ Create test file for OSM accuracy
✅ Test OSM with same venues that LocationIQ failed
```

### Step 2: Create OSM Map Component
```bash
✅ Create /src/pages/itinerary/components/map/OSMMap.tsx
✅ Use existing Leaflet (react-leaflet already installed)
✅ Free OpenStreetMap tiles
```

### Step 3: Update Imports (Quick Switch)
```bash
✅ Update 5 AI flow files to use OSM enrichment
✅ Update MapView.tsx to use OSMMap
✅ Update route-optimizer.ts to use OSM distance calculation
```

### Step 4: Delete LocationIQ (Clean Up)
```bash
🗑️ Delete /src/services/api/locationiq.ts
🗑️ Delete /src/services/api/locationiq-enhanced.ts
🗑️ Delete /src/services/api/static-places.ts
🗑️ Delete /src/services/ai/services/location-enrichment-locationiq.ts
🗑️ Delete /src/pages/itinerary/components/map/Locationiq-map.tsx
🗑️ Delete /tests/api/test-locationiq-accuracy.ts
```

### Step 5: Clean Dependencies
```bash
📦 Remove maplibre-gl from package.json
🔧 Remove LOCATIONIQ_API_KEY from .env.local
📝 Update documentation
```

## ✅ Benefits of OpenStreetMap

1. **FREE** - No API keys, no costs, no limits
2. **Better coverage** - Community-maintained, especially good in Europe
3. **Rich data** - Wheelchair access, dietary info, opening hours
4. **Overpass API** - Powerful queries for specific needs
5. **No authentication** - Works immediately

## ⚠️ Considerations

### What We Lose:
- Commercial venue data (reviews, photos)
- Some address formatting consistency
- Proprietary routing algorithms

### What We Gain:
- No API costs ever
- No rate limiting issues
- Community-driven data
- Special queries (wheelchair, vegan, etc.)
- Complete control

## 🧪 Testing Plan

1. **Test OSM accuracy first**
   - Barcelona venues (Sagrada Familia, etc.)
   - Tokyo venues
   - Medical facilities search
   - Dietary restriction filters

2. **Compare results**
   - OSM should find Sagrada Familia correctly
   - Should return Barcelona, not Australia!

3. **Validate enrichment**
   - Ensure coordinates are correct
   - Check address formatting
   - Verify route optimization

## 🚀 Implementation Time

- **Estimated time**: 2-3 hours
- **Risk level**: Medium (but LocationIQ is already broken)
- **Rollback plan**: Git revert if needed

## 📝 Summary

### Files to Delete (11)
1. `/src/services/api/locationiq.ts`
2. `/src/services/api/locationiq-enhanced.ts`
3. `/src/services/api/static-places.ts`
4. `/src/services/ai/services/location-enrichment-locationiq.ts`
5. `/src/pages/itinerary/components/map/Locationiq-map.tsx`
6. `/tests/api/test-locationiq-accuracy.ts`
7. Remove maplibre-gl dependency
8. Remove LOCATIONIQ_API_KEY from .env

### Files to Create (3)
1. `/src/services/api/openstreetmap.ts`
2. `/src/services/ai/services/location-enrichment-osm.ts`
3. `/src/pages/itinerary/components/map/OSMMap.tsx`

### Files to Update (7)
1. `/src/services/ai/flows/generate-personalized-itinerary.ts`
2. `/src/services/ai/flows/generate-personalized-itinerary-v2.ts`
3. `/src/services/ai/conversation/ai-conversation-controller.ts`
4. `/src/services/ai/utils/conversational-generator.ts`
5. `/src/services/ai/utils/route-optimizer.ts`
6. `/src/pages/itinerary/components/map/MapView.tsx`
7. `/src/services/ai/schemas.ts`

## 🎯 Success Criteria

1. ✅ No LocationIQ references in codebase
2. ✅ OSM finds Barcelona venues correctly
3. ✅ Map displays without API key
4. ✅ Enrichment works with real coordinates
5. ✅ No breaking changes to AI flow
6. ✅ Tests pass with better accuracy

---

## Ready to Execute?

This plan will:
1. Completely remove LocationIQ (which has 0% accuracy)
2. Replace with free OpenStreetMap/Overpass API
3. Improve venue finding accuracy
4. Eliminate API costs
5. Add better accessibility/dietary data

**No API keys required - it just works!**