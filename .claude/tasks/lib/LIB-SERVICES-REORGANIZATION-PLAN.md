# /lib and /services Reorganization Plan

## Current Problems

### 1. Confusing Separation
- **`/lib`** - Mix of utilities, constants, and infrastructure
- **`/services`** - All business logic and API integrations
- Why are they separate? It's unclear!

### 2. Messy /lib Root
- Random files in root: `animations.ts`, `firebase-analytics.ts`, `retry-utils.ts`, `utils.ts`
- Should be organized into categories

### 3. Duplications & Inconsistencies
- `ai-logger.ts` exists in both `/lib/utils/` AND `/lib/monitoring/`
- Firebase auth in `/services/firebase/` but firebase-analytics in `/lib/`
- Some utils in `/lib/utils/`, others in root, some in `/lib/retry-utils.ts`

### 4. Poor Naming
- What's the difference between `utils.ts` and the `utils/` folder?
- `services/ai/services/` - services inside services?

## Proposed New Structure: Merge into `/core`

I propose merging `/lib` and `/services` into a single `/core` directory with clear categories:

```
src/
├── core/                         # All business logic and utilities
│   ├── ai/                      # AI/LLM related code
│   │   ├── flows/               # AI workflows (itinerary generation, etc)
│   │   ├── conversation/        # Conversation management
│   │   ├── prompts/             # AI prompts and templates
│   │   ├── utils/               # AI utilities
│   │   ├── openai-config.ts    # OpenAI configuration
│   │   └── schemas.ts           # AI type definitions
│   │
│   ├── api/                     # External API integrations
│   │   ├── maps/                # Map-related APIs
│   │   │   ├── locationiq.ts
│   │   │   └── geocoding.ts
│   │   ├── travel/              # Travel-related APIs
│   │   │   └── amadeus.ts
│   │   ├── media/               # Media APIs
│   │   │   └── pexels.ts
│   │   └── weather/             # Weather APIs
│   │       └── weather.ts
│   │
│   ├── data/                    # Data management
│   │   ├── trips/               # Trip data management
│   │   │   ├── trips-service.ts
│   │   │   └── draft-manager.ts
│   │   ├── storage/             # Storage abstractions
│   │   │   └── offline-storage.ts
│   │   └── constants/           # App constants
│   │       ├── city-landmarks.ts
│   │       ├── city-zones.ts
│   │       └── api-config.ts
│   │
│   ├── firebase/                # Firebase services
│   │   ├── auth.ts             # Authentication
│   │   ├── analytics.ts        # Analytics (from lib/)
│   │   └── firestore.ts        # Database (if exists)
│   │
│   ├── infrastructure/          # App infrastructure (from lib/)
│   │   ├── providers/           # React providers
│   │   │   ├── motion.tsx
│   │   │   └── offline.tsx
│   │   ├── contexts/            # React contexts
│   │   │   └── AuthContext.tsx
│   │   └── components/          # Infrastructure components
│   │       ├── ErrorBoundary.tsx
│   │       └── PasswordGate.tsx
│   │
│   ├── utils/                   # General utilities
│   │   ├── animations.ts       # Animation utilities
│   │   ├── retry.ts            # Retry logic (was retry-utils.ts)
│   │   ├── date.ts             # Date utilities
│   │   ├── format.ts           # Formatting utilities
│   │   └── helpers.ts          # General helpers (was utils.ts)
│   │
│   └── monitoring/              # Logging and monitoring
│       ├── logger.ts            # Main logger
│       ├── error-handler.ts    # Error handling
│       ├── ai-logger.ts        # AI-specific logging (deduplicated)
│       └── production.ts       # Production logging
```

## Alternative: Keep Separation but Reorganize

If merging is too big a change, we could keep them separate but make the distinction clearer:

```
src/
├── lib/                         # Technical utilities & infrastructure
│   ├── utils/                   # Pure utility functions
│   │   ├── animations.ts
│   │   ├── retry.ts
│   │   ├── format.ts
│   │   └── helpers.ts
│   ├── monitoring/              # Logging & error handling
│   │   ├── logger.ts
│   │   ├── error-handler.ts
│   │   └── ai-logger.ts
│   ├── infrastructure/          # App infrastructure
│   │   ├── providers/
│   │   ├── contexts/
│   │   └── components/
│   └── constants/              # Static data
│       ├── city-landmarks.ts
│       └── api-config.ts
│
└── services/                    # Business logic & external integrations
    ├── ai/                      # AI services
    ├── api/                     # External APIs
    ├── firebase/                # Firebase services
    ├── trips/                   # Trip management
    └── storage/                 # Data storage
```

## Benefits of Merging to `/core`

1. **Single Source of Truth** - No confusion about where code should go
2. **Clear Categories** - Organized by functionality, not by technical vs business
3. **Easier Navigation** - Find AI code in ai/, API code in api/, etc.
4. **No Duplication** - Each utility has one clear location
5. **Better for New Developers** - One place to look for all non-UI code

## Migration Strategy

### Phase 1: Create /core structure
```bash
mkdir -p src/core/{ai,api,data,firebase,infrastructure,utils,monitoring}
```

### Phase 2: Move with better organization
- Consolidate duplicates (ai-logger.ts)
- Rename files for clarity (retry-utils.ts → retry.ts)
- Group related files (all map APIs together)

### Phase 3: Update imports
- Simple find/replace: `@/lib/` → `@/core/`
- Simple find/replace: `@/services/` → `@/core/`

### Phase 4: Delete old directories
- Remove empty `/lib` and `/services`

## File Mapping Examples

| Current Location | New Location | Reason |
|-----------------|--------------|---------|
| `/lib/animations.ts` | `/core/utils/animations.ts` | Utility function |
| `/lib/firebase-analytics.ts` | `/core/firebase/analytics.ts` | Group Firebase code |
| `/services/ai/flows/` | `/core/ai/flows/` | Keep AI together |
| `/lib/utils/ai-logger.ts` | `/core/monitoring/ai-logger.ts` | It's for monitoring |
| `/lib/monitoring/ai-logger.ts` | (deleted - duplicate) | Remove duplicate |
| `/lib/retry-utils.ts` | `/core/utils/retry.ts` | Better naming |
| `/services/trips/` | `/core/data/trips/` | Data management |
| `/lib/constants/` | `/core/data/constants/` | Static data |

## Questions for Decision

1. **Merge or Keep Separate?**
   - Option A: Merge to `/core` (recommended)
   - Option B: Keep `/lib` and `/services` but reorganize

2. **Naming Convention**
   - Use `/core` or another name like `/modules`, `/domain`?

3. **How Deep to Reorganize?**
   - Just move files as-is?
   - Or also refactor/rename for clarity?

## Next Steps

1. Decide on approach (merge vs separate)
2. Create new directory structure
3. Move files systematically
4. Update all imports
5. Test thoroughly
6. Clean up old directories

This reorganization will make the codebase MUCH easier to understand and navigate!