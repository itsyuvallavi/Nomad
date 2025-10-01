# API Routes

## Overview

Next.js 13+ App Router API endpoints for the Nomad Navigator application.

## Available Endpoints

### 🤖 `/api/ai` - Conversational Itinerary Generation

**Method**: POST
**Purpose**: Generate travel itineraries with conversational AI and OSM enrichment

**Request Body**:
```json
{
  "prompt": "3 days in London",
  "conversationContext": "optional-serialized-context",
  "sessionId": "unique-session-id"
}
```

**Response Types**:

1. **Question Response** (needs more info):
```json
{
  "success": true,
  "data": {
    "type": "question",
    "message": "When are you planning to visit London?",
    "awaitingInput": "startDate",
    "conversationContext": "serialized-context"
  }
}
```

2. **Itinerary Response** (complete):
```json
{
  "success": true,
  "data": {
    "type": "itinerary",
    "message": "Your itinerary is ready!",
    "itinerary": {
      "title": "3 Days in London",
      "destination": "London",
      "duration": 3,
      "startDate": "2025-03-01",
      "itinerary": [{
        "day": 1,
        "date": "2025-03-01",
        "theme": "Central London",
        "activities": [{
          "time": "9:00 AM",
          "description": "Breakfast at a local café",
          "venue_name": "The Breakfast Club",
          "address": "33 D'Arblay St, London",
          "coordinates": { "lat": 51.5142, "lng": -0.1347 },
          "website": "https://thebreakfastclubcafes.com",
          "osm_id": "osm-node-123456"
        }]
      }]
    }
  }
}
```

3. **Error Response**:
```json
{
  "success": false,
  "error": "Error message here",
  "type": "error"
}
```

### 💬 `/api/feedback` - User Feedback

**Method**: POST
**Purpose**: Collect user feedback on generated itineraries

**Request Body**:
```json
{
  "userId": "user-id",
  "tripId": "trip-id",
  "rating": 5,
  "comment": "Great itinerary!",
  "type": "positive"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Feedback received"
}
```

## Architecture

```
src/app/api/
├── ai/
│   └── route.ts          # AI endpoint handler
└── feedback/
    └── route.ts          # Feedback handler
```

## Configuration

### Runtime Settings

```typescript
// In route.ts
export const runtime = 'nodejs';      // Node.js runtime
export const maxDuration = 60;        // 60 seconds timeout
```

### Headers

All responses include:
- `Content-Type: application/json`
- `X-Conversation-Session: [session-id]` (AI endpoint only)

## Error Handling

All endpoints follow consistent error handling:

```typescript
try {
  // Process request
} catch (error) {
  return NextResponse.json(
    {
      success: false,
      error: error.message || 'Internal server error',
      type: 'error'
    },
    { status: 500 }
  );
}
```

## Rate Limiting

Currently no rate limiting is implemented. For production, consider:
- Vercel Edge Middleware for rate limiting
- Redis for distributed rate limiting
- API key authentication

## Authentication

Currently public endpoints. For production, implement:
- Firebase Auth token verification
- API key authentication
- Session management

## Usage Examples

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: '3 days in Paris',
    sessionId: generateSessionId()
  })
});

const data = await response.json();
```

### cURL

```bash
# Generate itinerary
curl -X POST http://localhost:9002/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "3 days in London",
    "sessionId": "test-123"
  }'
```

## Testing

```bash
# Test AI endpoint
npx tsx tests/test-new-api-endpoint.ts

# Manual testing with curl
curl -X POST http://localhost:9002/api/ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```

## Performance

- **AI Endpoint**: ~10-15 seconds for full itinerary
- **Feedback Endpoint**: <100ms
- **Timeout**: 60 seconds maximum

## Development Tips

### Adding New Endpoints

1. Create folder in `src/app/api/`
2. Add `route.ts` file
3. Export async functions for HTTP methods:
   - `GET(request: NextRequest)`
   - `POST(request: NextRequest)`
   - `PUT(request: NextRequest)`
   - `DELETE(request: NextRequest)`

Example:
```typescript
// src/app/api/new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Process request

  return NextResponse.json({
    success: true,
    data: result
  });
}
```

### Debugging

Enable debug logging:
```typescript
import { logger } from '@/lib/monitoring/logger';

logger.info('API', 'Processing request', { body });
```

Check logs in development:
- Browser console for client-side
- Terminal for server-side

## Security Considerations

1. **Input Validation**: Always validate user input
2. **Rate Limiting**: Implement for production
3. **CORS**: Configure appropriately
4. **Secrets**: Never expose API keys to client
5. **Authentication**: Implement for sensitive endpoints