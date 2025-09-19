# OSM Integration Plan

**Date**: 2025-01-19
**Status**: In Progress

## Objective
Add OpenStreetMap (OSM) integration to generate real POI locations (restaurants, hotels, parks, museums) for travel itineraries.

## Current State
- AI system simplified to 5 core files
- Zone-based planning implemented
- Location enrichment using LocationIQ
- No real POI data - just descriptions

## Implementation Plan

### Phase 1: OSM Service Creation
Create `src/services/ai/services/osm-poi-service.ts`:
- Query OSM/Overpass API for POIs by category and area
- Support categories: restaurants, hotels, museums, parks, attractions
- Return structured POI data with coordinates

### Phase 2: Integration Points
1. **Trip Generator Enhancement**:
   - After generating base itinerary
   - Before location enrichment
   - Query OSM for real venues matching activity descriptions

2. **Data Flow**:
   ```
   User Input → AI Controller → Trip Generator
                                    ↓
                            Generate Activities
                                    ↓
                            Query OSM for POIs
                                    ↓
                            Match POIs to Activities
                                    ↓
                            Enrich with LocationIQ
                                    ↓
                            Return Final Itinerary
   ```

### Phase 3: OSM Query Strategy
- Use Overpass API (free, no key required)
- Query by:
  - Bounding box (zone coordinates)
  - Category tags (amenity, tourism, leisure)
  - Activity type mapping

### Phase 4: POI Categories Mapping
```typescript
const POI_CATEGORIES = {
  breakfast: ['amenity=cafe', 'amenity=restaurant', 'cuisine=breakfast'],
  lunch: ['amenity=restaurant', 'amenity=fast_food'],
  dinner: ['amenity=restaurant', 'amenity=pub'],
  museum: ['tourism=museum', 'tourism=gallery'],
  park: ['leisure=park', 'leisure=garden'],
  attraction: ['tourism=attraction', 'tourism=viewpoint'],
  hotel: ['tourism=hotel', 'tourism=hostel'],
  shopping: ['shop=mall', 'shop=department_store']
};
```

### Phase 5: Implementation Details

#### 1. OSM Service Structure
```typescript
interface POI {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  tags: Record<string, string>;
  rating?: number;
  openingHours?: string;
}

class OSMService {
  async findPOIs(
    zone: Zone,
    category: string,
    limit: number = 5
  ): Promise<POI[]>

  async findNearbyPOIs(
    coordinates: Coordinates,
    category: string,
    radiusMeters: number = 1000
  ): Promise<POI[]>

  async getVenueDetails(osmId: string): Promise<POI>
}
```

#### 2. Activity Matching Algorithm
- Parse activity description for keywords
- Map keywords to OSM categories
- Find POIs in the activity's zone
- Rank by distance and relevance
- Select best match

#### 3. Fallback Strategy
- If no OSM POIs found → use AI-generated venue names
- If OSM API fails → use cached popular venues
- Always maintain activity even without POI data

### Phase 6: Testing Strategy
1. **Unit Tests**:
   - OSM query construction
   - POI parsing
   - Category mapping

2. **Integration Tests**:
   - Full flow with real OSM data
   - Fallback scenarios
   - Zone-based queries

3. **Manual Tests**:
   - Generate itinerary for London
   - Verify real venues appear
   - Check coordinates accuracy

## Implementation Steps

### Step 1: Create OSM Service [TODO]
- [ ] Create `osm-poi-service.ts`
- [ ] Implement Overpass API client
- [ ] Add POI category mappings
- [ ] Test with sample queries

### Step 2: Update Trip Generator [TODO]
- [ ] Add OSM service integration
- [ ] Implement activity-POI matching
- [ ] Update enrichment flow
- [ ] Handle fallbacks

### Step 3: Add Caching [TODO]
- [ ] Cache popular POIs by city
- [ ] Implement cache invalidation
- [ ] Add offline fallback data

### Step 4: Testing [TODO]
- [ ] Create test suite
- [ ] Run baseline tests
- [ ] Verify UI integration
- [ ] Performance testing

## Success Criteria
- Real venue names in itineraries
- Accurate coordinates for activities
- Fast query performance (<2s per day)
- Graceful fallbacks when OSM unavailable
- No breaking changes to existing flow

## Notes
- Overpass API is free but has rate limits
- Consider using public Overpass instances
- May need to batch queries for efficiency
- Keep POI data lightweight for performance