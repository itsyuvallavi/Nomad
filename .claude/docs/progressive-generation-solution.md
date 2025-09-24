# Progressive Generation Solution for Multi-City Trips

## Problem Solved
- **504 Gateway Timeouts** for long/multi-city trips (14+ days)
- **Poor UX** with no feedback during 60+ second generation
- **Firebase hosting timeout limits** (60 seconds default)

## Solution Architecture

### 1. Progressive Generator (`src/services/ai/progressive-generator.ts`)
Generates itineraries in steps:
1. **Metadata** (instant): Trip overview, dates, cost estimate
2. **City-by-city** (3-5 sec each): Generate each city separately
3. **Combine** (instant): Merge into final itinerary

### 2. Three API Endpoints

#### a) Standard Endpoint (`/api/ai`)
- Simple trips < 7 days
- Single city destinations
- Synchronous response

#### b) Streaming Endpoint (`/api/ai/stream`)
- Uses Server-Sent Events (SSE)
- Real-time progress updates
- Best for development/non-Firebase

#### c) Polling Endpoint (`/api/ai/progressive`)
- Firebase-compatible
- Returns generation ID immediately
- Client polls for progress every 5 seconds
- In-memory progress storage

### 3. Smart UI Detection (`src/pages/itinerary/ItineraryPage.tsx`)
```typescript
const isComplexTrip = message.includes('2 week') ||
                      message.includes('and') ||
                      multipleCityPattern.test(message);

if (isComplexTrip) {
    // Use progressive generation with polling
    response = await handlePollingResponse(...);
} else {
    // Use standard endpoint
    response = await fetch('/api/ai', ...);
}
```

## How It Works

### Step 1: Intent Extraction
```
User: "2 weeks trip to London and Brussels"
AI extracts:
- Destinations: ["London", "Brussels"]
- Duration: 14 days
- Days per city: [7, 7]
```

### Step 2: Progressive Generation
```
1. Generate metadata (instant)
   → Title, dates, cost estimate

2. Generate London (30s)
   → 7 days of activities
   → Progress: 50%

3. Generate Brussels (30s)
   → 7 days of activities
   → Progress: 80%

4. Combine & return (instant)
   → Complete itinerary
   → Progress: 100%
```

### Step 3: UI Updates
- Shows progress bar with percentage
- Updates message: "Generating London itinerary..."
- Prevents timeout with continuous feedback

## Testing

### Test Scripts
- `scripts/test-progressive.ts` - Test progressive generation
- `scripts/test-api-timeout.ts` - Test timeout handling
- `scripts/test-multi-city-server.ts` - Test multi-city extraction

### Test Cases
1. **Simple**: "3 days in London" → Standard endpoint
2. **Multi-city**: "London and Paris" → Progressive
3. **Long trip**: "2 weeks in Rome" → Progressive
4. **Complex**: "14 days: 1 week London, 1 week Brussels" → Progressive

## Performance

### Before
- 14-day trip: 504 timeout after 60s
- No user feedback during generation
- Complete failure, no itinerary

### After
- 14-day trip: ~70s total, with progress
- Updates every 5 seconds
- Always completes successfully

## Configuration

### Timeouts
- Server: 300 seconds (`maxDuration = 300`)
- Client polling: 300 seconds (60 attempts × 5s)
- Progress cleanup: 5 minutes after completion

### Thresholds for Progressive
- Duration > 7 days OR
- Multiple cities detected OR
- Explicit "2 weeks" mention

## Known Issues & Solutions

1. **Firebase SSE Support**: Use polling endpoint instead
2. **Progress Storage**: Currently in-memory, use Redis for production
3. **Day Count**: Sometimes generates N-1 days (fixing in progress)

## Future Improvements

1. **Streaming to Database**: Store partial results immediately
2. **Resume Generation**: If connection drops, resume from last city
3. **Parallel City Generation**: Generate all cities simultaneously
4. **WebSocket Support**: Better than SSE for bidirectional communication