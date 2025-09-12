# Data Storage Strategy for Nomad Navigator

## Overview
This document outlines the data storage strategy for various features in Nomad Navigator, including when to use Firestore, localStorage, and other storage solutions.

## Storage Solutions Matrix

### 1. Firestore (Primary Database)
**Use for:**
- User profiles and preferences
- Trip history and itineraries
- Shared/collaborative data
- Long-term persistent data
- Cross-device synchronized data
- Analytics and usage metrics

**Don't use for:**
- Temporary UI state
- Session-specific data
- Large binary files (use Cloud Storage instead)
- High-frequency updates (>1 write per second)

### 2. localStorage
**Use for:**
- Temporary drafts before user authentication
- UI preferences (theme, layout)
- Recently viewed items cache
- Offline queue for pending operations
- Session recovery data

**Don't use for:**
- Sensitive data (passwords, tokens)
- Large data (>5-10MB limit)
- Data requiring cross-device sync
- Critical business data

### 3. sessionStorage
**Use for:**
- Form data during multi-step processes
- Temporary navigation state
- In-progress edits
- Tab-specific settings

### 4. Cloud Storage (Firebase Storage)
**Use for:**
- User uploaded images
- Generated PDFs/documents
- Large media files
- Itinerary attachments

## Implementation Patterns

### Pattern 1: Dual Storage with Sync
```typescript
// Store locally first, then sync to Firestore
class DualStorageService<T> {
  private localKey: string;
  private firestoreCollection: string;
  
  async save(data: T, userId?: string) {
    // 1. Save to localStorage immediately
    localStorage.setItem(this.localKey, JSON.stringify(data));
    
    // 2. If authenticated, sync to Firestore
    if (userId) {
      await this.syncToFirestore(data, userId);
    }
  }
  
  async load(userId?: string): Promise<T | null> {
    if (userId) {
      // Try Firestore first
      const firestoreData = await this.loadFromFirestore(userId);
      if (firestoreData) return firestoreData;
    }
    
    // Fall back to localStorage
    return this.loadFromLocalStorage();
  }
}
```

### Pattern 2: Offline Queue
```typescript
class OfflineQueue {
  private queue: QueueItem[] = [];
  
  async addToQueue(operation: Operation) {
    // Store in localStorage
    this.queue.push(operation);
    localStorage.setItem('offline_queue', JSON.stringify(this.queue));
    
    // Try to process immediately
    await this.processQueue();
  }
  
  async processQueue() {
    if (!navigator.onLine) return;
    
    for (const item of this.queue) {
      try {
        await this.executeOperation(item);
        this.removeFromQueue(item.id);
      } catch (error) {
        console.error('Queue processing failed:', error);
      }
    }
  }
}
```

## Planned Features & Storage Requirements

### 1. User Favorites/Bookmarks
**Storage:** Firestore
**Collection:** `users/{userId}/favorites`
**Schema:**
```typescript
interface Favorite {
  id: string;
  tripId?: string;
  destination?: string;
  type: 'trip' | 'destination' | 'activity';
  title: string;
  imageUrl?: string;
  metadata: Record<string, any>;
  createdAt: Timestamp;
  tags: string[];
}
```
**Implementation Notes:**
- Create composite index on `type` + `createdAt`
- Limit to 100 favorites per user
- Cache in localStorage for quick access

### 2. User Preferences & Settings
**Storage:** Firestore + localStorage
**Collection:** `users/{userId}/settings`
**Schema:**
```typescript
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  units: 'metric' | 'imperial';
  notifications: {
    email: boolean;
    push: boolean;
    tripReminders: boolean;
  };
  privacy: {
    shareTrips: boolean;
    showProfile: boolean;
  };
  travelPreferences: {
    defaultBudget: 'budget' | 'mid-range' | 'luxury';
    interests: string[];
    avoidances: string[];
    accessibility: string[];
  };
}
```
**Implementation Notes:**
- Store in both Firestore and localStorage
- localStorage for immediate UI updates
- Firestore for persistence and sync
- Merge strategy: Firestore wins on conflict

### 3. Collaborative Trip Planning
**Storage:** Firestore (real-time)
**Collections:** 
- `shared_trips/{tripId}`
- `shared_trips/{tripId}/collaborators`
- `shared_trips/{tripId}/comments`
**Schema:**
```typescript
interface SharedTrip {
  id: string;
  ownerId: string;
  collaborators: string[]; // User IDs
  permissions: {
    [userId: string]: 'view' | 'edit' | 'admin';
  };
  trip: Trip;
  comments: Comment[];
  lastModified: Timestamp;
  version: number; // For conflict resolution
}
```
**Implementation Notes:**
- Use Firestore real-time listeners
- Implement optimistic locking with version field
- Create security rules for access control

### 4. Trip Templates
**Storage:** Firestore (global) + localStorage (personal)
**Collections:** 
- `templates` (public)
- `users/{userId}/templates` (private)
**Schema:**
```typescript
interface TripTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  destinations: string[];
  duration: number;
  activities: Activity[];
  estimatedBudget: {
    min: number;
    max: number;
    currency: string;
  };
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  rating: number;
}
```

### 5. Offline Mode Support
**Storage:** IndexedDB + Service Worker Cache
**Implementation:**
```typescript
interface OfflineData {
  trips: Trip[];
  lastSync: Date;
  pendingChanges: Change[];
}

class OfflineManager {
  async enableOffline() {
    // 1. Cache critical data in IndexedDB
    await this.cacheUserTrips();
    
    // 2. Register service worker for asset caching
    await this.registerServiceWorker();
    
    // 3. Set up sync listeners
    navigator.serviceWorker.addEventListener('sync', this.handleSync);
  }
  
  async handleSync() {
    // Process pending changes when back online
    const changes = await this.getPendingChanges();
    await this.syncChanges(changes);
  }
}
```

### 6. Search History & Suggestions
**Storage:** Firestore + localStorage
**Collection:** `users/{userId}/search_history`
**Schema:**
```typescript
interface SearchHistory {
  id: string;
  query: string;
  type: 'destination' | 'activity' | 'general';
  timestamp: Timestamp;
  resultCount: number;
  clickedResults: string[];
  convertedToTrip: boolean;
}
```
**Implementation Notes:**
- Store last 50 searches in localStorage
- Full history in Firestore
- Use for personalized suggestions

### 7. Activity Recommendations
**Storage:** Firestore + Cloud Functions
**Collection:** `recommendations/{userId}`
**Schema:**
```typescript
interface Recommendation {
  id: string;
  userId: string;
  destination: string;
  activities: Activity[];
  score: number;
  reason: string;
  basedOn: string[]; // Trip IDs
  generatedAt: Timestamp;
  expiresAt: Timestamp;
}
```
**Implementation Notes:**
- Generate via Cloud Function analyzing user history
- Cache for 7 days
- Update after each completed trip

### 8. Budget Tracking
**Storage:** Firestore
**Collections:** 
- `trips/{tripId}/expenses`
- `users/{userId}/budget_summary`
**Schema:**
```typescript
interface Expense {
  id: string;
  tripId: string;
  category: 'transport' | 'accommodation' | 'food' | 'activities' | 'other';
  amount: number;
  currency: string;
  description: string;
  date: Date;
  isPaid: boolean;
  receipt?: string; // Storage URL
}

interface BudgetSummary {
  totalSpent: number;
  byCategory: Record<string, number>;
  byTrip: Record<string, number>;
  averagePerDay: number;
  currency: string;
  lastUpdated: Timestamp;
}
```

## Security Rules Template

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Trips - owner and collaborators
    match /trips/{tripId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid ||
         request.auth.uid in resource.data.collaborators);
      allow write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Public templates
    match /templates/{templateId} {
      allow read: if resource.data.isPublic == true;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
    
    // Shared trips with permissions
    match /shared_trips/{tripId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.collaborators;
      allow write: if request.auth != null &&
        resource.data.permissions[request.auth.uid] in ['edit', 'admin'];
    }
  }
}
```

## Indexes Required

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "trips",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "trips",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "favorites",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "expenses",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "search_history",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Migration Strategy

### Phase 1: Core Features (Current)
- [x] User authentication
- [x] Trip storage and history
- [ ] User preferences sync

### Phase 2: Enhanced Features (Q1 2025)
- [ ] Favorites/bookmarks
- [ ] Trip templates
- [ ] Search history

### Phase 3: Collaborative Features (Q2 2025)
- [ ] Shared trips
- [ ] Comments and notes
- [ ] Real-time collaboration

### Phase 4: Advanced Features (Q3 2025)
- [ ] Offline mode
- [ ] Budget tracking
- [ ] AI recommendations

## Performance Considerations

### 1. Query Optimization
- Always paginate large collections (limit 20-50)
- Use composite indexes for complex queries
- Denormalize data when read > write frequency

### 2. Caching Strategy
```typescript
class CacheManager {
  private cache = new Map<string, CacheEntry>();
  
  async get(key: string, fetcher: () => Promise<any>, ttl = 5 * 60 * 1000) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 3. Batch Operations
```typescript
async function batchUpdate(updates: Update[]) {
  const batch = writeBatch(db);
  
  updates.forEach(update => {
    const ref = doc(db, update.collection, update.id);
    batch.update(ref, update.data);
  });
  
  await batch.commit();
}
```

## Monitoring & Analytics

### Track Storage Metrics
- Document reads/writes per user
- Storage size per collection
- Query performance (p50, p95, p99)
- Cache hit rates
- Offline queue size

### Alert Thresholds
- localStorage > 4MB used
- Firestore reads > 50k/day
- Failed sync attempts > 10
- Offline queue > 100 items

## Cost Optimization

### Firestore Cost Reduction
1. **Minimize Reads:**
   - Cache aggressively
   - Use real-time listeners wisely
   - Batch requests when possible

2. **Optimize Storage:**
   - Archive old trips (>1 year)
   - Compress large text fields
   - Move media to Cloud Storage

3. **Smart Indexing:**
   - Only create necessary indexes
   - Monitor index usage
   - Remove unused indexes

### Estimated Costs (per 1000 users)
- Firestore reads: ~$0.06/day
- Firestore writes: ~$0.18/day
- Storage: ~$0.01/day
- Total: ~$7.50/month

## Implementation Checklist

### For Each New Feature:
- [ ] Define data schema
- [ ] Choose storage solution(s)
- [ ] Create Firestore indexes
- [ ] Implement security rules
- [ ] Add offline support (if applicable)
- [ ] Create migration script (if needed)
- [ ] Add monitoring/analytics
- [ ] Document in this file
- [ ] Test cross-device sync
- [ ] Verify security rules

## Code Templates

### Service Template
```typescript
// src/lib/services/[feature]-service.ts
import { db } from '@/lib/firebase';
import { collection, doc, /* ... */ } from 'firebase/firestore';

interface [Feature]Data {
  // Define schema
}

class [Feature]Service {
  private readonly COLLECTION_NAME = '[collection]';
  
  async create(data: [Feature]Data): Promise<string> {
    // Implementation
  }
  
  async get(id: string): Promise<[Feature]Data | null> {
    // Implementation
  }
  
  async update(id: string, data: Partial<[Feature]Data>): Promise<void> {
    // Implementation
  }
  
  async delete(id: string): Promise<void> {
    // Implementation
  }
  
  async list(userId: string): Promise<[Feature]Data[]> {
    // Implementation
  }
}

export const [feature]Service = new [Feature]Service();
```

## Resources

- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Pricing](https://firebase.google.com/pricing)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Offline Data Guide](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

---

Last Updated: 2025-09-12
Next Review: 2025-10-12