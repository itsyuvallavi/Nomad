# AI Services

Core AI functionality for Nomad Navigator's intelligent trip planning system.

## Architecture Overview

The AI service uses a modular architecture with specialized components for different aspects of trip planning.

### Main Components

#### Core Files (Ultra-Modular Design)
- **ai-controller.ts** (387 lines) - Main AI orchestrator handling intent extraction and conversation flow
- **trip-generator.ts** (248 lines) - Orchestrates complete itinerary generation using specialized modules
- **progressive-generator.ts** (211 lines) - Progressive itinerary generation for streaming UX

### Module Organization

```
src/services/ai/
├── Core Orchestrators (< 400 lines each)
│   ├── ai-controller.ts
│   ├── trip-generator.ts
│   └── progressive-generator.ts
│
├── modules/ (AI Controller Support)
│   ├── intent-parser.ts - Natural language processing
│   ├── conversation-manager.ts - State management
│   ├── cache-manager.ts - Response caching
│   └── response-formatter.ts - Output formatting
│
├── generators/ (Trip Generator Support)
│   ├── route-optimizer.ts - Zone-based optimization
│   ├── cost-estimator.ts - Budget calculations
│   ├── prompt-builder.ts - GPT prompt construction
│   ├── itinerary-validator.ts - Data validation
│   └── itinerary-enricher.ts - Location enrichment
│
├── progressive/ (Progressive Generator Support)
│   ├── metadata-generator.ts - Fast metadata
│   ├── city-generator.ts - City itineraries
│   ├── itinerary-combiner.ts - Combination logic
│   └── types.ts - Type definitions
│
├── data/
│   └── city-zones.ts - Geographic zone data
│
└── types/
    └── itinerary.types.ts - Shared type definitions
```

## Data Flow

```
User Input
    ↓
AIController (387 lines)
    ├── IntentParser → Extract destination, dates, preferences
    ├── ConversationManager → Track conversation state
    └── ResponseFormatter → Generate contextual response
         ↓
    TripGenerator (248 lines) [when all info collected]
         ├── PromptBuilder → Construct GPT prompt
         ├── OpenAI GPT-4o-mini → Generate base itinerary
         ├── RouteOptimizer → Optimize by geographic zones
         ├── ItineraryEnricher → Add real venue data (HERE API)
         ├── CostEstimator → Calculate trip costs
         └── ItineraryValidator → Ensure data consistency
```

## Key Features

### 1. Intelligent Intent Extraction
- Pattern-based extraction for common formats
- GPT-4o-mini fallback for complex queries
- Multi-city trip detection
- Date parsing (relative and absolute)

### 2. Zone-Based Planning
- Activities grouped by geographic zones
- Minimizes travel time between venues
- Supports major cities (London, Paris, Tokyo, NYC, etc.)

### 3. Progressive Generation
- Metadata generated instantly (<100ms)
- City itineraries generated incrementally
- Real-time progress updates

### 4. Smart Caching
- LRU cache with TTL management
- Fuzzy matching for similar queries
- Automatic cache eviction

### 5. Cost Estimation
- Budget-aware planning (budget/medium/luxury)
- Accommodation cost estimates
- Activity and transportation costs
- Multi-traveler support

## Usage Examples

### Basic Intent Extraction
```typescript
const controller = new AIController();
const intent = await controller.extractIntent('3 days in London next month');
// Returns: { destination: 'London', duration: 3, startDate: '2025-02-01' }
```

### Full Itinerary Generation
```typescript
const generator = new TripGenerator();
const itinerary = await generator.generateItinerary({
  destination: 'Paris',
  duration: 5,
  startDate: '2025-03-15',
  budget: 'medium',
  interests: ['art', 'food', 'history']
});
```

### Progressive Generation with Updates
```typescript
const progressive = new ProgressiveGenerator();
await progressive.generateProgressive({
  destinations: ['London', 'Paris'],
  duration: 7,
  startDate: '2025-04-01',
  onProgress: (update) => {
    console.log(`${update.progress}% complete`);
  }
});
```

## Module Details

### AI Controller Modules (`/modules`)

#### intent-parser.ts (497 lines)
- Pattern matching for common travel queries
- Multi-city detection
- Date extraction and normalization
- GPT-4o-mini integration for complex queries

#### conversation-manager.ts (415 lines)
- Session management
- Conversation state tracking
- Context preservation
- Message history

#### cache-manager.ts (230 lines)
- LRU cache implementation
- TTL-based expiration
- Fuzzy matching for similar queries
- Memory management

#### response-formatter.ts (327 lines)
- Dynamic question generation
- Context-aware responses
- Missing field detection
- User-friendly formatting

### Trip Generator Modules (`/generators`)

#### route-optimizer.ts (309 lines)
- Zone assignment for activities
- Distance calculation
- Route reordering
- Travel time minimization

#### cost-estimator.ts (331 lines)
- Accommodation pricing
- Activity cost calculation
- Transportation estimates
- Budget scaling

#### prompt-builder.ts (119 lines)
- GPT prompt construction
- Zone guidance integration
- Preference formatting

#### itinerary-validator.ts (206 lines)
- Structure validation
- Date consistency
- Missing data recovery
- Legacy format conversion

#### itinerary-enricher.ts (204 lines)
- HERE Places API integration
- Venue search and matching
- Location data enrichment
- Batch API optimization

### Progressive Generator Modules (`/progressive`)

#### metadata-generator.ts (148 lines)
- Quick trip overview
- Photo URL generation
- Tip compilation
- Cost estimation

#### city-generator.ts (237 lines)
- GPT-4o-mini integration
- Day-by-day planning
- Activity scheduling
- Default fallbacks

#### itinerary-combiner.ts (66 lines)
- Multi-city merging
- Day sorting
- Format standardization

## Testing

Run the comprehensive test suite:
```bash
npx tsx scripts/test-ai-baseline.ts
```

Expected results (all passing):
- ✅ AIController - Extract simple intent
- ✅ AIController - Detect multi-city
- ✅ AIController - Process message
- ✅ TripGenerator - Generate London itinerary
- ✅ TripGenerator - Budget constraints
- ✅ ProgressiveGenerator - Generate metadata
- ✅ ProgressiveGenerator - Generate city itinerary
- ✅ Integration - Full generation flow

## Performance Metrics

- **Intent Extraction**: 500-1500ms (with GPT)
- **Full Itinerary Generation**: 20-40s (3-5 day trip)
- **Progressive Metadata**: <100ms
- **City Generation**: 3-5s per city
- **Cache Hit Rate**: ~30% in production

## Environment Variables

Required in `.env.local`:
```bash
OPENAI_API_KEY=your_openai_api_key
```

## Recent Updates (Sept 2024)

- ✅ Refactored from monolithic to ultra-modular architecture
- ✅ Reduced main file sizes by 54-75%
- ✅ Fixed all TypeScript errors
- ✅ 100% test pass rate
- ✅ Improved separation of concerns
- ✅ Enhanced maintainability