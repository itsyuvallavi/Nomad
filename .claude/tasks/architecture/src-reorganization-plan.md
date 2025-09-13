# SRC Directory Reorganization Plan

## Current Issues
1. **Duplicate Files**: Same functionality in multiple locations (lib vs services)
2. **Inconsistent Nesting**: Some components have internal services/hooks/utils
3. **Poor Naming**: Multiple versions of similar files (chat-container, chat-container-v2)
4. **Mixed Concerns**: Business logic mixed with utilities
5. **Scattered Dependencies**: Related code spread across directories

## Proposed Structure

```
src/
├── app/                          # Next.js App Router (pages only)
│   ├── api/                      # API routes
│   ├── (auth)/                   # Auth group routes
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/                   # Main app routes
│   │   ├── trips/
│   │   ├── profile/
│   │   ├── settings/
│   │   └── favorites/
│   └── layout.tsx                # Root layout
│
├── features/                     # Feature-based modules (NEW)
│   ├── auth/
│   │   ├── components/           # Auth UI components
│   │   ├── hooks/                # Auth hooks
│   │   ├── services/             # Auth business logic
│   │   └── types.ts              # Auth types
│   │
│   ├── chat/
│   │   ├── components/
│   │   │   ├── ChatContainer.tsx (renamed from chat-container-v2)
│   │   │   ├── ChatInput.tsx
│   │   │   └── MessageList.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── itinerary/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── map/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/             # Geocoding, routing
│   │   └── types.ts
│   │
│   └── trips/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types.ts
│
├── core/                         # Core app functionality (NEW)
│   ├── ai/                       # AI processing
│   │   ├── flows/                # AI flow definitions
│   │   ├── prompts/              # Prompt templates
│   │   ├── parsers/              # Input/output parsers (consolidated)
│   │   │   ├── destination.ts   # Single destination parser
│   │   │   ├── itinerary.ts     # Itinerary parser
│   │   │   └── input.ts          # Input classification
│   │   ├── providers/            # AI providers (OpenAI, etc.)
│   │   └── schemas.ts            # AI schemas
│   │
│   ├── integrations/             # External API integrations (renamed from api)
│   │   ├── amadeus/
│   │   ├── google/
│   │   │   ├── places.ts
│   │   │   └── maps.ts
│   │   ├── radar/
│   │   ├── weather/
│   │   └── photos/               # Pexels, Unsplash
│   │
│   ├── firebase/                 # Firebase services
│   │   ├── auth.ts
│   │   ├── analytics.ts
│   │   └── config.ts
│   │
│   └── storage/                  # Data persistence
│       ├── local.ts              # Local storage
│       ├── offline.ts            # Offline storage
│       └── drafts.ts             # Draft management
│
├── shared/                       # Shared across features (renamed from components)
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Base UI components (shadcn)
│   │   ├── layout/               # Layout components
│   │   └── feedback/             # Error, loading, empty states
│   │
│   ├── hooks/                    # Global hooks
│   │   ├── useKeyboard.ts
│   │   ├── useGestures.ts
│   │   └── useServiceWorker.ts
│   │
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx
│   │
│   └── providers/                # React providers
│       ├── MotionProvider.tsx
│       └── OfflineProvider.tsx
│
├── lib/                          # Pure utilities only
│   ├── utils/                    # Utility functions
│   │   ├── date.ts               # Date utilities
│   │   ├── format.ts             # Formatting utilities
│   │   ├── validation.ts         # Input validation
│   │   └── retry.ts              # Retry logic
│   │
│   ├── constants/                # App constants
│   │   ├── cities.ts             # City data
│   │   ├── config.ts             # App configuration
│   │   └── defaults.ts           # Default values
│   │
│   └── monitoring/               # Observability
│       ├── logger.ts             # Single logger implementation
│       ├── errors.ts             # Error handling
│       └── performance.ts        # Performance monitoring
│
└── types/                        # Global TypeScript types
    ├── api.ts                    # API response types
    ├── models.ts                 # Data models
    └── global.d.ts               # Global type declarations
```

## Key Changes

### 1. Feature-Based Organization
- Group related functionality together (components + hooks + services)
- Each feature is self-contained with its own types
- Easier to understand and maintain

### 2. Core vs Shared vs Lib
- **Core**: Business-critical functionality (AI, integrations, storage)
- **Shared**: Reusable across features (UI components, global hooks)
- **Lib**: Pure utilities with no business logic

### 3. File Consolidation
- Remove duplicate API files → Single source in `core/integrations`
- Consolidate parsers → One parser per concern in `core/ai/parsers`
- Single logger → `lib/monitoring/logger.ts`

### 4. Naming Improvements
- Remove version suffixes (v2, v3) → Keep best version
- Use clear, descriptive names
- Follow consistent naming patterns

### 5. Migration Path

#### Phase 1: Create New Structure
- Create feature directories
- Create core directories
- Set up proper exports

#### Phase 2: Move & Consolidate
- Move chat components to `features/chat`
- Move map components to `features/map`
- Consolidate AI parsers
- Merge duplicate API files

#### Phase 3: Update Imports
- Update all import paths
- Create barrel exports for cleaner imports
- Add path aliases in tsconfig

#### Phase 4: Clean Up
- Remove old directories
- Delete duplicate files
- Update documentation

## Benefits
1. **Better Organization**: Clear separation of concerns
2. **Reduced Duplication**: Single source of truth for each functionality
3. **Easier Navigation**: Logical grouping makes finding code easier
4. **Scalability**: Feature-based structure scales better
5. **Maintainability**: Related code stays together

## Path Aliases (tsconfig.json)
```json
{
  "compilerOptions": {
    "paths": {
      "@/features/*": ["./src/features/*"],
      "@/core/*": ["./src/core/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

## Example Import Changes
```typescript
// Before
import { auth } from '@/lib/firebase';
import { auth as authService } from '@/services/firebase/auth';
import { ChatContainer } from '@/components/chat/chat-container-v2';

// After
import { auth } from '@/core/firebase/auth';
import { ChatContainer } from '@/features/chat/components/ChatContainer';
```

## Risk Mitigation
1. **Gradual Migration**: Move one feature at a time
2. **Maintain Compatibility**: Keep old imports working temporarily
3. **Test Coverage**: Ensure tests pass after each migration
4. **Git History**: Use `git mv` to preserve file history
5. **Team Communication**: Document all changes clearly

## Timeline Estimate
- Phase 1: 2 hours (structure creation)
- Phase 2: 4 hours (file migration)
- Phase 3: 3 hours (import updates)
- Phase 4: 1 hour (cleanup)

Total: ~10 hours of focused work

## Next Steps
1. Review and approve this plan
2. Create feature branches for each phase
3. Start with least-risky migrations (UI components)
4. Move to core functionality
5. Update all imports and tests