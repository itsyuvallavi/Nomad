# Nomad Navigator Database Schema

## Overview
Nomad Navigator uses Firebase Firestore as its primary database. The schema is designed to support user authentication, trip planning, and travel preferences.

## Collections

### 1. Users Collection (`users`)
**Document ID**: User's Firebase Auth UID
```typescript
interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  preferences: {
    travelStyle: 'budget' | 'mid-range' | 'luxury';
    interests: string[];
    preferredLanguage: string;
    currency: string;
    defaultTripLength: number;
  };
  stats: {
    totalTripsPlanned: number;
    favoriteDestinations: string[];
    lastTripGenerated?: Timestamp;
  };
}
```

### 2. Trips Collection (`trips`)
**Document ID**: Auto-generated
```typescript
interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: Timestamp;
  endDate: Timestamp;
  duration: number; // days
  budget?: number;
  currency: string;
  travelStyle: 'budget' | 'mid-range' | 'luxury';
  itinerary: ItineraryData;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isFavorite?: boolean;
  tags?: string[];
}
```

### 3. Favorites Collection (`favorites`)
**Document ID**: Auto-generated
```typescript
interface Favorite {
  id: string;
  userId: string;
  type: 'destination' | 'trip' | 'activity' | 'restaurant' | 'hotel';
  itemId: string; // Reference to the favorited item
  title: string;
  description?: string;
  imageUrl?: string;
  location?: {
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  createdAt: Timestamp;
}
```

### 4. Trip History Collection (`trip-history`)
**Document ID**: Trip ID
```typescript
interface TripHistory {
  tripId: string;
  userId: string;
  originalPrompt: string;
  refinements: Array<{
    prompt: string;
    timestamp: Timestamp;
    changes: string[];
  }>;
  aiVersion: string;
  totalTokensUsed: number;
  generationTime: number; // milliseconds
  createdAt: Timestamp;
}
```

## Indexes

### Composite Indexes Required:
1. `trips`: `userId` (ascending) + `createdAt` (descending)
2. `trips`: `userId` (ascending) + `status` (ascending) + `createdAt` (descending)
3. `favorites`: `userId` (ascending) + `type` (ascending) + `createdAt` (descending)
4. `trip-history`: `userId` (ascending) + `createdAt` (descending)

## Security Rules

### General Principles:
1. Users can only read/write their own data
2. All writes require authentication
3. Sensitive data (like AI usage stats) is protected
4. Public read access for shared trip data (future feature)

### Data Validation:
- Email format validation
- Required fields enforcement
- Data type validation
- Size limits on arrays and strings

## Future Considerations

### Planned Extensions:
1. **Social Features**: Friend connections, shared trips
2. **Reviews**: User reviews for destinations/activities
3. **Booking Integration**: Store booking confirmations
4. **Offline Support**: Cached trip data for offline access
5. **Analytics**: User behavior tracking (anonymized)

### Performance Optimizations:
1. **Denormalization**: Store frequently accessed data redundantly
2. **Caching**: Implement client-side caching for user preferences
3. **Pagination**: Implement cursor-based pagination for large lists
4. **Background Jobs**: Process heavy operations asynchronously

## Migration Strategy
- Use Firestore's built-in versioning
- Implement backwards-compatible schema changes
- Gradual rollout of new fields with defaults
- Document breaking changes in CHANGELOG.md