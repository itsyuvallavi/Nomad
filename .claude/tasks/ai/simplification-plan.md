# AI System Simplification Plan

**Status**: IN PROGRESS
**Last Updated**: 2025-01-19

## Current State Analysis
**21 files** across 6 directories with overlapping functionality

### Problems:
- 6 conversation files doing similar things
- Multiple generators with duplicate logic
- Default/fallback logic scattered everywhere
- Hard to follow data flow
- Too many abstractions

## Target Architecture: 4 Core Files + 3 Utilities

### Core Files (New)
```
src/services/ai/
├── ai-controller.ts       # Main conversation & state management
├── trip-generator.ts      # Itinerary generation with zones/routing
├── prompts.ts            # All prompts & templates
└── schemas.ts            # TypeScript types (keep as-is)
```

### Utility Files (Keep)
```
src/services/ai/
├── services/
│   └── location-enrichment-locationiq.ts  # Keep for address/coordinates
├── utils/
│   ├── openai-travel-costs.ts            # Keep for cost estimation
│   └── safeChat.ts                       # Keep for safe JSON parsing
```

## Detailed Implementation Plan

### Phase 1: Create New Core Files

#### 1. `ai-controller.ts` (Combines 8 files → 1)
**Status**: ⏳ PENDING
**Consolidates:**
- `conversation/ai-conversation-controller.ts`
- `conversation/conversation-controller.ts`
- `conversation/conversation-state-manager.ts`
- `conversation/ai-powered-analyzer.ts`
- `conversation/response-analyzer.ts`
- `conversation/question-generator.ts`
- `openai-config.ts`
- Parts of `utils/intent-understanding.ts`

**Key Functions:**
```typescript
class AIController {
  // Core conversation flow
  async processMessage(message: string, context?: ConversationContext)

  // State management
  private analyzeUserInput(message: string): ParsedIntent
  private getMissingInfo(intent: ParsedIntent): string[]
  private generateQuestion(missingField: string): string

  // OpenAI interaction
  private async callOpenAI(prompt: string, model?: 'gpt-4' | 'gpt-3.5')
}
```

**Features:**
- Single stateful controller for entire conversation
- No defaults - always asks for missing info
- Tracks: destination, dates, duration, preferences
- Returns either questions or triggers generation

#### 2. `trip-generator.ts` (Combines 5 files → 1)
**Status**: ⏳ PENDING
**Consolidates:**
- `flows/generate-personalized-itinerary.ts`
- `flows/generate-personalized-itinerary-v2.ts`
- `utils/conversational-generator.ts`
- `utils/zone-based-planner.ts`
- `utils/route-optimizer.ts`

**Key Functions:**
```typescript
class TripGenerator {
  // Main generation
  async generateItinerary(params: TripParams): Promise<Itinerary>

  // Zone-based planning
  private planByZones(destination: string, days: number): DayPlan[]

  // Route optimization
  private optimizeDaily(activities: Activity[]): Activity[]

  // Enrichment
  private async enrichWithLocationData(itinerary: Itinerary)
}
```

**Features:**
- Single entry point for generation
- Built-in zone planning (same area per day)
- Route optimization (no backtracking)
- LocationIQ enrichment
- NO DEFAULTS - throws if missing data

#### 3. `prompts.ts` (Consolidates all templates)
**Status**: ⏳ PENDING
**Combines:**
- All prompts from `openai-travel-prompts.ts`
- Question templates (new)
- Conversation responses (new)

**Structure:**
```typescript
export const PROMPTS = {
  // Questions for missing info
  questions: {
    destination: "Where would you like to travel?",
    dates: "When would you like to visit {destination}?",
    duration: "How many days will you be in {destination}?",
  },

  // Generation prompts with zone/routing rules
  generation: {
    itinerary: `...IMPORTANT ROUTING RULES:
      - Group all activities by neighborhood/zone
      - Each day should focus on ONE area
      - Never require 30+ min travel between consecutive activities
      - Plan logical flow: breakfast → morning activity → lunch → afternoon → dinner
      - Ensure walking distance within same time period...`
  }
}
```

### Phase 2: Remove Old Files
**Status**: ⏳ PENDING

#### Files to Delete (17 files):
```
src/services/ai/
├── conversation/           # DELETE entire directory (6 files)
├── flows/
│   ├── generate-personalized-itinerary.ts    # DELETE
│   └── generate-personalized-itinerary-v2.ts # DELETE
├── utils/
│   ├── conversational-generator.ts  # DELETE
│   ├── intent-understanding.ts      # DELETE
│   ├── zone-based-planner.ts       # DELETE (merge into generator)
│   └── route-optimizer.ts          # DELETE (merge into generator)
└── openai-config.ts                # DELETE (merge into controller)
```

#### Files to Keep (4 files):
```
- schemas.ts                         # KEEP as-is
- services/location-enrichment-locationiq.ts  # KEEP
- utils/openai-travel-costs.ts      # KEEP for cost estimation
- utils/safeChat.ts                 # KEEP for moderation
```

### Phase 3: Update Integration Points
**Status**: ⏳ PENDING

#### 1. API Route (`/app/api/ai/generate-itinerary-v2/route.ts`)
```typescript
// OLD
import { generatePersonalizedItineraryV2 } from '@/services/ai/flows/...'

// NEW
import { AIController } from '@/services/ai/ai-controller'
const controller = new AIController()
const response = await controller.processMessage(prompt, context)
```

#### 2. UI Component (`/pages/itinerary/ItineraryPage.tsx`)
```typescript
// Update imports and API calls
// Handle questions vs itineraries in response
```

### Phase 4: Testing Strategy

#### Test Cases:
1. **Conversation Flow**
   - "I want to travel" → Asks for destination
   - "Paris" → Asks for dates
   - "Next week for 5 days" → Generates itinerary

2. **Zone-Based Planning**
   - Verify activities grouped by neighborhood
   - Check no excessive travel between activities
   - Validate logical time flow

3. **No Defaults**
   - Empty input → Question (not default)
   - Missing dates → Question (not tomorrow)
   - Missing duration → Question (not 3 days)

### Phase 5: Migration Steps

#### Day 1: Setup
1. Create new file structure
2. Write `ai-controller.ts`
3. Write `trip-generator.ts`
4. Write `prompts.ts`

#### Day 2: Integration
1. Update API routes
2. Update UI components
3. Test basic flow

#### Day 3: Cleanup
1. Remove old files
2. Fix any broken imports
3. Run full test suite

### Benefits of This Approach

1. **75% fewer files** (21 → 4)
2. **Clear data flow** - One controller, one generator
3. **Better routing logic** - Built into core, not scattered
4. **Easier OSM integration** - Single point to add POI data
5. **Maintainable** - Know exactly where each feature lives
6. **No defaults** - Enforced at architecture level

### Risk Mitigation

1. **Backup current code** before changes
2. **Test each phase** before proceeding
3. **Keep old files** temporarily (rename with .old)
4. **Gradual migration** - Can run old & new in parallel

### Success Metrics

- ✅ 4 core files instead of 21
- ✅ All tests passing
- ✅ Conversation flow working
- ✅ Zone-based planning active
- ✅ No default destinations/dates
- ✅ Ready for OSM integration

## Implementation Order

### Step 1: Create Core Files (Do First)
1. ✅ Update this plan document
2. ⏳ Create `ai-controller.ts` - Conversation management
3. ⏳ Create `trip-generator.ts` - Generation with zones
4. ⏳ Create `prompts.ts` - All templates

### Step 2: Test in Isolation
1. ⏳ Test conversation flow
2. ⏳ Test generation with zone planning
3. ⏳ Verify no defaults used

### Step 3: Integration
1. ⏳ Update API route to use new controller
2. ⏳ Update UI to handle questions
3. ⏳ Test end-to-end flow

### Step 4: Cleanup
1. ⏳ Remove old conversation files
2. ⏳ Remove old flow files
3. ⏳ Remove deprecated utils
4. ⏳ Fix any broken imports

### Step 5: Enhancement
1. ⏳ Strengthen zone-based logic
2. ⏳ Add better routing validation
3. ⏳ Prepare for OSM integration

## Key Features to Preserve

### Must Keep Working:
- ✅ Conversational flow (ask for missing info)
- ✅ Zone-based planning (same area per day)
- ✅ Route optimization (no backtracking)
- ✅ Location enrichment (real addresses)
- ✅ Cost estimation (flight/hotel prices)
- ✅ Modification support (change after generation)
- ✅ NO DEFAULTS (never assume)

### New Requirements:
- 📍 Logical daily flow (breakfast → activities → lunch → activities → dinner)
- 📍 No 30+ minute detours
- 📍 Walking distance within time slots
- 📍 OSM integration ready

## Progress Tracking

| File | Status | Notes |
|------|--------|-------|
| simplification-plan.md | ✅ Updated | Plan documented |
| ai-controller.ts | ✅ Created | Conversation logic implemented |
| trip-generator.ts | ✅ Created | Zone-based generation ready |
| prompts.ts | ✅ Created | All templates consolidated |
| API route update | ✅ Updated | Using new simplified structure |
| UI update | ⏳ Pending | Next step |
| Old file removal | ⏳ Pending | After everything works |

---

**Implementation Status**: Ready to begin creating core files