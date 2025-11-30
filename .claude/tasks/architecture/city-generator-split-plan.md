# City Generator Split Plan
**File**: `src/services/ai/progressive/city-generator.ts`
**Current Size**: 441 lines
**Target Size**: ~200 lines (main class)

## Split Strategy

### New Files to Create:

#### 1. `progressive/utils/json-repair.ts` (~80 lines)
**Purpose**: JSON parsing and repair utilities
**Exports**:
- `parseAIResponse(content: string): any`
- `repairMalformedJSON(jsonStr: string): any`

**Extracted from**: Lines 262-340
- `parseResponse()` method logic

#### 2. `progressive/utils/prompt-builder.ts` (~50 lines)
**Purpose**: Build prompts for city generation
**Exports**:
- `buildCityPrompt(params: CityGenerationParams): string`

**Extracted from**: Lines 217-257
- `buildPrompt()` method logic

#### 3. `progressive/utils/city-validator.ts` (~110 lines)
**Purpose**: Validation and fixing of city itineraries
**Exports**:
- `validateAndFixItinerary(parsed: Partial<CityItinerary>, params: CityGenerationParams): { days: DayPlan[] }`
- `addMissingDays(days: DayPlan[], params: CityGenerationParams): void`
- `getDefaultActivities(city: string): Activity[]`

**Extracted from**: Lines 345-441
- `validateAndFix()` method
- `addMissingDays()` method
- `getDefaultActivities()` method
- `getNextDate()` helper

#### 4. Keep in `city-generator.ts` (~200 lines):
- Class definition and constructor
- OpenAI client management
- Cache management (get/set/clear)
- Main `generateCityItinerary()` orchestration method
- Calls to the extracted utilities

## Implementation Steps:

1. Create `progressive/utils/` directory
2. Create `json-repair.ts` with JSON parsing logic
3. Create `prompt-builder.ts` with prompt generation
4. Create `city-validator.ts` with validation logic
5. Update `city-generator.ts` to use the new utilities
6. Test that generation still works

## File Size Breakdown (After Split):

| File | Lines | Purpose |
|------|-------|---------|
| `city-generator.ts` | ~200 | Main class & orchestration |
| `utils/json-repair.ts` | ~80 | JSON parsing & repair |
| `utils/prompt-builder.ts` | ~50 | Prompt generation |
| `utils/city-validator.ts` | ~110 | Validation & defaults |
| **TOTAL** | 440 | (Same logic, better organized) |

## Benefits:

1. ✅ Each file under 350-line limit
2. ✅ Single Responsibility Principle
3. ✅ Utilities can be reused by parallel-city-generator
4. ✅ Easier to test individual components
5. ✅ Better code organization

Ready to implement?
