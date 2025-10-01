# API Services

External API integrations for Nomad Navigator.

**Last Updated**: January 25, 2025

## Active APIs

### Places API
**Location**: `/places/here-places.ts`
- **Provider**: HERE Technologies
- **Purpose**: Venue search, location data, coordinates
- **Features**:
  - Place search by query
  - Batch search optimization
  - Response caching
  - Coordinate lookup
  - Address resolution

### Media API
**Location**: `/media/pexels.ts`
- **Provider**: Pexels
- **Purpose**: High-quality travel images
- **Features**:
  - Image search by destination
  - Curated travel photos
  - Free usage with attribution
  - Response caching

## Archived APIs

The following APIs have been archived as they're no longer in use:
- **osm-poi.ts** - OpenStreetMap POI service (replaced by HERE)
- **location-enrichment.ts** - LocationIQ enrichment (replaced by HERE)
- **weather.ts** - Weather service (feature removed)

Archived files location: `.claude/archive/unused-api/`

## API Structure

```
src/services/api/
├── places/
│   └── here-places.ts    # Active venue/location API
└── media/
    └── pexels.ts          # Active image API
```

## HERE Places API

### Configuration
```typescript
const API_KEY = process.env.HERE_API_KEY;
const BASE_URL = 'https://discover.search.hereapi.com/v1';
```

### Key Methods
- `searchPlaces()` - Search for venues by query
- `batchSearchPlaces()` - Efficient batch searching
- `getPlaceDetails()` - Detailed venue information
- `searchNearby()` - Find places near coordinates

### Usage Example
```typescript
import { herePlacesService } from '@/services/api/places/here-places';
import { HEREPlace } from '@/services/api/places/here-places'; // Type import

// Single search
const places: HEREPlace[] = await herePlacesService.searchPlaces('Eiffel Tower', {
  limit: 5,
  at: { lat: 48.8566, lng: 2.3522 }
});

// Batch search (more efficient)
const queries = [
  { query: 'Louvre Museum Paris' },
  { query: 'Arc de Triomphe Paris' }
];
const results: Map<string, HEREPlace[]> = await herePlacesService.batchSearchPlaces(queries);
```

## Pexels Media API

### Configuration
```typescript
const API_KEY = process.env.PEXELS_API_KEY;
const BASE_URL = 'https://api.pexels.com/v1';
```

### Key Methods
- `searchPexelsImages()` - Search for destination images
- `getCuratedPhotos()` - Get curated travel photos

### Usage Example
```typescript
import { searchPexelsImages } from '@/services/api/media/pexels';

const images = await searchPexelsImages('Paris tourism', {
  per_page: 10,
  page: 1
});
```

## Caching Strategy

Both APIs implement caching to reduce API calls:
- **Cache Duration**: 1 hour (HERE), 24 hours (Pexels)
- **Cache Key**: Query + parameters hash
- **Max Cache Size**: 100 entries (LRU eviction)

## Error Handling

All API services include:
- Automatic retry logic (3 attempts)
- Graceful degradation
- Detailed error logging
- Fallback responses

## Rate Limiting

- **HERE Places**: 250 requests/second
- **Pexels**: 200 requests/hour

Both services implement rate limiting protection.

## Environment Variables

Required in `.env.local`:
```bash
HERE_API_KEY=your_here_api_key
PEXELS_API_KEY=your_pexels_api_key
```

## Migration Notes

### From LocationIQ/OSM to HERE
- HERE provides more reliable venue data
- Better international coverage
- More detailed place information
- Official API with SLA

### Removed Services
- Weather API removed (not used in current features)
- Static places removed (replaced with dynamic HERE data)
- LocationIQ removed (redundant with HERE)

## Recent Updates (Jan 25, 2025)

- ✅ Cleaned up unused API services
- ✅ Consolidated place search to HERE Places only
- ✅ Fixed type issues with HEREPlace interface
- ✅ Improved batch search performance
- ✅ Updated documentation with proper type annotations