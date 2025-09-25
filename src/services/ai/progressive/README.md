# Progressive Generator Modules

Supporting modules for the ProgressiveGenerator that enable step-by-step itinerary generation with real-time updates.

## Modules

### metadata-generator.ts (148 lines)
**Purpose**: Generates trip metadata instantly without API calls

**Generated Data**:
- Trip title and overview
- Duration and date calculations
- Day distribution across cities
- Quick tips based on destinations
- Cost estimates (rough)
- Photo URLs (Unsplash)

**Performance**: <100ms (no external API calls)

**Example**:
```typescript
const generator = new MetadataGenerator();
const metadata = await generator.generate({
  destinations: ['Paris', 'London'],
  duration: 7,
  startDate: '2025-03-01'
});
// Returns instantly with trip overview
```

### city-generator.ts (237 lines)
**Purpose**: Generates detailed itineraries for individual cities

**Key Features**:
- GPT-4o-mini integration
- Day-by-day activity planning
- Default activity fallbacks
- Error recovery mechanisms
- Structured JSON output

**Generation Process**:
1. Build city-specific prompt
2. Call GPT-4o-mini
3. Parse and validate response
4. Add missing days if needed
5. Ensure activity completeness

**Example**:
```typescript
const generator = new CityGenerator();
const cityPlan = await generator.generateCityItinerary({
  city: 'Barcelona',
  days: 3,
  startDate: '2025-04-01',
  startDayNumber: 1
});
// Returns 3 days of Barcelona activities
```

### itinerary-combiner.ts (66 lines)
**Purpose**: Combines multiple city itineraries into a cohesive trip plan

**Combination Tasks**:
- Merge city itineraries
- Sort days chronologically
- Format for output
- Standardize structure

**Example**:
```typescript
const combiner = new ItineraryCombiner();
const fullTrip = combiner.combine(metadata, [
  londonItinerary,
  parisItinerary,
  romeItinerary
]);
// Returns unified multi-city itinerary
```

### types.ts (68 lines)
**Purpose**: TypeScript type definitions for progressive generation

**Key Types**:
- `TripMetadata` - Trip overview information
- `CityItinerary` - Single city plan
- `DayPlan` - Daily activities
- `Activity` - Individual activity details
- `ProgressUpdate` - Progress callback data
- `GenerationParams` - Generation parameters

## Progressive Generation Flow

```
User Request
    ↓
Step 1: Metadata (instant)
    ├── Generate Overview
    └── Send Progress (20%)
         ↓
Step 2: City Itineraries (sequential)
    ├── City 1 Generation
    ├── Send Progress (40%)
    ├── City 2 Generation
    ├── Send Progress (60%)
    └── City N...
         ↓
Step 3: Combination
    ├── Merge All Cities
    └── Send Progress (100%)
         ↓
Complete Itinerary
```

## Integration with ProgressiveGenerator

```typescript
export class ProgressiveGenerator {
  private metadataGenerator: MetadataGenerator;
  private cityGenerator: CityGenerator;
  private itineraryCombiner: ItineraryCombiner;

  async generateProgressive(params: GenerationParams) {
    // Step 1: Quick metadata
    const metadata = await this.metadataGenerator.generate(params);
    params.onProgress?.({ type: 'metadata', data: metadata, progress: 20 });

    // Step 2: Generate each city
    const cityItineraries = [];
    for (let i = 0; i < params.destinations.length; i++) {
      const city = await this.cityGenerator.generateCityItinerary({...});
      cityItineraries.push(city);

      const progress = 20 + ((i + 1) / params.destinations.length) * 60;
      params.onProgress?.({ type: 'city_complete', data: city, progress });
    }

    // Step 3: Combine
    const final = this.itineraryCombiner.combine(metadata, cityItineraries);
    params.onProgress?.({ type: 'complete', data: final, progress: 100 });

    return final;
  }
}
```

## Performance Characteristics

### Metadata Generation
- **Time**: <100ms
- **API Calls**: 0
- **Data Generated**: Overview, tips, photos, rough costs

### City Generation
- **Time**: 3-5s per city
- **API Calls**: 1 per city (GPT-4o-mini)
- **Data Generated**: Complete daily itineraries

### Combination
- **Time**: <50ms
- **API Calls**: 0
- **Operations**: Sorting, merging, formatting

## Progress Updates

The progressive generator sends real-time updates:

```typescript
interface ProgressUpdate {
  type: 'metadata' | 'city_complete' | 'complete';
  data: any;
  progress: number;  // 0-100
  city?: string;     // For city_complete events
}
```

**Update Timeline** (7-day, 2-city trip):
- 0s: Start
- 0.1s: Metadata ready (20%)
- 3s: City 1 complete (50%)
- 6s: City 2 complete (80%)
- 6.1s: Full itinerary ready (100%)

## Default Fallbacks

When GPT generation fails, the city generator provides defaults:

```typescript
const defaultActivities = [
  { time: "09:00", description: "Explore city neighborhoods", category: "Leisure" },
  { time: "11:00", description: "Visit local market or museum", category: "Attraction" },
  { time: "12:30", description: "Lunch at local restaurant", category: "Food" },
  { time: "14:00", description: "Walking tour", category: "Attraction" },
  { time: "16:00", description: "Coffee break", category: "Leisure" },
  { time: "19:00", description: "Dinner", category: "Food" }
];
```

## Quick Tips System

The metadata generator provides destination-specific tips:

**Supported Cities**:
- London: "Get an Oyster card for transport"
- Paris: "Book Eiffel Tower tickets in advance"
- Rome: "Book Vatican tickets online"
- Barcelona: "Visit Sagrada Familia early"
- Amsterdam: "Rent bikes to explore"
- Berlin: "Get the Berlin Welcome Card"
- Prague: "Exchange money - many places don't accept cards"
- Vienna: "Try the famous Sachertorte"
- Budapest: "Visit the thermal baths"

## Error Handling

Each module includes robust error handling:
- JSON parsing recovery
- Missing data defaults
- API failure fallbacks
- Validation and fixes
- Graceful degradation