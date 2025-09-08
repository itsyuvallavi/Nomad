
# File Explanation: `src/components/figma/EventCard.tsx`

## Summary

This component is responsible for rendering a single event or activity within a day's itinerary. It's a small, self-contained "card" that displays the event's title, time, description, and address, along with a category-specific icon and color. It also includes an expand/collapse feature to show or hide the event's address.

---

## Detailed Breakdown

### Imports

```typescript
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
```
- **`lucide-react`**: Imports icons for displaying location (`MapPin`), time (`Clock`), and a link to an external map (`ExternalLink`).
- **`framer-motion`**: Used to animate the card's appearance and the expansion of the address section.
- **`useState`**: The React hook used to manage the `isExpanded` state for the address details.

### Props (`EventCardProps`)

```typescript
interface EventCardProps {
  title: string;
  time: string;
  description: string;
  address: string;
  category: 'work' | 'activity' | 'food' | 'transport';
  index: number;
}
```
- This interface defines the data the component needs to render.
- **`category`**: This is a simplified category prop. The parent component (`DayItinerary`) is responsible for translating the more detailed category from the AI into one of these four options.
- **`index`**: This is used to stagger the animation of cards appearing in a list, creating a pleasant cascade effect.

### Category Styling Objects

```typescript
const categoryColors = {
  work: 'from-blue-500 to-blue-600',
  // ...
};

const categoryIcons = {
  work: '💻',
  // ...
};
```
- **`categoryColors` and `categoryIcons`**: These are simple JavaScript objects that map the `category` prop to specific Tailwind CSS classes for background gradients and to specific emoji icons. This is a clean and efficient way to handle conditional styling and content, making the code much more readable than a seriesf of `if/else` or `switch` statements in the JSX.

### Component Logic and JSX Structure

```jsx
export function EventCard({ /* ...props... */ }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      // ... animation props ...
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${categoryColors[category]} ...`}>
          {categoryIcons[category]}
        </div>

        <div className="flex-1 min-w-0">
          {/* ... Title and Time ... */}
          <p className="text-slate-300 text-sm mb-2">{description}</p>

          <motion.div
            // ... expand/collapse animation ...
          >
            <div className="pt-2 border-t border-slate-600">
              {/* ... Address and External Link ... */}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
```
- **State**: `const [isExpanded, setIsExpanded] = useState(false);` initializes the state for the card's details view (it starts collapsed).
- **Main Container (`motion.div`)**:
    - **`onClick={() => setIsExpanded(!isExpanded)}`**: The entire card is clickable. Clicking it toggles the `isExpanded` state.
    - **`initial`, `animate`, `transition`**: These Framer Motion props make the card fade in and slide from the left, with a delay based on its `index` prop.
- **Icon `div`**:
    - `${categoryColors[category]}`: This dynamically inserts the correct Tailwind CSS gradient classes based on the `category` prop.
    - `{categoryIcons[category]}`: This renders the correct emoji icon for the category.
- **Details Section (`<div className="flex-1 min-w-0">`)**:
    - `min-w-0`: This is an important (and often overlooked) CSS fix that allows flex items to shrink correctly and prevents text from overflowing its container.
    - It displays the `title` and `time`.
- **Collapsible Address Section (`motion.div`)**:
    - This is the container for the address details.
    - **`animate={{ height: ..., opacity: ... }}`**: Just like in `DayItinerary`, this animates the height and opacity based on the `isExpanded` state to create a smooth expand/collapse effect.
    - **`initial={false}`**: Prevents the animation on the first render.
    - Inside, it displays the `MapPin` icon and the `address` string.
    - **External Link `button`**: The `ExternalLink` icon is a button that, when clicked, opens Google Maps in a new tab with a search for the event's address. `e.stopPropagation()` is used to prevent the card's own `onClick` from firing when the button