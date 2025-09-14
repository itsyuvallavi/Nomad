# SRC Folder Cleanup Recommendations

## Summary
- **Total files**: 168
- **Unused files**: 39 (files with no imports)
- **Duplicate sets**: 12 (files with similar names/functionality)

## 🔴 HIGH PRIORITY - Unused Files (Safe to Delete)

### Unused Components (20 files)
These components are not imported anywhere in the codebase:

<!-- #### Chat Components
- `src/components/chat/ai-thinking.tsx` - Not used
- `src/components/chat/chat-input.tsx` - Not used
- `src/components/chat/context-display.tsx` - Not used
- `src/components/chat/generation-progress.tsx` - Not used
- `src/components/chat/hooks/use-chat-storage.ts` - Not used
- `src/components/chat/premium-chat-input.tsx` - Not used
- `src/components/chat/premium-message-bubble.tsx` - Not used
- `src/components/chat/services/ai-service.ts` - Not used -->

#### Itinerary Components
- `src/components/itinerary/travel-details.tsx` - Not used
- `src/components/itinerary/trip-tips.tsx` - Not used

#### UI Components
<!-- - `src/components/ui/accordion.tsx` - Not used
- `src/components/ui/animated-button.tsx` - Not used
- `src/components/ui/aspect-ratio.tsx` - Not used
- `src/components/ui/button-group.tsx` - Not used
- `src/components/ui/confirmation-dialog.tsx` - Not used -->
- `src/components/ui/dropdown-menu.tsx` - Not used
<!-- - `src/components/ui/fancy-button.tsx` - Not used
- `src/components/ui/hover-card.tsx` - Not used
- `src/components/ui/radio-group.tsx` - Not used
- `src/components/ui/sheet.tsx` - Not used -->

### Unused Services (12 files)
These service files are not imported anywhere:

#### AI Services
<!-- - `src/services/ai/config.ts` - Not used
- `src/services/ai/services/conversation-state.ts` - Not used
- `src/services/ai/utils/ai-parser.ts` - Not used
- `src/services/ai/utils/enhanced-destination-parser.ts` - Not used
- `src/services/ai/utils/intelligent-trip-extractor.ts` - Not used -->

<!-- #### API Services (Already deleted from git status)
- `src/services/api/foursquare.ts` - Not used
- `src/services/api/google-places-optimized.ts` - Not used
- `src/services/api/google-places.ts` - Not used
- `src/services/api/radar-places.ts` - Not used
- `src/services/api/radar.ts` - Not used
- `src/services/api/pexels.ts` - Not used
- `src/services/api/weather.ts` - Not used -->

### Unused Lib Files (6 files)
<!-- - `src/lib/monitoring/performance-monitor.ts` - Not used
- `src/lib/request-deduplication.ts` - Not used
- `src/lib/utils/circuit.ts` - Not used
- `src/lib/utils/master-parser.ts` - Not used
- `src/lib/utils/retry.ts` - Not used -->
- `src/lib/utils.ts` - Not used

### Unused Hooks (1 file)
<!-- - `src/hooks/use-enhanced-chat.ts` - Not used -->

## 🟡 MEDIUM PRIORITY - Duplicate Files

These are pairs/groups of files with similar functionality. Review to determine which to keep:

### 1. City Landmarks
- **OLD**: `src/lib/city-landmarks.ts`
- **NEW**: `src/lib/constants/city-landmarks.ts`
- **Recommendation**: Keep the one in constants folder (better organization)

### 2. API Config
- **OLD**: `src/lib/config/api-config.ts`
- **NEW**: `src/lib/constants/api-config.ts`
- **Recommendation**: Keep the one in constants folder

### 3. Draft Manager
- **OLD**: `src/lib/draft-manager.ts`
- **NEW**: `src/services/trips/draft-manager.ts`
- **Recommendation**: Keep the one in services folder (follows new structure)

### 4. Error Handler
- **OLD**: `src/lib/error-handler.ts`
- **NEW**: `src/lib/monitoring/error-handler.ts`
- **Recommendation**: Keep the one in monitoring folder

### 5. Logger
- **OLD**: `src/lib/logger.ts`
- **NEW**: `src/lib/monitoring/logger.ts`
- **Recommendation**: Keep the one in monitoring folder

### 6. AI Logger
- **OLD**: `src/lib/utils/ai-logger.ts`
- **NEW**: `src/lib/monitoring/ai-logger.ts`
- **Recommendation**: Keep the one in monitoring folder

### 7. Production Logger
- **OLD**: `src/lib/production-logger.ts`
- **NEW**: `src/lib/monitoring/production-logger.ts`
- **Recommendation**: Keep the one in monitoring folder

### 8. Offline Storage
- **OLD**: `src/lib/offline-storage.ts`
- **NEW**: `src/services/storage/offline-storage.ts`
- **Recommendation**: Keep the one in services folder

### 9. Trips Service
- **OLD**: `src/lib/trips-service.ts`
- **NEW**: `src/services/trips/trips-service.ts`
- **Recommendation**: Keep the one in services folder

### 10. Clear All Trips
- **OLD**: `src/lib/utils/clear-all-trips.ts`
- **NEW**: `src/utils/clear-all-trips.ts`
- **Recommendation**: Review both to see which is more recent/complete

## 🟢 Action Plan

### Step 1: Delete Unused Files
Start with the unused files as they're safe to delete:
1. Unused UI components (20 files)
2. Unused service files (12 files)
3. Unused lib files (6 files)
4. Unused hook (1 file)

### Step 2: Resolve Duplicates
For each duplicate pair:
1. Check which version is more recent
2. Check which has more functionality
3. Update imports to use the correct one
4. Delete the old version

### Step 3: Create Re-exports (if needed)
If some files are commonly imported from old locations, create re-export files:
```typescript
// src/lib/firebase.ts
export * from '@/services/firebase/auth';
```

## 📊 Impact Analysis

Removing these files would:
- **Reduce codebase by**: ~39 files (23% reduction)
- **Simplify structure**: Remove confusion from duplicates
- **Improve maintainability**: Less code to maintain
- **Reduce bundle size**: Potentially smaller builds

## ⚠️ Important Notes

1. **Always backup before deleting**: Create an archive folder
2. **Test after each deletion**: Run build and tests
3. **Check for dynamic imports**: Some files might be imported dynamically
4. **Review git history**: Some files might be needed for rollback

## Next Steps

1. Review this report
2. Decide which files to delete
3. Create a backup/archive
4. Delete files in small batches
5. Test after each batch
6. Update imports as needed