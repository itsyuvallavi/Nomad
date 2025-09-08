
# File Explanation: `src/components/itinerary-daily-view.tsx`

## Summary

This component is responsible for rendering the main timeline of the itinerary. It takes an array of daily plans and maps over them, creating a structured, day-by-day view. For each day, it displays the day number, the formatted date, and then renders a list of `ItineraryEventCard` components for each activity.

**Note:** This component seems to be an earlier version or an alternative to the more feature-rich `figma/DayItinerary.tsx`. While functional, it lacks the expand/collapse accordion feature of the `DayItinerary` component. The project currently uses `figma/ItineraryPanel.tsx` which in turn uses `figma/DayItinerary.tsx`, so this file might not be actively rendered in the current UI.

---

## Detailed Breakdown

### Directives

```typescript
'use client';
```
- **`'use client'`**: Marks this as a Client Component. This is necessary because it formats dates using the client's locale and timezone (`toLocaleDateString`) and it renders child components that use client-side hooks.

### Imports

```typescript
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import ItineraryEventCard from './itinerary-event-card';
```
- **`GeneratePersonalizedItineraryOutput`**: Imports the TypeScript type for the AI's output, allowing for strong typing of the `dailyPlans` prop.
- **`ItineraryEventCard`**: Imports the child component that is responsible for rendering each individual event within the day.

### Type Definitions

```typescript
type DailyPlan = GeneratePersonalizedItineraryOutput['itinerary'][0];

type ItineraryDailyViewProps = {
  dailyPlans: DailyPlan[];
};
```
- **`DailyPlan`**: This is a clever TypeScript trick. Instead of redefining the type for a single day's itinerary, it extracts the type of a single element from the `itinerary` array within the main `GeneratePersonalizedItineraryOutput` type. This ensures it's always in sync with the central schema.
- **`ItineraryDailyViewProps`**: Defines the props for the component, specifying that it expects a `dailyPlans` prop which is an array of `DailyPlan` objects.

### `ItineraryDailyView` Component Logic

```typescript
const ItineraryDailyView = ({ dailyPlans }: ItineraryDailyViewProps) => {
  if (!dailyPlans || dailyPlans.length === 0) {
    return <p>No itinerary available.</p>;
  }

  // ... formatDate function ...

  return (
    <div className="space-y-6">
      {dailyPlans.map((plan, dayIndex) => {
        // ...
        return (
          <div key={plan.day} /* ... */ >
            {/* ... Day Header ... */}
            <div className="space-y-3 ml-4 pl-7 border-l-2 border-slate-700">
              {plan.activities.map((activity, eventIndex) => (
                <ItineraryEventCard key={eventIndex} activity={activity} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  );
};
```
- **Fallback Content**: The component first checks if `dailyPlans` is empty or doesn't exist. If so, it returns a simple "No itinerary available" message. This prevents the component from crashing if it receives no data.

- **`formatDate` Function**:
  - This helper function takes a date string (e.g., "2025-02-15") and formats it for display.
  - `const userTimezoneOffset = date.getTimezoneOffset() * 60000;`: This line is important for correctness. Dates from the AI might not have timezone information. This code gets the user's browser's timezone offset and applies it to the date, ensuring that the date displayed is correct for the user's local timezone.
  - It returns an object containing the formatted `weekday` (e.g., "Saturday") and `date` (e.g., "February 15").

- **Rendering with `.map()`**:
    - `dailyPlans.map((plan, dayIndex) => ...)`: The component iterates over the `dailyPlans` array. For each `plan` object, it renders a `div` that represents one day.
    - **Day Header**: Inside the loop, it displays the day number (`plan.day`) and the formatted date and weekday obtained from the `formatDate` function.
    - **Timeline Effect**: The `div` containing the activities has `ml-4 pl-7 border-l-2 border-slate-700`. This combination of margin, padding, and a left border is what creates the vertical timeline effect, visually connecting the events of the day.
    - **Nested Map**: It then performs a nested map over `plan.activities` to render an `ItineraryEventCard` for each activity of that specific day.
