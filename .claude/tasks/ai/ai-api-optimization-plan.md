# AI & API Services Optimization Plan

## Current State Analysis

### 🚨 Issues Found

#### src/services/ai/
1. **multi-city-fix.ts** - Appears to be a temporary fix file, only imported in ai-controller.ts
2. **progressive-generator.ts** - Used by API routes but might be duplicating trip-generator functionality
3. **services/** subdirectory contains:
   - `location-enrichment-locationiq.ts` - Only used by trip-generator.ts
   - `osm-poi-service.ts` - Only used by trip-generator.ts
   - These should be in src/services/api/ not nested under AI

#### src/services/api/
1. **locationiq.ts** & **locationiq-enhanced.ts** - Two similar files, confusing which to use
2. **static-places.ts** - Hardcoded data, should be in data/static/
3. **here-places.ts** - Active and used
4. **weather.ts** - Active but barely used
5. **pexels.ts** - Only used for image display

### 📊 Usage Analysis

**Actively Used:**
- ai-controller.ts (main controller)
- trip-generator.ts (core generation)
- progressive-generator.ts (streaming responses)
- prompts.ts (prompt templates)
- schemas.ts (TypeScript types)
- here-places.ts (place search)
- pexels.ts (images)

**Questionable/Unused:**
- multi-city-fix.ts (temporary fix)
- location-enrichment-locationiq.ts (should be API service)
- osm-poi-service.ts (should be API service)
- locationiq.ts (redundant with enhanced version)
- static-places.ts (should be in data/)
- weather.ts (barely used)

## Proposed Structure

```
src/services/
├── ai/
│   ├── ai-controller.ts          # Main AI orchestrator
│   ├── trip-generator.ts         # Core trip generation logic
│   ├── progressive-generator.ts  # Streaming/progressive generation
│   ├── prompts.ts               # Prompt templates
│   ├── schemas.ts               # AI response schemas
│   └── README.md                # AI service documentation
│
└── api/
    ├── places/
    │   ├── here-places.ts      # HERE Places API
    │   ├── locationiq.ts       # LocationIQ API (merged)
    │   └── osm-poi.ts          # OSM POI service (moved)
    ├── media/
    │   └── pexels.ts           # Pexels image API
    ├── weather/
    │   └── weather.ts          # Weather API
    └── README.md               # API documentation
```

## Action Items

### Phase 1: Clean up AI Services
1. ✅ Remove `multi-city-fix.ts` - integrate fixes into main files
2. ✅ Move `services/location-enrichment-locationiq.ts` → `api/places/location-enrichment.ts`
3. ✅ Move `services/osm-poi-service.ts` → `api/places/osm-poi.ts`
4. ✅ Update imports in trip-generator.ts

### Phase 2: Consolidate API Services
1. ✅ Merge locationiq.ts and locationiq-enhanced.ts → `api/places/locationiq.ts`
2. ✅ Move static-places.ts → `data/static/city-attractions.ts`
3. ✅ Create subdirectories for better organization
4. ✅ Update all imports

### Phase 3: Optimize Generation Flow
1. ✅ Evaluate if progressive-generator.ts and trip-generator.ts can be merged
2. ✅ Remove duplicate OpenAI client initialization
3. ✅ Consolidate prompt construction logic
4. ✅ Standardize error handling

### Phase 4: Performance & Cleanup
1. ✅ Remove unused weather API calls if not needed
2. ✅ Cache API responses where appropriate
3. ✅ Add proper TypeScript types for all API responses
4. ✅ Document which APIs are actually being used

## Benefits
- 🎯 Clearer separation of concerns
- 📦 Better code organization
- 🚀 Reduced redundancy
- 🔧 Easier maintenance
- 📖 Improved discoverability

## Migration Strategy
1. Create new structure alongside existing
2. Update imports one by one
3. Test each change
4. Remove old files after verification