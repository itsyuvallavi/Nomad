# Trip Management Services

## Overview

Services for managing user trips, drafts, and saved itineraries with Firestore integration and offline support.

## Services

### 🎯 TripService (`trips-service.ts`)

Main service for trip CRUD operations with Firestore.

```typescript
import { tripsService } from '@/services/trips/trips-service';

// Save a trip
const tripId = await tripsService.saveTrip(userId, {
  title: "3 Days in Paris",
  destination: "Paris",
  itinerary: {...}
});

// Get user's trips
const trips = await tripsService.getUserTrips(userId);

// Delete a trip
await tripsService.deleteTrip(userId, tripId);
```

**Features**:
- Firestore persistence
- User-specific trips
- Offline support
- Real-time sync

### 📝 DraftManager (`draft-manager.ts`)

Manages draft itineraries before saving.

```typescript
import { getDraftManager } from '@/services/trips/draft-manager';

const draftManager = getDraftManager();

// Save draft
draftManager.saveDraft({
  destination: "London",
  duration: 3,
  itinerary: {...}
});

// Get current draft
const draft = draftManager.getDraft();

// Clear draft
draftManager.clearDraft();
```

**Features**:
- Local storage persistence
- Auto-save functionality
- Session management
- Draft recovery

## Data Models

### Trip Structure

```typescript
interface Trip {
  id?: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  duration: number;
  itinerary: Day[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: {
    totalCost?: number;
    travelers?: number;
    tags?: string[];
  };
}
```

### Day Structure

```typescript
interface Day {
  day: number;
  date: string;
  theme: string;
  activities: Activity[];
}
```

### Activity with OSM Data

```typescript
interface Activity {
  time?: string;
  description: string;
  venue_name?: string;      // From OSM
  address?: string;          // From OSM
  coordinates?: {            // From OSM
    lat: number;
    lng: number;
  };
  website?: string;          // From OSM
  phone?: string;            // From OSM
  osm_id?: string;          // OSM identifier
}
```

## Firestore Schema

```
users/
  {userId}/
    trips/
      {tripId}/
        - title
        - destination
        - startDate
        - duration
        - itinerary[]
        - createdAt
        - updatedAt
```

## Usage Examples

### Save Generated Itinerary

```typescript
// After generating itinerary with AI
const itinerary = await generator.generateItinerary(params);

// Save to Firestore
const tripId = await tripsService.saveTrip(userId, {
  title: itinerary.title,
  destination: itinerary.destination,
  startDate: itinerary.startDate,
  duration: itinerary.duration,
  itinerary: itinerary.itinerary
});
```

### Load User's Trips

```typescript
// In profile page
const trips = await tripsService.getUserTrips(userId);

// Display trips
trips.forEach(trip => {
  console.log(`${trip.title} - ${trip.destination}`);
});
```

### Draft Management

```typescript
// Auto-save as user plans
const draftManager = getDraftManager();

// Save progress
draftManager.saveDraft({
  destination: userInput.destination,
  duration: userInput.duration,
  preferences: userInput.preferences
});

// Recover on page reload
const draft = draftManager.getDraft();
if (draft) {
  // Restore user's progress
  restoreForm(draft);
}
```

## Offline Support

The service includes offline capabilities:

1. **Local Storage**: Drafts saved locally
2. **IndexedDB**: Via offline-storage service
3. **Sync on Reconnect**: Automatic Firestore sync

```typescript
// Check if offline
if (!navigator.onLine) {
  // Save to local storage
  offlineStorage.saveTrip(trip);
}

// When back online
window.addEventListener('online', () => {
  // Sync with Firestore
  syncOfflineTrips();
});
```

## Security Rules

Firestore security rules ensure users can only access their own trips:

```javascript
// firestore.rules
match /users/{userId}/trips/{tripId} {
  allow read, write: if request.auth != null
    && request.auth.uid == userId;
}
```

## Error Handling

```typescript
try {
  const tripId = await tripsService.saveTrip(userId, tripData);
} catch (error) {
  if (error.code === 'permission-denied') {
    // User not authenticated
  } else if (error.code === 'unavailable') {
    // Firestore offline
  }
}
```

## Performance Considerations

- **Pagination**: Load trips in batches of 20
- **Caching**: Recent trips cached in memory
- **Lazy Loading**: Load full itinerary on demand
- **Compression**: Large itineraries compressed

## Testing

```typescript
// Test trip service
const mockTrip = {
  title: "Test Trip",
  destination: "Paris",
  startDate: "2025-03-01",
  duration: 3,
  itinerary: [...]
};

const tripId = await tripsService.saveTrip('test-user', mockTrip);
const saved = await tripsService.getTrip('test-user', tripId);
assert(saved.title === "Test Trip");
```

## Future Enhancements

- [ ] Trip sharing with other users
- [ ] Collaborative planning
- [ ] Version history
- [ ] Trip templates
- [ ] Export to calendar formats