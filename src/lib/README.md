# Lib Directory

Pure utility functions and helpers without side effects.

## Directory Structure

```
lib/
├── constants/               # Static configuration & constants
│   ├── api-config.ts       # API endpoint configurations
│   ├── city-landmarks.ts   # Static city landmark data
│   └── city-zones.ts       # City zone definitions
├── helpers/                 # Data transformation helpers
│   ├── clear-all-trips.ts  # Trip clearing utility
│   └── general.ts          # General helper functions
├── monitoring/             # Logging & error handling
│   ├── ai-logger.ts        # AI-specific logging
│   ├── error-handler.ts    # Error handling utilities
│   ├── logger.ts           # General logging utility
│   └── production-logger.ts # Production logging config
├── utils/                  # General utilities
│   ├── animations.ts       # Animation utilities
│   └── retry.ts           # Retry logic wrapper
├── animations.ts           # Legacy animation exports
└── utils.ts               # General utility functions
```

## What Belongs Here

✅ **DO** place here:
- Pure functions without side effects
- Data transformation and formatting functions
- Static configuration and constants
- Helper functions for data manipulation
- Logging utilities (console/local only)
- Animation and UI utilities
- Retry and error handling logic

❌ **DON'T** place here:
- API calls or external services → Use `src/services/api/`
- React components → Use `src/components/`
- React hooks → Use `src/hooks/`
- Functions with side effects → Use `src/services/`
- Firebase/database operations → Use `src/services/firebase/`
- Business logic → Use `src/services/`
- React contexts → Use `src/infrastructure/contexts/`

## Module Categories

### Constants (`/constants`)
Static configuration values and data:
- **api-config.ts**: API endpoint structures and configurations
- **city-landmarks.ts**: Predefined city landmark data
- **city-zones.ts**: City zone and region definitions

### Helpers (`/helpers`)
Pure data transformation functions:
- **general.ts**: Common helper functions (formatting, parsing)
- **clear-all-trips.ts**: Utility for clearing trip data

### Monitoring (`/monitoring`)
Logging and error tracking (local only):
- **logger.ts**: Development logging utility
- **ai-logger.ts**: AI flow debugging and monitoring
- **error-handler.ts**: Error formatting and handling
- **production-logger.ts**: Production-safe logging

### Utils (`/utils`)
General-purpose utilities:
- **animations.ts**: Animation timing and easing functions
- **retry.ts**: Retry logic for failed operations

## Usage Examples

```tsx
// Import utilities
import { cn } from '@/lib/utils';
import { CITY_LANDMARKS } from '@/lib/constants/city-landmarks';
import { logger } from '@/lib/monitoring/logger';
import { animationConfig } from '@/lib/utils/animations';
import { retry } from '@/lib/utils/retry';

// Use in code
const className = cn('base-class', { 'active': isActive });
const landmarks = CITY_LANDMARKS['london'];
logger.debug('Processing request', { data });
```

## Best Practices

1. **Pure Functions**: All functions should be pure (same input = same output)
2. **No Side Effects**: Don't modify external state or make API calls
3. **Type Safety**: Fully type all functions and exports
4. **Tree Shaking**: Export individual functions for better bundling
5. **Testing**: Write unit tests for utility functions

## Common Patterns

### Utility Function
```typescript
// Pure function with no side effects
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US').format(date);
}
```

### Constants Export
```typescript
// Static configuration
export const API_ENDPOINTS = {
  auth: '/api/auth',
  trips: '/api/trips',
} as const;
```

### Helper Function
```typescript
// Data transformation
export function parseItinerary(raw: string): Itinerary {
  // Pure transformation logic
  return parsed;
}
```

## Migration Notes

When moving code to this directory:
1. Ensure functions are pure (no side effects)
2. Remove any API calls or external dependencies
3. Update imports throughout the codebase
4. Add proper TypeScript types
5. Consider adding unit tests