
# File Explanation: `src/components/figma/DayItinerary.tsx`

## Summary

This component is responsible for rendering the itinerary for a single day. It displays the day number, the date, and a list of activities for that day. It features an accordion-style expand/collapse functionality, allowing the user to show or hide the detailed list of activities.

---

## Detailed Breakdown

### Imports

```typescript
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EventCard } from './EventCard';
import { z } from 'genkit';
import { ActivitySchema } from '@/ai/schemas';
```
- **`framer-motion`**: Used for animating the expand/collapse behavior of the activity list.
- **`useState`**: React hook to manage the expanded/collapsed state of the component.
- **`lucide-react`**: Imports the `ChevronDown` icon, which is used as the visual indicator for the accordion.
- **`EventCard`**: Imports the child component used to render each individual activity.
- **`z` / `ActivitySchema`**: Imports the Zod schema and its inferred type for a single activity, ensuring type safety.

### `DayItinerary` Component Logic

```typescript
export function DayItinerary({ day, date, activities, dayIndex }: DayItineraryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // ...
}
```
- **Props**: The component takes `day` (number), `date` (string), `activities` (array), and `dayIndex` (for animation staggering) as props.
- **State**:
    - `const [isExpanded, setIsExpanded] = useState(false);`: This is the state that controls whether the list of activities is visible. It is initialized to `false`, so the day is collapsed by default. The `setIsExpanded` function is called by the `onClick` handler on the header.

### Helper Function: `getCategoryFromActivity`

```typescript
const getCategoryFromActivity = (activity: Activity): /*...*/ => {
    // ... logic to determine category from activity data ...
    if (category === 'food' || lowerDesc.includes('breakfast') /* ... */) {
      return 'food';
    }
    // ... other categories ...
    return 'activity';
};
```
- **Purpose**: This function acts as a translator. The `EventCard` child component expects a simplified category (`'work' | 'activity' | 'food' | 'transport'`) to determine its color and icon.
- **Logic**: It inspects the `category` and `description` of a full `activity` object from the AI and maps it to one of the simplified categories. For example, if the description includes "breakfast" or "lunch," it maps to the 'food' category. This adds a layer of robustness, ensuring events are displayed correctly even if the AI's categorization isn't perfect.

### JSX Structure

#### 1. Main Container and Header

```jsx
<motion.div /* ...animation... */ >
  <div
    className="flex items-center gap-3 mb-4 cursor-pointer group"
    onClick={() => setIsExpanded(!isExpanded)}
  >
    <div className="w-12 h-12 ... rounded-xl ...">
      <span className="text-white font-medium">{day}</span>
    </div>
    <div className="flex-1">
      <h2 className="text-white font-medium">Day {day}</h2>
      <p className="text-slate-400 text-sm">{date}</p>
    </div>
    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
      <ChevronDown />
    </motion.div>
  </div>
  {/* ... Activity List ... */}
</motion.div>
```
- **`motion.div` (Outer)**: The entire component is wrapped in a motion div to animate its appearance into the list, with a delay based on its `dayIndex`.
- **Header `div`**:
    - **`onClick={() => setIsExpanded(!isExpanded)}`**: This is the core of the accordion functionality. When the header is clicked, it toggles the `isExpanded` state variable.
    - **`cursor-pointer group`**: These classes provide visual feedback, changing the cursor to a pointer and allowing for group-hover effects (e.g., changing the chevron color on hover).
    - **Day Number**: A styled `div` displays the day number.
    - **Date and Title**: Displays the formatted date and title.
    - **`motion.div` (Chevron)**: The `ChevronDown` icon is wrapped in its own `motion.div`. The `animate` prop is linked to the `isExpanded` state, causing the icon to smoothly rotate 180 degrees when the state changes.

#### 2. Collapsible Activity List

```jsx
<motion.div
  initial={false}
  animate={{
    height: isExpanded ? 'auto' : 0,
    opacity: isExpanded ? 1 : 0
  }}
  className="overflow-hidden"
>
  <div className="space-y-3 ml-6 border-l-2 border-slate-600 pl-6">
    {activities.map((activity, index) => (
      <EventCard /* ...props... */ />
    ))}
  </div>
</motion.div>
```
- **`motion.div` (Collapsible Container)**: This `div` wraps the list of activities.
    - **`animate={{ height: ..., opacity: ... }}`**: This is the key to the smooth expand/collapse animation. When `isExpanded` is true, Framer Motion animates the `height` to `'auto'` and `opacity` to `1`. When it's false, it animates the `height` to `0` and `opacity` to `0`.
    - **`initial={false}`**: Prevents the animation from running on the initial page load.
    - **`overflow-hidden`**: This CSS class is essential. It clips the content of the `div`, so when the height is animated to 0, the activity cards inside are hidden.
- **Activity List `div`**:
    - `border-l-2 border-slate-600 pl-6`: This creates the vertical timeline effect, with a line to the left of the activity cards.
    - `activities.map(...)`: It iterates through the `activities` for