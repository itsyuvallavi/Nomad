# Multi-City Trip Testing & Fix Plan

## Status: TODO
**Created**: January 21, 2025
**Priority**: HIGH - Must complete before production deployment

## Overview
Test and fix multi-city trip generation to ensure proper day allocation, city transitions, and data integrity.

## Test Scenarios

### 1. Basic Multi-City (2 Cities)
- [ ] "3 days in London then 2 days in Paris"
- [ ] "Weekend in Rome and Florence"
- [ ] "5 days split between Barcelona and Madrid"

**Expected Behavior**:
- Days properly allocated (London: 3, Paris: 2)
- No duplicate destinations
- Smooth transitions between cities
- Cost estimates for both cities

### 2. Complex Multi-City (3+ Cities)
- [ ] "7 days: 3 in Tokyo, 2 in Kyoto, 2 in Osaka"
- [ ] "10 day Europe trip: London, Paris, Rome, Barcelona"
- [ ] "2 weeks across Berlin, Prague, Vienna, Budapest"

**Expected Behavior**:
- Correct day distribution per city
- Proper ordering of destinations
- No missing days or overlap
- All cities have activities

### 3. Extension Scenarios
- [ ] Start: "3 days in London" → Add: "then 2 days in Paris"
- [ ] Start: "Weekend in NYC" → Add: "extend with 3 days in Boston"
- [ ] Start: "5 days Tokyo" → Add: "add Kyoto after"

**Expected Behavior**:
- Original itinerary preserved
- New destinations appended
- Total duration updated
- Conversation context maintained

### 4. Edge Cases
- [ ] Uneven distribution: "7 days across 3 cities"
- [ ] Same city twice: "London 2 days, Paris 3 days, back to London 1 day"
- [ ] Very short stays: "5 cities in 5 days"
- [ ] Very long trip: "30 days across 10 cities"

**Expected Behavior**:
- Smart day allocation
- Handle returns to same city
- Minimum viable days per city
- No timeout errors

## Known Issues to Fix

### 1. Day Allocation Logic
**File**: `/src/services/ai/prompts.ts`
**Issue**: Uneven distribution for odd day counts
**Fix**: Implement smart distribution algorithm

### 2. City Toggle Navigation
**File**: `/src/components/itinerary-components/itinerary/ItineraryDisplay.tsx`
**Issue**: City toggles may not work for 3+ cities
**Fix**: Test and fix toggle state management

### 3. Token Limits
**File**: `/src/services/ai/ai-controller.ts`
**Issue**: Complex trips may hit token limits
**Fix**: Dynamic token allocation based on city count

### 4. Timeout Handling
**File**: `/src/app/api/ai/route.ts`
**Issue**: 45s timeout may be insufficient for 5+ cities
**Fix**: Progressive timeout based on complexity

## Testing Procedure

### Step 1: Server-Side Testing (API & AI)
**Test Script**: `/scripts/test-multi-city-server.ts`

1. **Direct AI Controller Testing**
   - Test intent extraction for multi-city prompts
   - Verify destination deduplication
   - Check duration calculation
   - Validate day distribution logic

2. **API Endpoint Testing**
   - POST to `/api/ai` with multi-city prompts
   - Verify response structure
   - Check all cities have data
   - Validate cost calculations

3. **Data Validation**
   ```typescript
   // Expected response structure
   {
     destinations: ["London", "Paris"],
     duration: 5,
     days: [
       { day: 1, date: "2025-01-22", city: "London", activities: [...] },
       { day: 2, date: "2025-01-23", city: "London", activities: [...] },
       { day: 3, date: "2025-01-24", city: "London", activities: [...] },
       { day: 4, date: "2025-01-25", city: "Paris", activities: [...] },
       { day: 5, date: "2025-01-26", city: "Paris", activities: [...] }
     ],
     cost: { total: 2500, flights: 800, accommodation: 1000, dailyExpenses: 700 }
   }
   ```

### Step 2: Client-Side Testing (UI)

1. **Initial Rendering**
   - [ ] All cities appear in toggle buttons
   - [ ] Correct number of days per city
   - [ ] Dates display correctly (no off-by-one)
   - [ ] Activities load for each day

2. **City Navigation**
   - [ ] Toggle between cities works
   - [ ] "Show All" displays complete itinerary
   - [ ] Active city highlighted correctly
   - [ ] Smooth scrolling to city sections

3. **Data Persistence**
   - [ ] Refresh page - itinerary remains
   - [ ] Check localStorage has conversation context
   - [ ] Extension prompts preserve original data

4. **Visual Elements**
   - [ ] Map shows all city markers (if applicable)
   - [ ] Timeline shows city transitions
   - [ ] Export includes all cities
   - [ ] Cost breakdown per city visible

### Step 3: Integration Testing

1. **Full User Flow**
   ```
   User Input → AI Processing → API Response → UI Display → User Interaction
   ```

2. **Test Each Stage**:
   - Input: "3 days London, 2 days Paris"
   - Processing: Check server logs for timing
   - Response: Validate JSON structure
   - Display: Verify UI shows 5 days total
   - Interaction: Test city toggles, export

3. **Extension Flow**
   - Start: Generate "3 days in London"
   - Extend: "Add 2 days in Paris"
   - Verify: Original London data preserved
   - Check: Paris appended, not replaced

### Step 4: Automated Test Suite
Create two test scripts:

**Server Test**: `/scripts/test-multi-city-server.ts`
```typescript
import { extractTravelIntent } from '@/services/ai/ai-controller';
import { generateItinerary } from '@/services/ai/trip-generator';

const serverTests = [
  {
    name: "Basic 2-city extraction",
    prompt: "3 days London, 2 days Paris",
    validate: (result) => {
      assert(result.destinations.length === 2);
      assert(result.duration === 5);
      assert(result.destinations[0] === "London");
      assert(result.destinations[1] === "Paris");
    }
  },
  // ... more tests
];
```

**UI Test**: `/scripts/test-multi-city-ui.ts`
```typescript
// Using Puppeteer or Playwright
const uiTests = [
  {
    name: "City toggle functionality",
    steps: async (page) => {
      await page.goto('/itinerary/test-id');
      await page.waitForSelector('.city-toggle');
      const toggles = await page.$$('.city-toggle');
      assert(toggles.length === 2); // For 2-city trip
      await toggles[1].click(); // Click Paris
      await page.waitForSelector('[data-city="Paris"]');
    }
  },
  // ... more tests
];
```

### Step 5: Performance Testing
- Measure response time per city count
- Monitor token usage
- Check memory consumption
- Verify no timeout errors
- Test UI rendering speed with large itineraries

## Implementation Fixes

### Fix 1: Smart Day Distribution
```typescript
// In prompts.ts
function distributeDays(totalDays: number, cityCount: number): number[] {
  const baseDays = Math.floor(totalDays / cityCount);
  const remainder = totalDays % cityCount;
  const distribution = Array(cityCount).fill(baseDays);

  // Add remainder days to first cities
  for (let i = 0; i < remainder; i++) {
    distribution[i]++;
  }

  return distribution;
}
```

### Fix 2: Dynamic Token Allocation
```typescript
// In ai-controller.ts
function calculateMaxTokens(cityCount: number): number {
  const baseTokens = 4000;
  const tokensPerCity = 1000;
  return Math.min(baseTokens + (cityCount * tokensPerCity), 8000);
}
```

### Fix 3: Progressive Timeout
```typescript
// In route.ts
function calculateTimeout(destinations: string[]): number {
  const baseTimeout = 30000; // 30s
  const timeoutPerCity = 10000; // 10s per city
  return Math.min(baseTimeout + (destinations.length * timeoutPerCity), 120000);
}
```

## Success Criteria

### Server-Side Success
- [ ] Intent extraction identifies all cities correctly
- [ ] Day distribution matches request (e.g., "3 days London" = exactly 3)
- [ ] No duplicate destinations in response
- [ ] All API calls complete without timeout
- [ ] Cost calculations include all cities
- [ ] Response time < 10s for 3-city trips

### UI Success
- [ ] All cities visible in toggle buttons
- [ ] City toggle navigation works smoothly
- [ ] Dates display correctly (no off-by-one errors)
- [ ] Each day shows 5-6 activities
- [ ] Cost breakdown visible for trip
- [ ] Export includes complete itinerary
- [ ] Page refresh preserves data

### Integration Success
- [ ] All basic scenarios pass (100%)
- [ ] Complex scenarios pass (>90%)
- [ ] Extension scenarios maintain context
- [ ] No console errors in browser
- [ ] localStorage properly updated
- [ ] Conversation history maintained

## Files to Modify
1. `/src/services/ai/prompts.ts` - Day distribution logic
2. `/src/services/ai/ai-controller.ts` - Token management
3. `/src/app/api/ai/route.ts` - Timeout handling
4. `/src/components/itinerary-components/itinerary/ItineraryDisplay.tsx` - City navigation
5. `/src/services/ai/trip-generator.ts` - Ensure proper city data structure

## Verification Steps
1. Run all test scenarios
2. Check console for errors
3. Verify localStorage persistence
4. Test page refresh behavior
5. Validate cost calculations
6. Check venue accuracy per city

## Rollback Plan
If fixes introduce new issues:
1. Git revert to commit: `2012b68` (last stable)
2. Re-apply only tested fixes
3. Deploy incrementally

## Notes
- Multi-city support was added yesterday but needs thorough testing
- GPT-4o-mini handles complex prompts better than GPT-3.5
- HERE API batch requests can handle multiple cities efficiently
- Consider caching popular city combinations

## Next Steps After Testing
1. Document test results
2. Fix any identified issues
3. Re-test failed scenarios
4. Update session summary
5. Proceed with production deployment