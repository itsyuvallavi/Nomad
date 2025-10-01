# Services Directory

## Overview

This directory contains all business logic, external integrations, and services with side effects. Services handle data fetching, API calls, database operations, and third-party integrations.

## Directory Structure

```
src/services/
├── ai/                 # AI & itinerary generation (simplified to 5 files)
├── api/                # External APIs (OSM, LocationIQ, Weather, etc.)
├── firebase/           # Firebase services (Auth, Analytics)
├── storage/            # Offline & local storage
└── trips/              # Trip management & drafts
```

## 🤖 AI Services (`/ai`)

**Simplified from 21 files to 5 core files**

- `ai-controller.ts` - Conversation management, NO DEFAULTS philosophy
- `trip-generator.ts` - Itinerary generation with zone-based planning
- `prompts.ts` - All AI templates
- `schemas.ts` - TypeScript types
- `services/osm-poi-service.ts` - Real venue data from OpenStreetMap
- `services/location-enrichment-locationiq.ts` - Fallback geocoding

**Key Features**:
- Conversational interface that never assumes information
- Real venues from OpenStreetMap (100% enrichment)
- Zone-based planning (each day in one neighborhood)
- Cost estimation included

## 🌍 External APIs (`/api`)

**Primary: OpenStreetMap/Overpass API** (NEW!)
- Real POI data (restaurants, hotels, museums)
- No authentication required
- Primary source for all venue data

**Secondary APIs**:
- `locationiq.ts` - Geocoding (fallback only)
- `weather.ts` - Weather forecasts
- `pexels.ts` - Destination images
- `static-places.ts` - Fallback venue data

## 🔥 Firebase Services (`/firebase`)

- `auth.ts` - User authentication
- `analytics.ts` - Usage analytics

**Features**:
- Social login (Google, GitHub)
- Anonymous auth for trial users
- Real-time user state management

## 💾 Storage Services (`/storage`)

- `offline-storage.ts` - IndexedDB for offline support

**Capabilities**:
- Offline-first architecture
- Background sync with Firestore
- Local caching of trips and drafts

## ✈️ Trip Management (`/trips`)

- `trips-service.ts` - CRUD operations for trips
- `draft-manager.ts` - Draft itinerary management

**Features**:
- Firestore persistence
- User-specific trips
- Auto-save drafts
- Offline support

## Usage Guidelines

### ✅ What Belongs Here

- API calls and external service integrations
- Database operations (Firestore, IndexedDB)
- Authentication implementations
- Business logic with external dependencies
- Network requests
- Data persistence

### ❌ What Does NOT Belong Here

- Pure utility functions → Use `/lib/utils`
- React components → Use `/components`
- Static constants → Use `/lib/constants`
- React contexts → Use `/infrastructure/contexts`

## Service Patterns

### Standard Service Structure

```typescript
// services/example/example-service.ts
export class ExampleService {
  private cache = new Map();

  async fetchData(params: Params): Promise<Data> {
    // 1. Check cache
    if (this.cache.has(params.id)) {
      return this.cache.get(params.id);
    }

    // 2. Try primary source
    try {
      const data = await primaryAPI.fetch(params);
      this.cache.set(params.id, data);
      return data;
    } catch (error) {
      // 3. Fall back to secondary
      logger.warn('Service', 'Primary failed, using fallback', error);
      return fallbackData;
    }
  }
}

export const exampleService = new ExampleService();
```

### Error Handling

All services should handle errors gracefully:

```typescript
try {
  // Primary operation
  const result = await primaryOperation();
  return result;
} catch (error) {
  // Log error
  logger.error('ServiceName', 'Operation failed', error);

  // Try fallback
  if (fallbackAvailable) {
    return fallbackOperation();
  }

  // Re-throw if critical
  throw new ServiceError('User-friendly message', error);
}
```

### Caching Strategy

Services implement caching to reduce API calls:

```typescript
class ServiceWithCache {
  private cache = new Map();
  private cacheExpiry = 3600000; // 1 hour

  async getData(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const fresh = await fetchFreshData(key);
    this.cache.set(key, { data: fresh, timestamp: Date.now() });
    return fresh;
  }
}
```

## Environment Variables

Services requiring API keys:

```bash
# Required
OPENAI_API_KEY=xxx              # AI service

# Optional
LOCATIONIQ_API_KEY=xxx          # Geocoding fallback
OPENWEATHERMAP=xxx              # Weather service
PEXELS_API_KEY=xxx             # Image service

# Firebase (all required for auth)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
# ... etc
```

## Testing Services

```bash
# Test AI services
npx tsx tests/ai/test-osm-integration.ts

# Test API endpoint
npx tsx tests/test-new-api-endpoint.ts

# Test specific service
npx tsx tests/services/test-trips-service.ts
```

## Performance Considerations

1. **Cache Aggressively**: Reduce API calls
2. **Use OSM First**: It's free and comprehensive
3. **Batch Operations**: When possible
4. **Lazy Load**: Load details on demand
5. **Compress Data**: For large payloads

## Adding New Services

1. Create directory under `/services/`
2. Implement service class with error handling
3. Add caching if appropriate
4. Export singleton instance
5. Document in service-specific README
6. Add tests

## Current Metrics

- **AI Generation**: ~10-15 seconds total
- **OSM Enrichment**: 100% success rate
- **Cache Hit Rate**: ~60% for popular destinations
- **Offline Support**: Full trip access offline