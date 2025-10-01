# Storage Services

## Overview

Offline storage and caching services for the Nomad Navigator application.

## Service

### 📦 OfflineStorage (`offline-storage.ts`)

Provides offline-first storage using IndexedDB.

```typescript
import { offlineStorage } from '@/services/storage/offline-storage';

// Initialize
await offlineStorage.init();

// Save trip offline
await offlineStorage.saveTrip({
  id: 'trip-123',
  title: '3 Days in Paris',
  destination: 'Paris',
  itinerary: {...}
});

// Get offline trips
const trips = await offlineStorage.getTrips();

// Sync when online
await offlineStorage.syncWithFirestore();
```

## Features

### Offline-First Architecture

1. **Save Locally First**: All data saved to IndexedDB
2. **Background Sync**: Sync with Firestore when online
3. **Conflict Resolution**: Last-write-wins strategy
4. **Queue Management**: Failed operations queued for retry

### Storage Capabilities

- **Trips**: Complete itineraries with OSM data
- **Drafts**: Work-in-progress itineraries
- **Preferences**: User settings and preferences
- **Cache**: API responses and images

## IndexedDB Schema

```typescript
// Database: NomadNavigator
// Version: 1

interface DBSchema {
  trips: {
    id: string;
    userId: string;
    title: string;
    destination: string;
    itinerary: any;
    lastModified: Date;
    syncStatus: 'pending' | 'synced' | 'error';
  };

  drafts: {
    id: string;
    data: any;
    createdAt: Date;
    updatedAt: Date;
  };

  cache: {
    key: string;
    value: any;
    expiresAt: Date;
  };
}
```

## Usage Examples

### Save Trip Offline

```typescript
// When saving a trip
const trip = {
  id: generateId(),
  title: 'London Adventure',
  destination: 'London',
  itinerary: generatedItinerary
};

// Save offline first
await offlineStorage.saveTrip(trip);

// Then sync if online
if (navigator.onLine) {
  await offlineStorage.syncTrip(trip.id);
}
```

### Handle Offline/Online States

```typescript
// Listen for online/offline events
window.addEventListener('online', async () => {
  console.log('Back online - syncing...');
  await offlineStorage.syncAll();
});

window.addEventListener('offline', () => {
  console.log('Offline - using local storage');
});
```

### Cache API Responses

```typescript
// Cache OSM data
await offlineStorage.cacheData('osm-paris-restaurants', {
  data: osmPOIs,
  ttl: 3600 // 1 hour
});

// Retrieve cached data
const cached = await offlineStorage.getCached('osm-paris-restaurants');
if (cached && !cached.expired) {
  return cached.data;
}
```

## Service Worker Integration

For true offline support, integrate with service worker:

```javascript
// sw.js
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

## Storage Limits

| Browser | Storage Limit |
|---------|--------------|
| Chrome | 60% of total disk space |
| Firefox | 50% of free disk space |
| Safari | 1GB initially, can request more |
| Edge | Same as Chrome |

## Performance Optimization

### Strategies

1. **Compression**: Large itineraries compressed with LZ-string
2. **Pagination**: Load trips in chunks
3. **Lazy Loading**: Load details on demand
4. **Cleanup**: Remove old cached data

```typescript
// Compress large data
import LZString from 'lz-string';

const compressed = LZString.compress(JSON.stringify(largeItinerary));
await offlineStorage.save('trip', compressed);

// Decompress when reading
const data = await offlineStorage.get('trip');
const itinerary = JSON.parse(LZString.decompress(data));
```

## Error Handling

```typescript
try {
  await offlineStorage.saveTrip(trip);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Storage full - cleanup old data
    await offlineStorage.cleanup();
    await offlineStorage.saveTrip(trip);
  } else {
    // Other error
    console.error('Storage error:', error);
  }
}
```

## Privacy & Security

- **Encrypted at Rest**: Browser encrypts IndexedDB
- **User-Specific**: Data isolated per user
- **No Sensitive Data**: Don't store passwords or tokens
- **Clear on Logout**: Remove all local data

```typescript
// Clear all user data on logout
async function logout() {
  await offlineStorage.clearAll();
  await auth.signOut();
}
```

## Testing

```typescript
// Test offline storage
describe('OfflineStorage', () => {
  it('should save and retrieve trips', async () => {
    const trip = { id: '123', title: 'Test Trip' };
    await offlineStorage.saveTrip(trip);

    const retrieved = await offlineStorage.getTrip('123');
    expect(retrieved.title).toBe('Test Trip');
  });

  it('should handle quota exceeded', async () => {
    // Fill storage
    // Test cleanup
  });
});
```

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |

## Future Enhancements

- [ ] Implement background sync API
- [ ] Add WebSQL fallback for older browsers
- [ ] Implement data compression
- [ ] Add encryption for sensitive data
- [ ] Support for offline maps