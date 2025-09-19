# External API Services

## Overview

This directory contains integrations with external APIs for POI data, weather, images, and geocoding services.

## API Services

### 🗺️ OpenStreetMap/Overpass API (Primary POI Source)

**File**: `../ai/services/osm-poi-service.ts`
**Purpose**: Fetch real Points of Interest (restaurants, hotels, museums, etc.)
**Authentication**: None required (free)
**Rate Limits**: Public instances have fair use limits

```typescript
// Example usage
import { osmPOIService } from '@/services/ai/services/osm-poi-service';

const pois = await osmPOIService.findPOIsByActivity('museum', {
  name: 'Paris',
  center: { lat: 48.8566, lng: 2.3522 },
  radiusKm: 2
});
```

**Features**:
- Real venue names and addresses
- GPS coordinates
- Opening hours (when available)
- Websites and phone numbers
- Cuisine types for restaurants

### 📍 LocationIQ

**Files**: `locationiq.ts`, `locationiq-enhanced.ts`
**Purpose**: Geocoding and address enrichment (fallback for OSM)
**Authentication**: API key required
**Rate Limits**: 5000 requests/day (free tier)

```typescript
import { locationIQ } from '@/services/api/locationiq';

// Geocode an address
const coords = await locationIQ.geocodeAddress("Eiffel Tower, Paris");

// Reverse geocode
const address = await locationIQ.reverseGeocode(48.8584, 2.2945);
```

**Environment Variable**:
```bash
LOCATIONIQ_API_KEY=your_locationiq_api_key
```

### 🌤️ OpenWeather

**File**: `weather.ts`
**Purpose**: Weather forecasts and current conditions
**Authentication**: API key required
**Rate Limits**: 1000 requests/day (free tier)

```typescript
import { getWeather } from '@/services/api/weather';

const weather = await getWeather({
  destination: "London",
  startDate: "2025-03-01",
  duration: 3
});

// Returns: { daily: [...], alerts: [...] }
```

**Environment Variable**:
```bash
OPENWEATHERMAP=your_weather_api_key
```

### 📸 Pexels

**File**: `pexels.ts`
**Purpose**: High-quality destination images
**Authentication**: API key required
**Rate Limits**: 200 requests/hour

```typescript
import { getDestinationImages } from '@/services/api/pexels';

const images = await getDestinationImages("Paris");
// Returns array of image URLs
```

**Environment Variable**:
```bash
PEXELS_API_KEY=your_pexels_api_key
```

### 🏛️ Static Places

**File**: `static-places.ts`
**Purpose**: Fallback venue data when APIs are unavailable
**Authentication**: None (local data)

```typescript
import { CITY_ATTRACTIONS } from '@/services/api/static-places';

const parisAttractions = CITY_ATTRACTIONS['paris'];
// Returns hardcoded popular venues
```

## API Priority Order

The system uses APIs in this priority order:

1. **OpenStreetMap/Overpass** - Primary source for all POI data
2. **Static Places** - Fallback for popular venues
3. **LocationIQ** - Only for geocoding if OSM fails

## Rate Limiting Strategy

### Built-in Protection

```typescript
// locationiq-enhanced.ts implements:
- Request queuing
- Automatic retry with backoff
- Rate limit monitoring
- Batch processing
```

### Cache Strategy

- **OSM POIs**: 1-hour cache
- **Weather**: 30-minute cache
- **Images**: 24-hour cache
- **Geocoding**: 1-hour cache

## Error Handling

Each service implements graceful fallbacks:

```typescript
try {
  // Try primary API
  const pois = await osmPOIService.findPOIs(...);
} catch (error) {
  // Fall back to static data
  const fallback = await getStaticPlaces(...);
}
```

## Cost Optimization

### Free Tier Usage

| API | Free Tier | Our Usage |
|-----|-----------|-----------|
| OpenStreetMap | Unlimited* | Primary POI source |
| LocationIQ | 5,000/day | Fallback only |
| OpenWeather | 1,000/day | On-demand |
| Pexels | 200/hour | Cached heavily |

*Subject to fair use policy

### Optimization Tips

1. **Use OSM First**: It's free and comprehensive
2. **Cache Aggressively**: Reduce API calls
3. **Batch Requests**: When possible
4. **Monitor Usage**: Check API dashboards

## Adding New APIs

To add a new external API:

1. Create a service file in this directory
2. Add environment variable to `.env.local`
3. Implement error handling and fallbacks
4. Add caching if appropriate
5. Document in this README

Example template:

```typescript
// services/api/new-service.ts
export class NewAPIService {
  private apiKey: string;
  private cache = new Map();

  constructor() {
    this.apiKey = process.env.NEW_API_KEY || '';
  }

  async fetchData(params: any) {
    // Check cache
    // Make API call
    // Handle errors
    // Return data
  }
}

export const newAPIService = new NewAPIService();
```

## Testing

```bash
# Test individual APIs
npx tsx tests/test-locationiq.ts
npx tsx tests/test-weather.ts

# Test OSM integration
npx tsx tests/ai/test-osm-integration.ts
```

## Common Issues

### OSM/Overpass Timeout
- **Solution**: Use a different Overpass instance or reduce query complexity

### LocationIQ Rate Limit
- **Solution**: Reduce usage by relying more on OSM

### Missing API Keys
- **Solution**: Check `.env.local` file and ensure keys are set

### CORS Errors
- **Solution**: API calls should be made from server-side (API routes)