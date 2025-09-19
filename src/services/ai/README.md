# AI Services

## Overview

The AI service handles all conversation management and itinerary generation using a simplified 5-file architecture (reduced from 21 files in the previous version).

## Architecture

### Core Files

```
src/services/ai/
├── ai-controller.ts       # Conversation management and state
├── trip-generator.ts      # Itinerary generation with OSM enrichment
├── prompts.ts            # All AI prompts and templates
├── schemas.ts            # TypeScript type definitions
└── services/
    ├── osm-poi-service.ts              # OpenStreetMap POI fetching
    └── location-enrichment-locationiq.ts  # Fallback geocoding
```

### Data Flow

```
User Input
    ↓
AIController (manages conversation)
    ↓
TripGenerator (when ready)
    ↓
OSM POI Service (fetch real venues)
    ↓
LocationIQ (fallback if needed)
    ↓
Enriched Itinerary with Real Venues
```

## NO DEFAULTS Philosophy

The system NEVER assumes information. If something is missing, it asks:

```typescript
// Example: Missing destination
User: "I want to travel for 3 days"
AI: "Where would you like to go for your 3-day trip?"

// Example: Missing dates
User: "3 days in Paris"
AI: "When are you planning to visit Paris?"

// Example: Complete information
User: "3 days in Paris starting March 1st"
AI: *Generates itinerary*
```

## Components

### AIController (`ai-controller.ts`)

Manages the conversation state and determines what information is needed.

```typescript
const controller = new AIController();

// Process user message
const response = await controller.processMessage("3 days in London");

// Response types:
// - 'question': Need more information
// - 'ready': Can generate itinerary
// - 'error': Something went wrong

if (response.type === 'ready' && response.canGenerate) {
  const params = controller.getTripParameters(response.intent);
  // Ready to generate
}
```

### TripGenerator (`trip-generator.ts`)

Generates itineraries with zone-based planning and OSM enrichment.

```typescript
const generator = new TripGenerator();

const params = {
  destination: "Paris",
  startDate: "2025-03-01",
  duration: 3,
  preferences: {
    interests: ["museums", "food"],
    pace: "moderate"
  }
};

const itinerary = await generator.generateItinerary(params);
// Returns itinerary with real venues from OSM
```

### OSM POI Service (`services/osm-poi-service.ts`)

Fetches real Points of Interest from OpenStreetMap.

```typescript
const pois = await osmPOIService.findPOIsByActivity('dinner', {
  name: 'Westminster',
  center: { lat: 51.4994, lng: -0.1248 },
  radiusKm: 2
});

// Returns:
[{
  name: "The Ivy",
  address: "1-5 West St, London WC2H 9NQ",
  coordinates: { lat: 51.5122, lng: -0.1267 },
  website: "https://www.the-ivy.co.uk",
  cuisine: "British"
}]
```

## Zone-Based Planning

Each day focuses on one neighborhood to minimize travel:

```typescript
// Day 1: Central Paris
const zones = {
  'Central Paris': ['Louvre', 'Palais Royal', 'Les Halles'],
  'Latin Quarter': ['Notre-Dame', 'Sorbonne', 'Panthéon'],
  'Montmartre': ['Sacré-Cœur', 'Moulin Rouge', 'Place du Tertre']
};
```

Activities within a day are limited to walking distance (max 15 minutes).

## OSM Integration Features

### Supported POI Categories

- **Food & Drink**: breakfast, lunch, dinner, coffee, bar
- **Accommodation**: hotel, hostel
- **Tourism**: museum, park, attraction, landmark, viewpoint, beach
- **Shopping**: shopping, market
- **Entertainment**: theater, concert, sports
- **Other**: temple, spa, casino

### Fallback Strategy

1. Try OSM/Overpass API for real POIs
2. If no results, use cached popular venues
3. If OSM fails, use LocationIQ for geocoding
4. Always return something useful to the user

## API Usage

### Via API Route

```typescript
// POST /api/ai
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "3 days in London",
    conversationContext: previousContext,
    sessionId: uniqueSessionId
  })
});
```

### Direct Service Usage

```typescript
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';

const controller = new AIController();
const generator = new TripGenerator();

// Process conversation
const response = await controller.processMessage(userInput);

// Generate when ready
if (response.canGenerate) {
  const params = controller.getTripParameters(response.intent);
  const itinerary = await generator.generateItinerary(params);
}
```

## Configuration

### Required Environment Variables

```bash
OPENAI_API_KEY=your_openai_key  # Required for AI generation
```

### Optional Environment Variables

```bash
LOCATIONIQ_API_KEY=your_key  # For fallback geocoding
```

## Performance

- **OSM Queries**: ~1-2 seconds per zone
- **AI Generation**: ~5-10 seconds for full itinerary
- **Total Time**: ~10-15 seconds for complete enriched itinerary
- **Cache**: 1-hour cache for identical POI queries

## Error Handling

The system gracefully handles failures:

1. **OSM Unavailable**: Falls back to cached popular venues
2. **AI Timeout**: Returns partial itinerary if available
3. **Missing API Key**: Returns error with clear message
4. **Invalid Input**: Asks clarifying questions

## Testing

```bash
# Test OSM integration
npx tsx tests/ai/test-osm-integration.ts

# Test conversation flow
npx tsx tests/test-new-api-endpoint.ts
```

## Future Enhancements

- [ ] Add more cities to fallback cache
- [ ] Support multi-city trips
- [ ] Add real-time availability checking
- [ ] Integrate booking links
- [ ] Add weather-based recommendations