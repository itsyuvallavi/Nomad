# AI Bug: Destination Mismatch - CRITICAL

## Status: TODO
## Created: 2025-09-11
## Priority: CRITICAL
## Bug Report ID: BUG-001

## Issue Description
User requested "7 Days in London" but received an itinerary for "Bali, Indonesia" instead. This is a critical bug that completely breaks the core functionality of the application.

## Evidence
- **Request Time**: 2025-09-11T10:49:58.913Z
- **Request ID**: req_1757587798913_ie56yn
- **User Input**: "7 Days in London"
- **AI Response**: "7-Day Adventure in Bali, Indonesia"
- **Model Used**: gpt-4o-mini
- **Strategy**: ultra-fast -> unified (fallback occurred)

## Bug Analysis

### Timeline of Events
1. **10:49:58** - User requests "7 Days in London"
2. **10:50:01** - First attempt fails with "No destinations found in prompt" error
3. **10:50:44** - System retries with unified strategy
4. **10:50:44** - Returns Bali, Indonesia instead of London

### Root Cause Hypothesis
1. **Destination Extraction Failure**: The AI failed to extract "London" as the destination
2. **Fallback Logic Issue**: When retrying, the system may be using a default/random destination
3. **Prompt Engineering Problem**: The prompt sent to GPT may not be properly formatted
4. **Context Contamination**: Previous requests might be influencing the current one

## Files to Investigate

### Primary Suspects
1. `src/ai/flows/analyze-initial-prompt.ts` - Destination extraction logic
2. `src/ai/flows/generate-personalized-itinerary.ts` - Main itinerary generation
3. `src/ai/prompts/` - Check all prompt templates
4. `src/ai/schemas.ts` - Verify destination field handling

### Secondary Areas
1. `src/lib/api/ai-service.ts` - API integration layer
2. `src/components/chat/chat-container.tsx` - Frontend request handling
3. Error handling and retry logic

## Test Cases to Add

```typescript
// Test 1: Simple destination extraction
test('should extract London from "7 Days in London"', () => {
  const result = extractDestination("7 Days in London");
  expect(result).toBe("London");
});

// Test 2: Verify no cross-contamination
test('should not use previous destinations', () => {
  // Request 1: Paris
  // Request 2: London
  // Should return London, not Paris or random
});

// Test 3: Fallback should maintain destination
test('fallback strategy should preserve original destination', () => {
  // When ultra-fast fails, unified should still use London
});
```

## Immediate Actions Required

### 1. Add Logging
```typescript
// In analyze-initial-prompt.ts
console.log('[AI] Original prompt:', prompt);
console.log('[AI] Extracted destination:', destination);
console.log('[AI] Full context being sent:', context);
```

### 2. Add Validation
```typescript
// Before sending to GPT
if (!destination || destination === '') {
  throw new Error('Destination extraction failed');
}

// After receiving response
if (response.destination !== requestedDestination) {
  console.error('CRITICAL: Destination mismatch!');
  // Retry or throw error
}
```

### 3. Fix Prompt Template
Ensure the prompt explicitly states:
```
Generate a 7-day itinerary for LONDON, ENGLAND ONLY.
Do NOT suggest any other destination.
The user specifically requested: London
```

## Temporary Workaround
Until fixed, users should:
1. Be more explicit: "7 days in London, England, UK"
2. Try multiple times if wrong destination appears
3. Use the feedback feature to report issues

## Success Criteria
- [ ] "7 Days in London" returns London itinerary 100% of the time
- [ ] Destination extraction works for all major cities
- [ ] No cross-contamination between requests
- [ ] Proper error messages when destination unclear
- [ ] Fallback maintains original destination

## Testing Checklist
- [ ] Test "7 Days in London" - should return London
- [ ] Test "3 Days in Paris" - should return Paris
- [ ] Test "Week in Tokyo" - should return Tokyo
- [ ] Test ambiguous: "7 days vacation" - should ask for clarification
- [ ] Test multiple requests in sequence - no contamination
- [ ] Test with typos: "7 days in Londn" - should correct to London

## Related Issues
- Baseline test suite needs these scenarios
- Consider adding destination validation in frontend
- May need to implement destination confirmation step

## Priority: CRITICAL
This completely breaks user trust. Users asking for London and getting Indonesia is unacceptable.

---

**Next Steps:**
1. Run `npm run test:ai --baseline` to verify current state
2. Add extensive logging to trace the issue
3. Fix the prompt engineering
4. Add validation at every step
5. Implement comprehensive tests
6. Deploy fix ASAP