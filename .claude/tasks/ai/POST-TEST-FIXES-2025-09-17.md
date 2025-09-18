# Post-Test Fix Plan
*Based on test results from 2025-09-17*

## Test Results
- **Success Rate:** 2/6 tests (33.3%)
- **Critical Issue:** Constraints not being extracted at all
- **Secondary Issues:** Multi-city trips failing, geocoding problems

## Priority 1: Fix Constraint Detection (CRITICAL)

### Problem
User says: "I use a wheelchair, need dialysis twice weekly, and have a severe seafood allergy"
System extracts: Nothing! These constraints are completely ignored.

### Root Cause
The `ExtractedInfo` interface in `ai-powered-analyzer.ts` doesn't have fields for:
- Dietary restrictions
- Medical needs
- Accessibility requirements

### Solution

#### File: `/src/services/ai/conversation/ai-powered-analyzer.ts`

1. Update ExtractedInfo interface (line 20):
```typescript
export interface ExtractedInfo {
  destination?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: {
    count: number;
    type: string;
  };
  preferences?: {
    activities?: string[];
    budget?: string;
    tripType?: string;
    needsCoworking?: boolean;
  };
  // ADD THESE NEW FIELDS:
  dietaryRestrictions?: string[];  // ["vegetarian", "seafood allergy", etc.]
  medicalNeeds?: string[];         // ["dialysis", "oxygen", etc.]
  accessibilityNeeds?: string[];   // ["wheelchair", "visual impairment", etc.]
  userIntent?: 'plan_trip' | 'modify_trip' | 'ask_question' | 'confirm' | 'cancel';
  modificationRequest?: string;
}
```

2. Update the system prompt (line 53) to include:
```typescript
Extract the following information if present:
- Destination (city, country, or region)
- Travel dates (start date, end date, or general timeframe)
- Duration (number of days)
- Number and type of travelers (solo, couple, family, group)
- Preferences (activities, budget level, trip type, work needs)
- DIETARY RESTRICTIONS (allergies, vegetarian, vegan, halal, kosher, etc.)
- MEDICAL NEEDS (dialysis, oxygen, medications, mobility issues)
- ACCESSIBILITY REQUIREMENTS (wheelchair, hearing aids, visual impairment)
- User intent (planning new trip, modifying existing, asking question, confirming, canceling)
```

3. Update the response format example (line 80):
```typescript
{
  "extractedInfo": {
    "destination": "extracted destination or null",
    "startDate": "extracted date or null",
    "duration": "number of days or null",
    "travelers": {"count": number, "type": "solo/couple/family/group"} or null,
    "preferences": {"activities": [], "budget": "budget/mid/luxury", "tripType": "leisure/business/workation"} or null,
    "dietaryRestrictions": ["list of dietary restrictions/allergies"] or null,
    "medicalNeeds": ["list of medical requirements"] or null,
    "accessibilityNeeds": ["list of accessibility requirements"] or null,
    "userIntent": "plan_trip/modify_trip/ask_question/confirm/cancel",
    "modificationRequest": "if user wants to change something"
  },
  ...
}
```

## Priority 2: Fix Multi-City Token Limits

### Problem
14-day multi-city trips cause JSON truncation errors.

### Solution

#### File: `/src/services/ai/utils/conversational-generator.ts`

Line 122: Increase max_tokens for complex trips:
```typescript
const tokenLimit = days > 7 ? 6000 : 4000;  // More tokens for longer trips

const completion = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [...],
  response_format: { type: 'json_object' },
  temperature: 0.7,
  max_tokens: tokenLimit
});
```

## Priority 3: Fix Pass Constraints to Generator

### Problem
Even when constraints are extracted, they're not passed to the generator.

### Solution

#### File: `/src/services/ai/conversation/ai-conversation-controller.ts`

Line 150: Pass all constraints:
```typescript
const tripData = {
  destination: this.collectedData.destination || 'Paris',
  startDate: this.collectedData.startDate || new Date().toISOString().split('T')[0],
  duration: this.collectedData.duration || 3,
  travelers: this.collectedData.travelers || { count: 1, type: 'solo' },
  preferences: this.collectedData.preferences || {},
  // ADD THESE:
  dietaryRestrictions: this.collectedData.dietaryRestrictions || [],
  medicalNeeds: this.collectedData.medicalNeeds || [],
  accessibilityNeeds: this.collectedData.accessibilityNeeds || []
};
```

#### File: `/src/services/ai/utils/conversational-generator.ts`

Update generateConversationalItinerary to use constraints:
```typescript
const activities = await generateVacationActivities(
  location,
  duration,
  needsCoworking,
  {
    dietaryRestrictions: intent.dietaryRestrictions || [],
    medicalNeeds: intent.medicalNeeds?.join(', '),
    accessibility: intent.accessibilityNeeds?.join(', ')
  }
);
```

## Priority 4: Fix Destination Extraction

### Problem
- "No destination found for day 2, 3, 4..."
- Neighborhoods like "Gothic Quarter" not recognized

### Solution

#### File: `/src/services/ai/services/location-enrichment-osm.ts`

Update extractDestination function (line 510):
```typescript
function extractDestination(day: Day): string {
  // Try various fields
  if ('destination' in day && day.destination) {
    return day.destination as string;
  }
  if ('destination_city' in day && day.destination_city) {
    return day.destination_city as string;
  }
  if ('_destination' in day && day._destination) {
    return day._destination as string;
  }
  // ... rest of existing logic
}
```

## Priority 5: Fix Question Loop

### Problem
When user says "use reasonable defaults", system keeps asking same question.

### Solution

#### File: `/src/services/ai/conversation/ai-conversation-controller.ts`

Line 91: Add check for "use defaults":
```typescript
// Check if user wants to use defaults
const messageText = message.toLowerCase();
if (messageText.includes('default') || messageText.includes('whatever')) {
  // Skip additional questions and generate with what we have
  if (this.collectedData.destination && this.collectedData.duration) {
    return this.generateItinerary();
  }
}
```

## Expected Improvements After These Fixes

1. **Constraint Detection:** ✅ Wheelchair, dialysis, allergies will be detected
2. **Multi-City Trips:** ✅ 14-day trips will generate without truncation
3. **Geocoding:** ✅ Better handling of neighborhoods and multi-day destinations
4. **Conversation Flow:** ✅ Won't loop when user says "use defaults"
5. **Success Rate:** Should improve from 33% to 70%+

## Implementation Order

1. Fix constraint extraction (Priority 1) - 30 minutes
2. Fix token limits (Priority 2) - 10 minutes
3. Pass constraints properly (Priority 3) - 20 minutes
4. Fix destination extraction (Priority 4) - 15 minutes
5. Fix question loop (Priority 5) - 10 minutes
6. Run tests again - 10 minutes

**Total Time:** ~1.5 hours

## Validation

Run tests after each fix:
```bash
npm run test:ai:challenge
```

Focus on:
- Specific Constraints Test (must detect wheelchair, dialysis, seafood allergy)
- Complex Multi-City Trip (must generate without JSON errors)
- Stress Test (must not loop on "use defaults")