# AI Validation Schemas

Runtime validation schemas for AI service data structures.

**Last Updated**: January 25, 2025

## Overview

This directory contains Zod schemas for runtime validation of AI-related data. While TypeScript types (in `../types/core.types.ts`) provide compile-time safety, these schemas ensure data integrity at runtime, especially when dealing with external API responses or user input.

## File Structure

### validation.schemas.ts (5,308 lines)
The main validation schema file using Zod for runtime type checking.

## Schema Categories

### Activity Schemas
```typescript
export const ActivitySchema = z.object({
  time: z.string().optional(),
  description: z.string(),
  venue_name: z.string().optional(),
  category: z.enum(['Attraction', 'Food', 'Leisure', 'Shopping', 'Accommodation']).optional(),
  address: z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
  neighborhood: z.string().optional(),
  zone: z.string().optional(),
  rating: z.number().min(0).max(5).optional()
});
```

### Itinerary Schemas
```typescript
export const DailyItinerarySchema = z.object({
  day: z.number(),
  date: z.string(),
  city: z.string(),
  activities: z.array(ActivitySchema)
});

export const GeneratePersonalizedItineraryOutputSchema = z.object({
  destination: z.string(),
  duration: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  dailyItineraries: z.array(DailyItinerarySchema),
  estimatedCost: EstimatedCostSchema.optional(),
  weatherInfo: WeatherInfoSchema.optional(),
  travelTips: z.array(z.string()).optional(),
  photoUrl: z.string().optional()
});
```

### User Intent Schemas
```typescript
export const UserIntentSchema = z.object({
  destination: z.union([z.string(), z.array(z.string())]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  duration: z.number().optional(),
  budget: z.enum(['budget', 'medium', 'luxury']).optional(),
  interests: z.array(z.string()).optional(),
  travelers: TravelerInfoSchema.optional()
});
```

## Usage Examples

### Validating API Responses
```typescript
import { GeneratePersonalizedItineraryOutputSchema } from '../schemas/validation.schemas';

try {
  const response = await fetch('/api/ai/generate');
  const data = await response.json();

  // Validate and parse the response
  const validatedData = GeneratePersonalizedItineraryOutputSchema.parse(data);
  // validatedData is now type-safe
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### Safe Parsing with Defaults
```typescript
import { ActivitySchema } from '../schemas/validation.schemas';

const rawActivity = {
  description: "Visit Eiffel Tower",
  time: "invalid-time-format"
};

const result = ActivitySchema.safeParse(rawActivity);
if (result.success) {
  // Use result.data
} else {
  // Handle validation errors
  console.error('Validation errors:', result.error.format());
}
```

### Creating Type Guards
```typescript
import { UserIntentSchema } from '../schemas/validation.schemas';

function isValidUserIntent(data: unknown): data is UserIntent {
  return UserIntentSchema.safeParse(data).success;
}
```

## Key Features

### Automatic Type Inference
Zod schemas can infer TypeScript types:
```typescript
import { z } from 'zod';
import { ActivitySchema } from '../schemas/validation.schemas';

// Automatically infers the Activity type
type Activity = z.infer<typeof ActivitySchema>;
```

### Data Transformation
Schemas can transform data during parsing:
```typescript
const DateSchema = z.string().transform(str => new Date(str));
```

### Custom Validation Rules
```typescript
const BudgetSchema = z.string()
  .transform(val => val.toLowerCase())
  .pipe(z.enum(['budget', 'medium', 'luxury']));
```

## Best Practices

1. **Always validate external data** - API responses, user input, file contents
2. **Use safeParse for recoverable errors** - Don't crash on bad data
3. **Provide helpful error messages** - Use `.describe()` and `.error()`
4. **Keep schemas close to types** - Maintain parity with TypeScript types
5. **Test schema validation** - Include edge cases in tests

## Zod vs TypeScript Types

| Aspect | TypeScript Types | Zod Schemas |
|--------|-----------------|-------------|
| When | Compile time | Runtime |
| Purpose | Type safety in code | Data validation |
| Errors | Compilation errors | Runtime exceptions |
| Use for | Internal code | External data |

## Why We Removed Genkit

Previously, this project used both Genkit and Zod for validation. In January 2025, we removed Genkit because:
- Genkit was not being actively used in the codebase
- Zod alone provides all necessary validation features
- Reduces bundle size and complexity
- Simplifies the validation strategy

## Performance Considerations

- **Parsing is fast** - Most schemas parse in <1ms
- **Cache parsed schemas** - Reuse schema instances
- **Use lazy schemas** - For recursive structures
- **Avoid deep nesting** - Flatten when possible

## Related Files
- **Type Definitions**: `../types/core.types.ts` - TypeScript types
- **Validation Utils**: `../utils/validation.utils.ts` - Helper functions
- **API Integration**: Used throughout `../generators/` and `../modules/`

## Testing Schemas

```typescript
// Example test
describe('ActivitySchema', () => {
  it('should validate valid activity', () => {
    const activity = {
      time: "09:00",
      description: "Morning walk",
      category: "Leisure"
    };

    expect(() => ActivitySchema.parse(activity)).not.toThrow();
  });

  it('should reject invalid category', () => {
    const activity = {
      description: "Test",
      category: "InvalidCategory"
    };

    expect(() => ActivitySchema.parse(activity)).toThrow(z.ZodError);
  });
});
```