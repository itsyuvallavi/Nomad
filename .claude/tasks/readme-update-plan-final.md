# README Update Plan - FINAL

**Date**: 2025-01-19
**Purpose**: Update all README files to reflect the new simplified architecture with OSM integration

## Project Structure Review

### Core Architecture
1. **AI System**: 5 core files (simplified from 21)
   - `ai-controller.ts` - Conversation management
   - `trip-generator.ts` - Itinerary generation with zone-based planning
   - `prompts.ts` - All AI templates
   - `schemas.ts` - TypeScript types
   - `services/osm-poi-service.ts` - OpenStreetMap POI fetching
   - `services/location-enrichment-locationiq.ts` - LocationIQ fallback

2. **External APIs**:
   - **OpenStreetMap/Overpass API** - Primary source for POI data (NEW!)
   - **LocationIQ** - Geocoding and fallback enrichment
   - **OpenWeather** - Weather data
   - **Pexels** - Image service
   - **Static Places** - Fallback venue data

3. **API Routes**:
   - `/api/ai` - Conversational itinerary generation (simplified from /api/ai/generate-itinerary-v2)
   - `/api/feedback` - User feedback

4. **Key Services**:
   - `firebase/` - Auth and analytics
   - `trips/` - Trip management and drafts
   - `storage/` - Offline storage

## README Files to Update/Create (NO TEST FOLDERS)

### Existing READMEs to Update (9)
1. **./README.md** - Main project README
2. **./src/app/README.md** - App Router documentation
3. **./src/components/README.md** - Components documentation
4. **./src/hooks/README.md** - Hooks documentation
5. **./src/infrastructure/README.md** - Infrastructure documentation
6. **./src/lib/README.md** - Libraries documentation
7. **./src/pages/README.md** - Pages documentation
8. **./src/services/README.md** - Services documentation
9. **./.claude/tasks/README.md** - Tasks documentation

### New READMEs to Create (9)
10. **./src/services/ai/README.md** - AI service architecture
11. **./src/services/api/README.md** - External API integrations
12. **./src/services/trips/README.md** - Trip management services
13. **./src/services/storage/README.md** - Storage services
14. **./src/app/api/README.md** - API routes overview
15. **./src/app/api/ai/README.md** - AI endpoint documentation
16. **./src/lib/monitoring/README.md** - Logging and monitoring
17. **./src/pages/itinerary/README.md** - Itinerary page components
18. **./src/pages/home/README.md** - Home page and trip planning form

### To Delete
- **./tests/ai/.old/README.md** - Remove old test documentation

## Content Updates

### Main README.md
```markdown
# Nomad Navigator

AI-powered travel planning with real-world venues from OpenStreetMap.

## Features
- 🗺️ **Real Venues**: Every restaurant, hotel, and attraction is a real place from OpenStreetMap
- 🤖 **Smart AI**: Never assumes information - asks for what it needs
- 📍 **Zone-Based Planning**: Each day focuses on one neighborhood
- 💯 **100% Enrichment**: Every activity includes real venue data

## Tech Stack
- Next.js 15
- OpenAI GPT-4
- OpenStreetMap/Overpass API (POI data)
- Firebase Auth
- TypeScript
- Tailwind CSS

## Example Itinerary
Paris Day 1:
- Breakfast at **Café de Flore** (172 Boulevard Saint-Germain)
- Visit **Louvre Museum** (Rue de Rivoli, 75001)
- Lunch at **L'Ami Louis** (32 Rue du Vertbois)
```

### src/services/ai/README.md
```markdown
# AI Services

## Architecture
Simplified 5-file system (reduced from 21 files):

### Core Files
- `ai-controller.ts` - Manages conversations, never assumes data
- `trip-generator.ts` - Generates itineraries with zone-based planning
- `prompts.ts` - All AI prompts and templates
- `schemas.ts` - TypeScript definitions

### Services
- `services/osm-poi-service.ts` - Fetches real POIs from OpenStreetMap
- `services/location-enrichment-locationiq.ts` - Fallback geocoding

## Data Flow
User Input → AI Controller → Trip Generator → OSM Service → Real Venues

## NO DEFAULTS Philosophy
The system NEVER assumes information:
- Missing destination? Asks "Where would you like to go?"
- Missing dates? Asks "When are you planning to travel?"
- Missing duration? Asks "How many days?"
```

### src/services/api/README.md
```markdown
# External API Services

## Primary APIs

### OpenStreetMap/Overpass API
- **Purpose**: Real POI data (restaurants, hotels, museums)
- **Auth**: None required (free)
- **File**: `../ai/services/osm-poi-service.ts`

### LocationIQ
- **Purpose**: Geocoding and address enrichment (fallback)
- **Auth**: API key required
- **Files**: `locationiq.ts`, `locationiq-enhanced.ts`

### OpenWeather
- **Purpose**: Weather forecasts
- **Auth**: API key required
- **File**: `weather.ts`

### Pexels
- **Purpose**: Destination images
- **Auth**: API key required
- **File**: `pexels.ts`
```

### src/app/api/ai/README.md
```markdown
# AI API Endpoint

## POST /api/ai

Conversational itinerary generation with OSM enrichment.

### Request
```json
{
  "prompt": "3 days in London",
  "conversationContext": "optional-previous-context",
  "sessionId": "unique-session-id"
}
```

### Response Types

#### Question Response
```json
{
  "type": "question",
  "message": "When are you planning to visit London?",
  "awaitingInput": "startDate"
}
```

#### Itinerary Response
```json
{
  "type": "itinerary",
  "itinerary": {
    "days": [{
      "activities": [{
        "description": "Breakfast at a local café",
        "venue_name": "The Breakfast Club",
        "address": "33 D'Arblay St, London",
        "coordinates": { "lat": 51.5142, "lng": -0.1347 }
      }]
    }]
  }
}
```
```

## Key Changes to Document

1. **OSM Integration** - Primary source for all venue data
2. **Simplified Architecture** - 5 files instead of 21
3. **New API Endpoint** - `/api/ai` instead of `/api/ai/generate-itinerary-v2`
4. **NO DEFAULTS** - System asks for missing info
5. **Zone-Based Planning** - Each day in one area
6. **100% Venue Enrichment** - Real places for every activity

## Environment Variables to Document

### Required
- `OPENAI_API_KEY` - GPT-4 access

### Firebase (Required for auth)
- `NEXT_PUBLIC_FIREBASE_*` - Firebase config

### Optional
- `OPENWEATHERMAP` - Weather data
- `LOCATIONIQ_API_KEY` - Fallback geocoding

---

**Ready to implement. Will create/update 18 README files (9 existing + 9 new) with accurate documentation.**