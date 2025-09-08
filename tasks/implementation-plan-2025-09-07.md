# Implementation Plan: OpenAI & Unsplash Integration + Multi-Destination Fix
*Date: September 7, 2025*

## 🎯 OBJECTIVES
1. Replace Gemini with OpenAI (GPT-4) for better multi-destination handling
2. Integrate Unsplash API for high-quality destination images
3. Fix multi-destination parsing issues
4. Add comprehensive console logging for all API calls
5. Improve error handling and retry logic

---

## 🔴 CRITICAL ISSUES TO FIX

### Issue #1: Multi-Destination Failure
**Current:** Only generates 2 out of 6 requested destinations
**Root Cause:** Gemini Flash model limitations + token limits + excessive tool requirements
**Solution:** Switch to OpenAI GPT-4 + better prompt engineering + chunking

### Issue #2: No Real Images
**Current:** Using placeholder images from picsum.photos
**Solution:** Integrate Unsplash API for real destination photos

### Issue #3: Poor API Logging
**Current:** Minimal console logging, hard to debug
**Solution:** Comprehensive logging system with timing and status

### Issue #4: No Input Pre-Processing
**Current:** Raw user input sent directly to AI
**Solution:** Parse and structure input before AI processing

### Issue #5: No Error Recovery
**Current:** Single attempt, fails silently
**Solution:** Retry logic with exponential backoff

---

## 📋 STEP-BY-STEP IMPLEMENTATION PLAN

### Phase 1: OpenAI Integration (Priority: CRITICAL)

#### Step 1.1: Install OpenAI SDK
```bash
npm install openai
```

#### Step 1.2: Create OpenAI Configuration
**File:** `src/ai/openai-config.ts`
- Initialize OpenAI client
- Configure GPT-4 model settings
- Add error handling wrapper

#### Step 1.3: Create New Genkit Provider
**File:** `src/ai/providers/openai-provider.ts`
- Wrap OpenAI in Genkit-compatible interface
- Implement streaming support
- Add token counting

#### Step 1.4: Update Genkit Configuration
**File:** `src/ai/genkit.ts`
- Switch from Gemini to OpenAI
- Use GPT-4 model
- Increase token limits

#### Step 1.5: Optimize Prompts for GPT-4
**File:** `src/ai/flows/generate-personalized-itinerary.ts`
- Rewrite prompt for GPT-4 style
- Reduce tool call requirements
- Add structured output format

---

### Phase 2: Unsplash API Integration (Priority: HIGH)

#### Step 2.1: Create Unsplash Service
**File:** `src/lib/api/unsplash.ts`
- Initialize Unsplash client
- Implement image search function
- Add caching layer

#### Step 2.2: Update Image Components
**File:** `src/components/figma/ImageWithFallback.tsx`
- Replace picsum with Unsplash
- Add loading states
- Implement fallback chain

#### Step 2.3: Add Image Fetching to Itinerary
**File:** `src/components/figma/ItineraryPanel.tsx`
- Fetch destination images from Unsplash
- Cache images in session storage
- Add attribution as required by Unsplash

---

### Phase 3: Fix Multi-Destination Parsing (Priority: CRITICAL)

#### Step 3.1: Create Input Parser
**File:** `src/ai/utils/destination-parser.ts`
- Extract all destinations from user input
- Parse durations for each destination
- Identify origin and return locations
- Handle typos and variations

#### Step 3.2: Implement Chunking Strategy
**File:** `src/ai/flows/generate-personalized-itinerary.ts`
- Break long trips into segments
- Generate each destination separately
- Merge results into complete itinerary

#### Step 3.3: Add Validation Layer
**File:** `src/ai/utils/itinerary-validator.ts`
- Verify all destinations included
- Check duration matches request
- Validate activity completeness

---

### Phase 4: Comprehensive Logging (Priority: HIGH)

#### Step 4.1: Create Logger Service
**File:** `src/lib/logger.ts`
- Centralized logging with levels
- Console output with formatting
- Performance timing
- API call tracking

#### Step 4.2: Add API Call Logging
- Log all OpenAI requests/responses
- Log Unsplash image fetches
- Log Foursquare place searches
- Log weather API calls

#### Step 4.3: Add Debug UI
**File:** `src/components/debug-panel.tsx`
- Show API call history
- Display token usage
- Show generation progress
- Error details

---

### Phase 5: Error Recovery (Priority: MEDIUM)

#### Step 5.1: Implement Retry Logic
**File:** `src/ai/utils/retry-handler.ts`
- Exponential backoff
- Max retry limits
- Partial result handling

#### Step 5.2: Add Fallback Strategies
- Fallback to simpler prompts
- Use cached results when available
- Provide partial itineraries

---

## 🛠️ IMPLEMENTATION ORDER

### Today (September 7): OpenAI Setup
1. ✅ Check environment variables
2. Install OpenAI SDK
3. Create OpenAI provider
4. Update Genkit configuration
5. Test basic generation

### September 8: Multi-Destination Fix
1. Create destination parser
2. Implement chunking strategy
3. Add validation layer
4. Update prompt for better parsing
5. Test with complex itineraries

### September 9: Unsplash Integration
1. Create Unsplash service
2. Update image components
3. Add image caching
4. Implement attribution
5. Test image loading

### September 10: Logging & Error Handling
1. Create logger service
2. Add API call logging
3. Implement retry logic
4. Add debug panel
5. Test error scenarios

---

## 📁 FILES TO CREATE

```
src/
├── ai/
│   ├── providers/
│   │   └── openai-provider.ts      # NEW: OpenAI Genkit provider
│   ├── utils/
│   │   ├── destination-parser.ts   # NEW: Parse destinations from input
│   │   ├── itinerary-validator.ts  # NEW: Validate generated itineraries
│   │   └── retry-handler.ts        # NEW: Retry logic with backoff
│   └── openai-config.ts           # NEW: OpenAI configuration
├── lib/
│   ├── api/
│   │   └── unsplash.ts            # NEW: Unsplash API integration
│   └── logger.ts                   # NEW: Centralized logging
└── components/
    └── debug-panel.tsx             # NEW: Debug information panel
```

---

## 📁 FILES TO MODIFY

```
src/
├── ai/
│   ├── genkit.ts                  # Switch to OpenAI
│   └── flows/
│       └── generate-personalized-itinerary.ts  # Optimize for GPT-4
├── components/
│   └── figma/
│       ├── ImageWithFallback.tsx  # Use Unsplash
│       └── ItineraryPanel.tsx     # Fetch real images
└── lib/
    └── api-validation.ts          # Add OpenAI/Unsplash validation
```

---

## 🧪 TEST SCENARIOS

### Test 1: Complex Multi-Destination
```
"plan a trip to Zimbabwe from Melbourne on January next year, 
after Zimbabwe i want to visit Nicaragua for a week, 
then spend a week in Madagascar, then a week in Ethiopia 
and finally before going back home to LA, 
i want to visit Denmark for 3 days."
```
**Expected:** 35+ day itinerary with all 6 destinations

### Test 2: Simple Two-City
```
"3 days in Paris then 4 days in London"
```
**Expected:** 7 day itinerary with both cities

### Test 3: Image Loading
- Verify Unsplash images load for each destination
- Check fallback works if Unsplash fails
- Ensure attribution is displayed

### Test 4: API Logging
- Verify all API calls are logged to console
- Check timing information is accurate
- Ensure errors are properly logged

---

## 🎯 SUCCESS METRICS

1. **Multi-destination Success Rate:** >95% (currently 0%)
2. **Generation Time:** <10 seconds for simple, <20 seconds for complex
3. **Image Load Success:** >90% with Unsplash
4. **API Call Visibility:** 100% logged to console
5. **Error Recovery Rate:** >80% successful retry

---

## ⚠️ RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API rate limits | Generation fails | Implement queuing and caching |
| Unsplash quota exceeded | No images | Fallback to picsum.photos |
| GPT-4 costs higher | Budget overrun | Use GPT-3.5 for simple trips |
| Breaking changes | App doesn't work | Keep Gemini as fallback option |

---

## 📝 NOTES

- OpenAI GPT-4 is more expensive but much better at following complex instructions
- Unsplash requires attribution - must display photographer credit
- Console logging should be removable for production via environment variable
- Consider implementing streaming responses for better UX
- May need to adjust prompt tokens based on GPT-4 pricing

---

## ✅ DEFINITION OF DONE

- [ ] All 5 destinations generated correctly for test case
- [ ] Real destination images from Unsplash displayed
- [ ] All API calls logged to browser console with timing
- [ ] Retry logic handles transient failures
- [ ] No console errors in development mode
- [ ] Generation time under 20 seconds for complex trips
- [ ] User can see progress during generation

---

## 🚀 NEXT STEPS AFTER IMPLEMENTATION

1. Add streaming responses for real-time generation
2. Implement cost tracking for API usage
3. Add user preferences persistence
4. Create automated test suite
5. Optimize for mobile devices
6. Add offline support with PWA

---

*This plan created on September 7, 2025 prioritizes fixing the critical multi-destination bug while adding the requested OpenAI and Unsplash integrations.*