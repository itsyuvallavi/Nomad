# AI Itinerary Generation Fix Plan

## Issues Identified

### 1. **Venue Name Problems**
- AI generates generic names like "Restaurant", "Cafe", "Museum"
- LocationIQ can't find these generic names
- Results in same venue being reused or N/A addresses

### 2. **Rate Limiting Issues**
- LocationIQ free tier: 60 requests/minute
- Too many rapid API calls causing 429 errors
- No proper delay/throttling between requests

### 3. **Address Generation**
- AI sometimes makes up addresses
- Should ALWAYS use "Address N/A" and let LocationIQ provide real addresses

### 4. **Missing Venue Search Strategy**
- No specific "venue_search" field for LocationIQ
- Not including city name in searches
- Not using famous/landmark venues that are findable

### 5. **Zone-Based Planning Missing**
- Activities scattered across city (zigzagging)
- No geographical grouping by neighborhood/district
- Inefficient travel between activities

## Implementation Plan

### Phase 1: Update AI Prompt System
**Files to modify:**
- `/src/services/ai/utils/openai-travel-prompts.ts` (create if doesn't exist)
- `/src/services/ai/flows/generate-personalized-itinerary.ts`

**Changes:**
1. Create comprehensive prompt with SPECIFIC instructions:
   - Must use FAMOUS, SPECIFIC venue names
   - Must include `venue_search` field with "[Venue Name] [City]"
   - Must use "Address N/A" - NEVER make up addresses
   - Must organize by zones/neighborhoods
   - Must provide venue_name separate from description

2. Add examples of GOOD vs BAD venue generation:
   ```json
   GOOD: {
     "venue_name": "Louvre Museum",
     "venue_search": "Louvre Museum Paris",
     "address": "Address N/A"
   }
   BAD: {
     "venue_name": "Nice museum",
     "venue_search": "museum",
     "address": "123 Main St"  // NEVER make up!
   }
   ```

### Phase 2: Improve LocationIQ Integration
**Files to modify:**
- `/src/services/api/locationiq.ts`
- `/src/services/ai/services/location-enrichment-locationiq.ts`

**Changes:**
1. **Add Rate Limiting:**
   - Implement delay between requests (1 second minimum)
   - Queue system for batch processing
   - Retry logic with exponential backoff

2. **Improve Search Logic:**
   - Use venue_search field if provided
   - Fallback search patterns:
     * Try exact venue name + city
     * Try venue type + neighborhood + city
     * Try general category + city
   - Cache successful searches to avoid repetition

3. **Better Fallback Handling:**
   - When LocationIQ fails, keep "Address N/A"
   - Don't repeat same venue for all activities
   - Mark activities that couldn't be geocoded

### Phase 3: Enhanced Venue Generation
**Files to modify:**
- `/src/services/ai/utils/enhanced-generator-ultra-fast.ts`
- `/src/services/ai/utils/venue-knowledge-base.ts` (create new)

**Changes:**
1. **Create Venue Knowledge Base:**
   - Popular venues by city (top 20-30 per city)
   - Categories: restaurants, cafes, attractions, hotels
   - Include proper search strings

2. **Update Generation Logic:**
   - When AI generates activity, must specify:
     * venue_name (specific)
     * venue_search (for LocationIQ)
     * neighborhood/zone
     * address: "Address N/A"

3. **Zone-Based Grouping:**
   - Identify city zones/neighborhoods
   - Group morning activities in same zone
   - Logical flow between zones
   - Minimize travel time

### Phase 4: Schema Updates
**Files to modify:**
- `/src/services/ai/schemas.ts`

**Changes:**
1. Update Activity schema to include:
   ```typescript
   interface Activity {
     time: string;
     description: string;
     category: string;
     venue_name?: string;      // Specific venue
     venue_search?: string;    // Search query for LocationIQ
     neighborhood?: string;    // Zone/area
     address: string;          // Always "Address N/A" initially
     coordinates?: {
       lat: number;
       lng: number;
     };
   }
   ```

### Phase 5: Testing & Validation
**Files to create:**
- `/tests/ai/venue-generation-test.ts`
- `/tests/ai/zone-planning-test.ts`

**Test Cases:**
1. Verify venue names are specific
2. Verify "Address N/A" is used
3. Verify zone-based grouping
4. Verify rate limiting works
5. Verify fallback handling

## Priority Order

1. **CRITICAL - Immediate Fix:**
   - Update prompts to use specific venue names
   - Force "Address N/A" usage
   - Add venue_search field

2. **HIGH - Rate Limiting:**
   - Add delays between LocationIQ calls
   - Implement retry logic

3. **MEDIUM - Zone Planning:**
   - Add neighborhood grouping
   - Optimize activity order

4. **LOW - Enhancements:**
   - Venue knowledge base
   - Caching system

## Expected Outcomes

✅ **Before:**
- "Local restaurant" → LocationIQ fails → Same venue repeated
- Made up addresses like "123 Main St"
- Activities zigzag across city
- Rate limiting errors

✅ **After:**
- "Le Comptoir du Relais" → LocationIQ finds it → Real address
- "Address N/A" until LocationIQ provides real one
- Activities grouped by neighborhood
- Smooth API calls with proper delays

## Files Summary

**New Files to Create:**
1. `/src/services/ai/utils/openai-travel-prompts.ts` - Comprehensive prompts
2. `/src/services/ai/utils/venue-knowledge-base.ts` - Famous venues by city
3. `/tests/ai/venue-generation-test.ts` - Test venue generation
4. `/tests/ai/zone-planning-test.ts` - Test zone-based planning

**Files to Modify:**
1. `/src/services/ai/flows/generate-personalized-itinerary.ts` - Use new prompts
2. `/src/services/api/locationiq.ts` - Add rate limiting
3. `/src/services/ai/services/location-enrichment-locationiq.ts` - Better search
4. `/src/services/ai/utils/enhanced-generator-ultra-fast.ts` - Fix venue generation
5. `/src/services/ai/schemas.ts` - Update Activity schema

## Implementation Time Estimate
- Phase 1: 30 minutes (Critical - Prompts)
- Phase 2: 45 minutes (Rate limiting & search)
- Phase 3: 45 minutes (Venue generation)
- Phase 4: 15 minutes (Schema updates)
- Phase 5: 30 minutes (Testing)

Total: ~2.5-3 hours

## Success Metrics
1. No more repetitive venues (same restaurant for all meals)
2. Real addresses from LocationIQ (not made up)
3. <10% rate limiting errors (vs current ~50%)
4. Logical activity flow (no zigzagging)
5. Specific venue names that LocationIQ can find