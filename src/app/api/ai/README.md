# AI API Endpoint

## POST /api/ai

The main endpoint for conversational itinerary generation with OpenStreetMap enrichment.

## Endpoint Details

- **URL**: `/api/ai`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Timeout**: 60 seconds maximum

## Request Format

```typescript
interface Request {
  prompt: string;                    // User message
  conversationContext?: string;      // Previous context (serialized)
  sessionId?: string;                // Unique session identifier
  attachedFile?: string;             // Optional file data (future use)
}
```

### Example Request

```json
{
  "prompt": "I want to visit Paris for 3 days",
  "sessionId": "session-123"
}
```

## Response Format

The endpoint returns different response types based on the conversation state:

### 1. Question Response

When the AI needs more information:

```json
{
  "success": true,
  "data": {
    "type": "question",
    "message": "When are you planning to visit Paris?",
    "awaitingInput": "startDate",
    "conversationContext": "eyJ0eXBlIjoic2Vzc2lvbiIsImRlc3RpbmF0aW9uIjoiUGFyaXMifQ=="
  }
}
```

**Fields**:
- `type`: Always "question"
- `message`: The question to ask the user
- `awaitingInput`: What field we're waiting for (startDate, duration, etc.)
- `conversationContext`: Base64 encoded context to send with next request

### 2. Itinerary Response

When generation is complete:

```json
{
  "success": true,
  "data": {
    "type": "itinerary",
    "message": "Your itinerary is ready!",
    "itinerary": {
      "title": "3 Days in Paris",
      "destination": "Paris",
      "duration": 3,
      "startDate": "2025-03-01",
      "itinerary": [
        {
          "day": 1,
          "date": "2025-03-01",
          "theme": "Central Paris",
          "activities": [
            {
              "time": "9:00 AM",
              "description": "Start with breakfast at a charming café",
              "venue_name": "Café de Flore",
              "address": "172 Boulevard Saint-Germain, 75006 Paris",
              "coordinates": {
                "lat": 48.8542,
                "lng": 2.3333
              },
              "website": "https://cafedeflore.fr",
              "phone": "+33 1 45 48 55 26",
              "opening_hours": "7:00-2:00",
              "cuisine": "French",
              "osm_id": "osm-node-123456"
            }
          ]
        }
      ],
      "estimatedCosts": {
        "flights": 600,
        "hotels": 450,
        "dailyExpenses": 300,
        "total": 1350
      }
    }
  }
}
```

### 3. Error Response

When something goes wrong:

```json
{
  "success": false,
  "error": "OpenAI API key not configured",
  "type": "error"
}
```

## Conversation Flow

### Complete Example

```javascript
// First request
const response1 = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "3 days in London",
    sessionId: "session-123"
  })
});
// Returns: { type: "question", message: "When are you planning?" }

// Second request (with context)
const response2 = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Next month",
    conversationContext: response1.data.conversationContext,
    sessionId: "session-123"
  })
});
// Returns: { type: "question", message: "Any specific interests?" }

// Third request (final)
const response3 = await fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Museums and food",
    conversationContext: response2.data.conversationContext,
    sessionId: "session-123"
  })
});
// Returns: { type: "itinerary", itinerary: {...} }
```

## OSM Data in Response

Every activity includes real venue data from OpenStreetMap:

```typescript
interface Activity {
  time?: string;                    // Activity time
  description: string;              // AI-generated description

  // OSM-enriched fields
  venue_name?: string;              // Real venue name
  address?: string;                 // Street address
  coordinates?: {                   // GPS location
    lat: number;
    lng: number;
  };
  website?: string;                 // Official website
  phone?: string;                   // Contact phone
  opening_hours?: string;           // Operating hours
  cuisine?: string;                 // For restaurants
  osm_id?: string;                  // OSM identifier
}
```

## Implementation Details

The endpoint delegates to services:

```typescript
// route.ts
const controller = new AIController();
const generator = new TripGenerator();

// Process conversation
const response = await controller.processMessage(prompt, context);

// Generate when ready
if (response.canGenerate) {
  const params = controller.getTripParameters(response.intent);
  const itinerary = await generator.generateItinerary(params);
  // Itinerary includes OSM enrichment
}
```

## Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 200 | - | Success |
| 400 | Invalid request | Missing required fields |
| 401 | Unauthorized | Invalid session (future) |
| 500 | Internal error | Server error |
| 504 | Timeout | Request took >60 seconds |

## Testing

### Using cURL

```bash
# Simple test
curl -X POST http://localhost:9002/api/ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "3 days in Paris", "sessionId": "test"}'

# With context
curl -X POST http://localhost:9002/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "March 15th",
    "conversationContext": "eyJ0eXBlIjoic2Vzc2lvbiJ9",
    "sessionId": "test"
  }'
```

### Using JavaScript

```javascript
async function testAI() {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: '3 days in London',
      sessionId: Date.now().toString()
    })
  });

  const data = await response.json();
  console.log(data);
}
```

## Performance Metrics

- **Question Response**: <1 second
- **Itinerary Generation**: 10-15 seconds
  - AI generation: 5-10 seconds
  - OSM enrichment: 2-5 seconds
  - Cost calculation: <1 second
- **Memory Usage**: ~50MB per request
- **Concurrent Requests**: Limited by OpenAI rate limits

## Future Enhancements

- [ ] Add streaming responses for real-time updates
- [ ] Support file attachments (images, PDFs)
- [ ] Add webhook support for async generation
- [ ] Implement request queuing
- [ ] Add response caching