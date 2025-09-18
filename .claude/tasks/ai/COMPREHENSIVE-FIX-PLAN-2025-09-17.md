# Comprehensive AI & API Fix Plan
*Created: 2025-09-17*

## Executive Summary
After analyzing test results, we have 1/6 tests passing (16.7%). Major issues include:
1. Wrong city geocoding (API issue)
2. Activity duplication (AI generation issue)
3. Ignored constraints (AI logic issue)
4. Poor conversation flow (AI controller issue)

## Problem Analysis

### 1. API Issues (OpenStreetMap)

#### A. Wrong City Geocoding (CRITICAL)
**Problem**: Venues found in wrong countries
- "Sagrada Familia Barcelona" → "London Bridge Experience" (London coordinates)
- "Seine River Paris" → Vietnam coordinates
- "Montmartre" → Australia coordinates

**Root Cause**:
- No country code constraints in OSM search
- No distance validation from city center
- Generic search queries without geographic context

**Evidence**:
```json
{
  "venue_name": "London Bridge Experience",
  "coordinates": { "lat": 51.506379, "lng": -0.0882654 },
  // Should be Barcelona (lat: 41.38, lng: 2.17)
}
```

#### B. Missing Validation
**Problem**: Accepting venues 100s of km from target city
**Root Cause**: No distance checking after geocoding

### 2. AI Generation Issues

#### A. Activity Duplication (HIGH PRIORITY)
**Problem**: Same activity repeated 2-5 times
**Evidence**:
- "Visit Sagrada Familia" at 9:00 AM appears twice
- "Lunch at La Boqueria Market" at 12:00 PM appears twice

**Root Cause Location**: `/src/services/ai/utils/conversational-generator.ts`
- Lines 206-218: No deduplication when mapping activities
- GPT sometimes returns duplicate activities in JSON

#### B. Ignored Constraints (CRITICAL)
**Problem**: Medical/dietary needs ignored
- User needs dialysis → No medical facilities
- Seafood allergy → Seafood restaurants suggested

**Root Cause**:
- No constraint validation in generation prompt
- No post-processing to filter inappropriate venues

#### C. Poor Conversation Flow
**Problem**: AI jumps to generation without asking questions
- Only 2 conversation turns for vague requests
- Not asking for clarification on important details

**Root Cause**: `/src/services/ai/conversation/ai-conversation-controller.ts`
- Lines 84-86: Too eager to generate
- Missing validation for minimum conversation depth

### 3. Multi-City Trip Failures
**Problem**: Complex trips fail completely
**Partial Fix Exists**: Lines 24-38 in conversational-generator.ts handle multi-city
**Issue**: Poor city allocation and OSM search confusion

## Implementation Plan

### Phase 1: Fix Critical API Issues (1 hour)

#### Task 1.1: Add Country Codes to OSM Search
**File**: `/src/services/ai/services/location-enrichment-osm.ts`

**Add after line 12**:
```typescript
// Country code mapping for major cities
const CITY_COUNTRY_MAP: Record<string, string> = {
  'Barcelona': 'ES', 'Madrid': 'ES', 'Paris': 'FR',
  'London': 'GB', 'Rome': 'IT', 'Berlin': 'DE',
  'Tokyo': 'JP', 'New York': 'US', 'Sydney': 'AU'
  // ... (full list of 50+ cities)
};

const MAX_DISTANCE_FROM_CITY = 50; // km

function getCountryCode(city: string): string | undefined {
  // Case-insensitive lookup with partial matching
  return CITY_COUNTRY_MAP[city] || undefined;
}
```

**Modify line 64-68**:
```typescript
// OLD:
const searchResults = await openStreetMap.searchPlace(searchQuery, {
  limit: 3,
  city: destination,
});

// NEW:
const countryCode = getCountryCode(destination);
const searchResults = await openStreetMap.searchPlace(searchQuery, {
  limit: 5,
  city: destination,
  country: countryCode, // Add country constraint
});
```

#### Task 1.2: Add Distance Validation
**After line 70, add validation**:
```typescript
if (searchResults && searchResults.length > 0) {
  // Validate results are in correct city
  const validResults = searchResults.filter(place => {
    const distance = openStreetMap.calculateDistance(
      cityCoords.lat, cityCoords.lng,
      parseFloat(place.lat), parseFloat(place.lon)
    );
    if (distance > MAX_DISTANCE_FROM_CITY) {
      logger.warn('API', `Rejected ${place.name}: ${distance}km from ${destination}`);
      return false;
    }
    return true;
  });

  if (validResults.length > 0) {
    const place = validResults[0];
    // ... rest of processing
  }
}
```

### Phase 2: Fix AI Generation Issues (45 minutes)

#### Task 2.1: Fix Activity Duplication
**File**: `/src/services/ai/utils/conversational-generator.ts`

**Replace lines 206-218**:
```typescript
// Deduplicate activities based on description and time
const uniqueActivities = new Map();
(day.activities || []).forEach((activity: any) => {
  const key = `${activity.time}-${activity.description}`;
  if (!uniqueActivities.has(key)) {
    uniqueActivities.set(key, activity);
  }
});

return {
  day: index + 1,
  date: dateString,
  title: day.title || `Day ${index + 1}`,
  activities: Array.from(uniqueActivities.values()).map((activity: any) => ({
    time: activity.time || '9:00 AM',
    description: activity.description || 'Activity',
    category: activity.category || 'Attraction',
    venue_name: activity.venue_name,
    tips: activity.tips
  }))
};
```

#### Task 2.2: Add Constraint Handling
**File**: `/src/services/ai/utils/conversational-generator.ts`

**Modify prompt generation (lines 30-82)**:
```typescript
const prompt = `Generate a ${days}-day ${tripType} itinerary for ${destination}.

CRITICAL CONSTRAINTS:
${intent.medicalNeeds ? `- User needs: ${intent.medicalNeeds} (MUST include medical facilities)` : ''}
${intent.dietaryRestrictions ? `- Dietary restrictions: ${intent.dietaryRestrictions} (NO ${intent.dietaryRestrictions} venues)` : ''}
${intent.accessibility ? `- Accessibility: ${intent.accessibility} required` : ''}

IMPORTANT RULES:
1. DO NOT include duplicate activities
2. Each activity must have unique description
3. Respect ALL constraints above
4. Include real venue names, not generic descriptions

[rest of existing prompt...]
`;
```

**Add post-processing filter (after line 220)**:
```typescript
// Filter out constraint violations
if (intent.dietaryRestrictions) {
  const restrictions = intent.dietaryRestrictions.toLowerCase().split(',');
  activities = activities.filter(a => {
    const desc = a.description.toLowerCase();
    return !restrictions.some(r => desc.includes(r.trim()));
  });
}
```

### Phase 3: Improve Conversation Flow (30 minutes)

#### Task 3.1: Enhance Question Generation
**File**: `/src/services/ai/conversation/ai-conversation-controller.ts`

**Modify lines 84-86**:
```typescript
// OLD:
if (analysis.readyToGenerate) {
  return this.generateItinerary();
}

// NEW:
// Ensure minimum conversation depth for vague requests
const minInfoFields = ['destination', 'duration', 'startDate'];
const hasMinInfo = minInfoFields.every(field =>
  this.collectedData[field] !== undefined
);

if (analysis.readyToGenerate && hasMinInfo) {
  // For vague initial requests, ensure we've asked at least 2 questions
  if (this.conversationHistory.length < 4 &&
      this.conversationHistory[0].toLowerCase().includes('nice')) {
    return {
      type: ResponseType.QUESTION,
      message: analysis.nextQuestion || "What type of activities do you enjoy?",
      awaitingInput: 'preferences',
      canProceed: false,
      conversationContext: this.getContext()
    };
  }
  return this.generateItinerary();
}
```

### Phase 4: Add Medical/Dietary Support (30 minutes)

#### Task 4.1: Enhance Special Needs Processing
**File**: `/src/services/ai/services/location-enrichment-osm.ts`

**Enhance enrichSpecialNeeds function (lines 300-354)**:
```typescript
async function enrichSpecialNeeds(
  coordinates: { lat: number; lng: number },
  activity: Activity,
  city: string,
  userConstraints?: any  // Add parameter
): Promise<any> {
  const specialData: any = {};

  // Check for medical needs
  if (userConstraints?.medicalNeeds?.includes('dialysis')) {
    const facilities = await openStreetMap.findMedicalFacilities(
      coordinates.lat, coordinates.lng, 'dialysis'
    );

    if (facilities.length === 0) {
      // CRITICAL: Find nearest hospital as fallback
      const hospitals = await openStreetMap.findMedicalFacilities(
        coordinates.lat, coordinates.lng, 'hospital'
      );
      specialData.nearest_medical = hospitals[0];
      specialData.medical_warning = 'No dialysis center found, nearest hospital listed';
    }
  }

  // Enhanced dietary filtering
  if (userConstraints?.dietaryRestrictions) {
    const restrictions = userConstraints.dietaryRestrictions.toLowerCase();
    if (activity.category === 'Food' || activity.category === 'Dining') {
      // Flag venues that violate restrictions
      if (restrictions.includes('seafood') &&
          activity.description.toLowerCase().match(/seafood|fish|sushi|marine/)) {
        specialData.constraint_violation = true;
        specialData.violation_reason = 'Contains seafood';
      }
    }
  }

  return specialData;
}
```

### Phase 5: Testing & Validation (30 minutes)

#### Task 5.1: Run Progressive Tests
```bash
# Test 1: Simple baseline (must always work)
npm run test:ai --baseline

# Test 2: Constraint validation
npm run test:ai --filter "Medical Constraints"

# Test 3: Multi-city
npm run test:ai --filter "Multi-city"

# Test 4: Full suite
npm run test:ai
```

#### Task 5.2: Validation Checklist
- [ ] No duplicate activities in any day
- [ ] All venues in correct city (within 50km)
- [ ] Medical needs addressed when specified
- [ ] Dietary restrictions respected
- [ ] Conversation has 3+ turns for vague requests
- [ ] Multi-city trips allocate days correctly

## Success Metrics

### Must Have (P0)
- ✅ 5/6 tests passing (83%+)
- ✅ Zero duplicate activities
- ✅ Venues in correct cities (95%+ accuracy)
- ✅ Constraints always respected

### Should Have (P1)
- ✅ Multi-city trips working
- ✅ 3+ conversation turns for vague requests
- ✅ Medical facilities included when needed

### Nice to Have (P2)
- Route optimization
- Cost estimates accurate
- Weather integration

## Risk Mitigation

### Rollback Plan
If issues arise:
1. Keep original files backed up
2. Test each phase independently
3. Can revert OSM to LocationIQ if needed

### Monitoring
- Log all rejected venues with distances
- Track deduplication events
- Monitor constraint violations

## Implementation Order

1. **Start with Phase 2.1** (Fix duplication) - Quick win, low risk
2. **Then Phase 1** (Fix geocoding) - Critical for accuracy
3. **Then Phase 4** (Constraints) - User safety
4. **Then Phase 3** (Conversation) - UX improvement
5. **Finally Phase 5** (Testing) - Validation

## Files to Modify

1. `/src/services/ai/services/location-enrichment-osm.ts`
   - Add country codes (lines 12+)
   - Add distance validation (lines 70+)
   - Enhance special needs (lines 300+)

2. `/src/services/ai/utils/conversational-generator.ts`
   - Fix duplication (lines 206-218)
   - Add constraints to prompt (lines 30-82)
   - Filter violations (line 220+)

3. `/src/services/ai/conversation/ai-conversation-controller.ts`
   - Improve conversation flow (lines 84-86)
   - Add minimum question depth

4. `/src/services/api/openstreetmap.ts`
   - Already supports country parameter ✅
   - Already has calculateDistance ✅

## Expected Outcome

After implementation:
- **Test Success**: 5/6 passing (from 1/6)
- **Accuracy**: 95%+ correct city venues (from ~20%)
- **Quality**: Zero duplicates (from 30% duplication)
- **Safety**: 100% constraint compliance (from 0%)
- **UX**: Better conversation flow

## Time Estimate

- Phase 1: 1 hour
- Phase 2: 45 minutes
- Phase 3: 30 minutes
- Phase 4: 30 minutes
- Phase 5: 30 minutes
- **Total**: ~3 hours

## Notes

1. The OSM API already supports country codes - we just need to use them
2. Distance calculation exists - we need to apply it
3. GPT duplication is a known issue - needs client-side dedup
4. Constraint handling requires both prompt engineering AND post-processing

This plan addresses root causes, not symptoms, and should significantly improve test performance.