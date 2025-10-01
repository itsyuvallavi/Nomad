# AI Service Architecture

## Overview
The AI service orchestrates intelligent trip generation using OpenAI's GPT models. The system is designed with a modular architecture that separates concerns into specialized components.

**Last Updated**: January 25, 2025

## 📁 Directory Structure

```
ai/
├── types/
│   └── core.types.ts         # Single source of truth for all TypeScript types
├── schemas/
│   └── validation.schemas.ts # Zod schemas for runtime validation
├── utils/
│   ├── validation.utils.ts   # Shared validation and parsing utilities
│   └── date.utils.ts         # Date manipulation and calculation utilities
├── data/
│   ├── city-zones.ts        # City zone definitions for route optimization
│   ├── city-attractions.ts  # Static attraction data
│   └── static-activities.json # Activity templates
├── modules/                  # AI Controller support modules
│   ├── intent-parser.ts     # Natural language understanding
│   ├── conversation-manager.ts # Conversation state management
│   ├── cache-manager.ts     # Response caching
│   └── response-formatter.ts # Output formatting
├── generators/               # Trip generation modules
│   ├── route-optimizer.ts   # Zone-based route optimization
│   ├── cost-estimator.ts    # Budget calculations
│   ├── prompt-builder.ts    # GPT prompt construction
│   ├── itinerary-validator.ts # Data validation
│   └── itinerary-enricher.ts # Location data enrichment
├── progressive/              # Progressive generation components
│   ├── metadata-generator.ts # Quick metadata generation
│   └── city-generator.ts    # City-specific itineraries
├── ai-controller.ts         # Main orchestrator for conversations
├── trip-generator.ts        # Unified trip generator (progressive by default)
└── prompts.ts              # Prompt templates
```

## 🏗️ Architecture

### Core Components

#### 1. **AI Controller** (`ai-controller.ts`)
Main conversation orchestrator that:
- Parses user intent using `IntentParser`
- Manages conversation state via `ConversationManager`
- Caches responses with `CacheManager`
- Formats output using `ResponseFormatter`

#### 2. **Trip Generator** (`trip-generator.ts`)
Unified trip generation with progressive updates:
- Always uses progressive generation for better UX
- Generates metadata quickly (2-3s)
- Produces city itineraries progressively
- Optimizes routes via `RouteOptimizer`
- Enriches data using `ItineraryEnricher`
- Estimates costs with `CostEstimator`
- Validates output with `ItineraryValidator`

## 🔧 Key Features

### Intent Recognition
```typescript
// Automatically understands various input formats
"3 days in Paris"
"Weekend trip to Tokyo next month"
"Plan a budget vacation to Barcelona"
```

### Progressive Generation (Default)
All itineraries now use progressive generation:
1. **Metadata** (2-3s): Destination, dates, duration
2. **Per City** (5-10s each): Detailed daily activities
3. **Route Optimization**: Groups by zones
4. **Enrichment**: Real venue data from HERE
5. **Cost Estimation**: Detailed budget breakdown
6. **Final Validation**: Complete itinerary

### Zone-Based Optimization
Groups activities by geographic zones to minimize travel:
- Downtown zones
- Cultural districts
- Shopping areas
- Natural attractions

### Intelligent Caching
- Intent-based caching
- Fuzzy matching for similar queries
- TTL-based expiration

## 📊 Performance Metrics

| Operation | Target | Current |
|-----------|--------|---------|
| Intent Extraction | <500ms | ✅ 300-500ms |
| Metadata Generation | <3s | ✅ 2-3s |
| City Generation | <10s | ✅ 5-10s |
| Full Itinerary | <30s | ✅ 20-30s |
| Cache Hit Rate | >30% | ✅ 35-40% |

## 🔑 Type System

All types are centralized in `types/core.types.ts`:

```typescript
// Core types
Activity           // Individual activity/attraction
DailyItinerary    // Single day's plan
UserIntent        // Parsed user intent
ConversationContext // Conversation state

// Generation types
GeneratePersonalizedItineraryOutput // Complete itinerary
ProgressiveMetadata // Quick metadata
BaseItinerary     // Basic itinerary structure
```

## 🛠️ Utilities

### Validation Utils (`utils/validation.utils.ts`)
- `safeJsonParse()` - Robust JSON parsing with recovery
- `normalizeBudgetLevel()` - Budget standardization
- `extractSearchQuery()` - Search term extraction

### Date Utils (`utils/date.utils.ts`)
- `calculateDate()` - Date arithmetic
- `parseRelativeDate()` - "next Monday" parsing
- `formatDateForDisplay()` - User-friendly formatting

## 🔌 External Integrations

- **OpenAI GPT**: Primary AI engine
- **HERE Places API**: Location and venue data
- **Pexels API**: Destination imagery

## 📝 Usage Examples

### Basic Trip Generation (Now Progressive by Default)
```typescript
const tripGen = new TripGenerator(apiKey);
const itinerary = await tripGen.generateItinerary({
  destination: "Paris",
  duration: 3,
  startDate: "2025-03-15",
  preferences: { budget: "medium" }
});
```

### With Progress Updates
```typescript
const tripGen = new TripGenerator(apiKey);
const result = await tripGen.generateProgressive({
  destinations: ["London", "Paris"],
  duration: 7,
  startDate: "2025-04-01",
  onProgress: (update) => {
    console.log(`${update.type}: ${update.progress}% complete`);
  }
});
```

### Intent Parsing
```typescript
const parser = new IntentParser();
const intent = await parser.parseIntent(
  "I want to visit Tokyo for a week next month"
);
// Returns: { destination: "Tokyo", duration: 7, ... }
```

## 🧪 Testing

Run comprehensive tests:
```bash
npx tsx scripts/test-ai-comprehensive.ts
```

Current test coverage:
- ✅ Intent parsing
- ✅ Trip generation
- ✅ Progressive generation
- ✅ Conversation context
- ✅ Error handling
- ✅ Performance benchmarks

## 🚀 Recent Improvements (Jan 25, 2025)

1. **Type Consolidation**: Single source of truth in `core.types.ts`
2. **Removed Genkit**: Eliminated unused framework
3. **Shared Utilities**: Created reusable utility modules
4. **Module Optimization**: Merged small related modules
5. **Bug Fixes**: Fixed all TypeScript errors
6. **Unified Generator**: Made progressive generation the default
7. **Feature Parity**: Progressive now includes all traditional features

## 📈 Future Enhancements

- [ ] Implement streaming responses
- [ ] Add multi-language support
- [ ] Enhance activity recommendations
- [ ] Add real-time availability checking
- [ ] Implement user preference learning

## 🤝 Contributing

When adding new features:
1. Use types from `types/core.types.ts`
2. Add validation schemas to `schemas/validation.schemas.ts`
3. Use shared utilities where applicable
4. Maintain the modular architecture
5. Add comprehensive tests

## 📚 Related Documentation

- [Optimization Summary](../../../docs/ai-optimization-summary-2025-01-25.md)
- [API Services](../api/README.md)
- [Module Documentation](./modules/README.md)
- [Generator Documentation](./generators/README.md)