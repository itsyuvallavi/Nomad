# AI Types

Centralized TypeScript type definitions for the AI service.

**Last Updated**: January 25, 2025

## Overview

This directory contains the single source of truth for all TypeScript types used throughout the AI service. All type definitions have been consolidated here to ensure consistency and eliminate duplication.

## File Structure

### core.types.ts (7,523 lines)
The main type definition file containing all interfaces and types for the AI system.

## Type Categories

### Core Types
```typescript
export interface Activity {
  time?: string;
  description: string;
  venue_name?: string;
  category?: ActivityCategory;
  address?: string;
  coordinates?: { lat: number; lng: number };
  neighborhood?: string;
  zone?: string;
  rating?: number;
}

export interface DailyItinerary {
  day: number;
  date: string;
  city: string;
  activities: Activity[];
}
```

### User Intent & Conversation
```typescript
export interface UserIntent {
  destination?: string | string[];
  startDate?: string;
  endDate?: string;
  duration?: number;
  budget?: string;
  interests?: string[];
  travelers?: TravelerInfo;
}

export interface ConversationContext {
  sessionId: string;
  state: ConversationState;
  currentIntent: Partial<UserIntent>;
  messages: ConversationMessage[];
  lastUpdated: number;
}
```

### Generation Output
```typescript
export interface GeneratePersonalizedItineraryOutput {
  destination: string;
  duration: number;
  startDate: string;
  endDate: string;
  dailyItineraries: DailyItinerary[];
  estimatedCost?: EstimatedCost;
  weatherInfo?: WeatherInfo;
  travelTips?: string[];
  photoUrl?: string;
}
```

### Progressive Generation
```typescript
export interface ProgressiveMetadata {
  title: string;
  overview: string;
  duration: number;
  startDate: string;
  endDate: string;
  destinations: string[];
  estimatedCost: EstimatedCost;
  tips: string[];
  photoUrl: string;
}

export interface BaseItinerary {
  city: string;
  days: number;
  startDate: string;
  endDate: string;
  dailyItineraries: DailyItinerary[];
}
```

### Support Types
- `ActivityCategory` - Activity categorization enum
- `ConversationState` - Conversation flow states
- `EstimatedCost` - Cost breakdown structure
- `TravelerInfo` - Group composition details
- `WeatherInfo` - Weather forecast data
- `ProgressUpdate` - Progressive generation callbacks

## Usage Guidelines

### Importing Types
Always import types from this centralized location:
```typescript
import {
  Activity,
  DailyItinerary,
  UserIntent,
  GeneratePersonalizedItineraryOutput
} from '../types/core.types';
```

### Adding New Types
When adding new types:
1. Add them to `core.types.ts` in the appropriate section
2. Export them properly
3. Update this README with the new types
4. Ensure no duplicate definitions exist elsewhere

### Type Naming Conventions
- **Interfaces**: PascalCase (e.g., `UserIntent`, `DailyItinerary`)
- **Type Aliases**: PascalCase (e.g., `ConversationState`)
- **Enums**: PascalCase (e.g., `ActivityCategory`)
- **Generic Types**: Include `T` prefix (e.g., `TResponse<T>`)

## Type Validation

Runtime validation is handled separately in `../schemas/validation.schemas.ts` using Zod schemas. The TypeScript types provide compile-time safety, while Zod schemas provide runtime validation.

## Migration History

### January 25, 2025 - Type Consolidation
- Merged `itinerary.types.ts` into `core.types.ts`
- Moved `progressive/types.ts` content here
- Eliminated all duplicate type definitions
- Created single source of truth

## Related Files
- **Validation**: `../schemas/validation.schemas.ts` - Runtime validation
- **Constants**: `../../lib/constants/` - Static values and enums
- **API Types**: `../../api/places/here-places.ts` - External API types

## Best Practices

1. **Never duplicate types** - Always reference from this location
2. **Keep types pure** - No implementation logic in type files
3. **Document complex types** - Add JSDoc comments for clarity
4. **Version breaking changes** - Note any breaking type changes
5. **Use strict types** - Avoid `any` whenever possible