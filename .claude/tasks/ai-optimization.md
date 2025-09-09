# AI Optimization Plan - Nomad Navigator

## Current State Analysis

After reviewing the codebase, I've identified several optimization efforts already in progress:

### Existing Implementations
1. **Ultra-Fast Generator** (`enhanced-generator-ultra-fast.ts`) - Uses GPT-3.5-turbo for speed
2. **Optimized Generator** (`enhanced-generator-optimized.ts`) - Parallel API calls with caching
3. **V2 Generator** (`enhanced-generator-v2.ts`) - Alternative implementation
4. **Intelligent Trip Extractor** - Smart parsing of trip details

### Current Performance
- Baseline test (3 days in London): ~8.2 seconds
- Using parallel API calls for venues and weather
- Caching implemented with TTL
- GPT-3.5-turbo for extraction (faster than GPT-4)

### Issues Identified
1. **Repetitive venue assignments** - Same restaurant (Carlotta) used multiple times
2. **High latency** - 8+ seconds for simple requests
3. **Complex architecture** - Multiple generator versions causing confusion
4. **Inefficient prompting** - Long system prompts increasing token usage

## Improvement Plan

### Phase 1: Immediate Optimizations (Quick Wins)

#### 1.1 Fix Venue Diversity Issue
**Problem**: Same venues being reused across activities
**Solution**: Improve venue selection algorithm
- Track used venues per day
- Implement round-robin selection
- Better category matching

#### 1.2 Optimize Prompt Engineering
**Problem**: Verbose prompts consuming tokens and time
**Solution**: Streamline prompts
- Use JSON schema enforcement
- Remove redundant instructions
- Create minimal, focused prompts

#### 1.3 Improve Caching Strategy
**Problem**: Cache not fully utilized
**Solution**: Enhanced caching
- Pre-warm cache on server start
- Longer TTL for stable data (places, weather)
- Cache entire itinerary chunks for common requests

### Phase 2: Architecture Refactoring

#### 2.1 Consolidate Generators
**Problem**: Multiple generator versions causing confusion
**Solution**: Single optimized pipeline
- Merge best features from all versions
- Remove redundant implementations
- Clear fallback strategy

#### 2.2 Implement Streaming Response
**Problem**: Users wait for entire generation
**Solution**: Stream partial results
- Send destination info immediately
- Stream days as they're generated
- Progressive enhancement with venues/weather

#### 2.3 Parallel Processing Enhancement
**Problem**: Some operations still sequential
**Solution**: Maximum parallelization
- Generate all days simultaneously
- Batch all API calls upfront
- Async venue/weather enrichment

### Phase 3: Advanced Optimizations

#### 3.1 Implement Response Templates
**Problem**: Generating similar content repeatedly
**Solution**: Template-based generation
- Pre-built activity templates by category
- City-specific popular itineraries
- Mix templates with AI customization

#### 3.2 Add Request Deduplication
**Problem**: Similar requests processed multiple times
**Solution**: Smart request handling
- Hash-based request identification
- Return cached results for identical requests
- Slight variations use base template + modifications

#### 3.3 Implement Predictive Pre-generation
**Problem**: Cold start for each request
**Solution**: Anticipate common requests
- Pre-generate popular destinations
- Background processing during idle time
- Instant response for common queries

## Implementation Tasks

### Priority 1 (Today)
- [ ] Fix venue diversity algorithm
- [ ] Optimize prompt templates
- [ ] Enhance caching with pre-warming
- [ ] Consolidate to single generator

### Priority 2 (Tomorrow)
- [ ] Implement streaming responses
- [ ] Add request deduplication
- [ ] Create activity templates

### Priority 3 (Future)
- [ ] Build predictive pre-generation
- [ ] Add monitoring and metrics
- [ ] Implement A/B testing framework

## Success Metrics
- **Target response time**: < 3 seconds for simple trips
- **Venue diversity**: No repeated venues in single day
- **Cache hit rate**: > 50% for popular destinations
- **User satisfaction**: Reduced "thinking" time perception

## Technical Implementation Details

### Venue Diversity Fix
```typescript
// Track used venues per destination
const usedVenues = new Map<string, Set<string>>();

// Select venue with diversity
function selectVenue(venues: any[], city: string): any {
  const cityUsed = usedVenues.get(city) || new Set();
  
  // First try: unused venues
  for (const venue of venues) {
    if (!cityUsed.has(venue.place_id)) {
      cityUsed.add(venue.place_id);
      usedVenues.set(city, cityUsed);
      return venue;
    }
  }
  
  // Fallback: random selection
  return venues[Math.floor(Math.random() * venues.length)];
}
```

### Optimized Prompt Template
```typescript
const FAST_EXTRACTION_PROMPT = `Extract: origin, destinations[], days (number).
Examples:
"3 days in Paris from NYC" -> {origin:"NYC",destinations:[{city:"Paris",days:3}]}
"London 2 days then Rome 3 days" -> {destinations:[{city:"London",days:2},{city:"Rome",days:3}]}

Input: [USER_PROMPT]
Output (JSON):`;
```

### Streaming Implementation
```typescript
async function* streamItinerary(prompt: string) {
  // Quick extraction
  yield { type: 'destinations', data: extractedInfo };
  
  // Generate days in parallel, yield as ready
  for await (const day of generateDaysParallel()) {
    yield { type: 'day', data: day };
  }
  
  // Enrich with venues/weather asynchronously
  yield { type: 'enrichment', data: enrichedData };
}
```

## Next Steps
1. Review this plan with the team
2. Prioritize based on impact vs effort
3. Begin implementation with Phase 1
4. Monitor metrics after each change
5. Iterate based on performance data

## Notes
- Current codebase shows good foundation with parallel processing
- Main bottleneck appears to be OpenAI API latency
- Venue repetition is a quality issue, not performance
- Consider migrating to edge functions for geographic distribution